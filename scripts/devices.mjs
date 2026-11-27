// Cross-device check of the hero lanyard, atmosphere (warp, meteor bursts), pill nav, About, Projects,
// Experience (certificate lightbox), Contact
// and the Shock Motion fly-ins: WebKit (Safari) + Chromium, phones, tablets, desktop.
// Usage: node scripts/devices.mjs [baseUrl=http://localhost:3101] [outDir=./.devices]
// The contact form needs the mock database: `node scripts/mock-supabase.mjs`, and the site started
// with SUPABASE_URL=http://localhost:3199 SUPABASE_PUBLISHABLE_KEY=test-key.
// Env: ONLY=<name part>, DEVICE_TIMEOUT_MS (default 180000), FAIL_AT=throw|hang (cleanup self-test).
// Writes screenshots + results.json to outDir, prints one JSON line per device; exits 1 if any device failed.
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium, devices, webkit } from "playwright";
import sharp from "sharp";

const base = process.argv[2] ?? "http://localhost:3101";
// The contact form's database stand-in: start the site with SUPABASE_URL pointing here.
const MOCK_SUPABASE = process.env.MOCK_SUPABASE ?? "http://localhost:3199";
const out = process.argv[3] ?? ".devices";
mkdirSync(out, { recursive: true });

const touch = { hasTouch: true, isMobile: true };
const ONLY = process.env.ONLY;
const DEVICES = [
  // iPhone 13 with Safari's toolbars showing: 844 tall screen, 664 px visible.
  {
    name: "iphone-390x844",
    engine: webkit,
    ctx: {
      ...devices["iPhone 13"],
      viewport: { width: 390, height: 664 },
      screen: { width: 390, height: 844 },
    },
  },
  {
    name: "android-360x780",
    engine: chromium,
    ctx: {
      ...touch,
      viewport: { width: 360, height: 780 },
      deviceScaleFactor: 3,
      userAgent: devices["Pixel 7"].userAgent,
    },
  },
  {
    name: "tablet-768x1024-webkit",
    engine: webkit,
    ctx: {
      ...touch,
      viewport: { width: 768, height: 1024 },
      deviceScaleFactor: 2,
      userAgent: devices["iPad (gen 7)"].userAgent,
    },
  },
  {
    name: "tablet-768x1024-chromium",
    engine: chromium,
    ctx: {
      ...touch,
      viewport: { width: 768, height: 1024 },
      deviceScaleFactor: 2,
    },
  },
  {
    name: "tablet-1024x768-webkit",
    engine: webkit,
    ctx: {
      ...touch,
      viewport: { width: 1024, height: 768 },
      deviceScaleFactor: 2,
      userAgent: devices["iPad (gen 7) landscape"].userAgent,
    },
  },
  {
    name: "tablet-1024x768-chromium",
    engine: chromium,
    ctx: {
      ...touch,
      viewport: { width: 1024, height: 768 },
      deviceScaleFactor: 2,
    },
  },
  {
    name: "desktop-1280x800",
    engine: chromium,
    ctx: { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 },
  },
];

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Bounding box (CSS px, viewport coords) of the drawn card: rows where the violet border spans
 * at least half the expected card width, searched only within `area` (avoids the violet
 * Contact button and the strap).
 */
async function cardBox(png, dpr, area, minWidth) {
  const { data, info } = await sharp(png)
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width: W, height: H, channels: C } = info;
  const rows = [];
  const y0 = Math.max(0, Math.round(area.y * dpr)),
    y1 = Math.min(H, Math.round((area.y + area.h) * dpr));
  const x0 = Math.max(0, Math.round(area.x * dpr)),
    x1 = Math.min(W, Math.round((area.x + area.w) * dpr));
  for (let y = y0; y < y1; y++) {
    let min = -1,
      max = -1;
    for (let x = x0; x < x1; x++) {
      const i = (y * W + x) * C;
      const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
      if (b > 180 && r > 70 && r < 170 && g < 120) {
        if (min < 0) min = x;
        max = x;
      }
    }
    if (min >= 0 && max - min > minWidth * 0.5 * dpr)
      rows.push({ y, min, max });
  }
  if (!rows.length) return null;
  const top = rows[0].y,
    bottom = rows[rows.length - 1].y;
  const left = Math.min(...rows.map((r) => r.min)),
    right = Math.max(...rows.map((r) => r.max));
  return {
    x: left / dpr,
    y: top / dpr,
    w: (right - left + 1) / dpr,
    h: (bottom - top + 1) / dpr,
  };
}

/** Horizontal centre (CSS px) of the card's violet pixels within `area`; works while tilted. */
async function violetCentreX(png, dpr, area) {
  const { data, info } = await sharp(png)
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width: W, height: H, channels: C } = info;
  let sum = 0,
    n = 0;
  const y0 = Math.max(0, Math.round(area.y * dpr)),
    y1 = Math.min(H, Math.round((area.y + area.h) * dpr));
  for (let y = y0; y < y1; y++)
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * C;
      if (
        data[i + 2] > 180 &&
        data[i] > 70 &&
        data[i] < 170 &&
        data[i + 1] < 120
      ) {
        sum += x;
        n++;
      }
    }
  return n ? sum / n / dpr : null;
}

/** Is the back showing? The back has a large violet circle at ~30% of the card height. */
async function backShowing(page, rect, dpr) {
  await skyVisible(page, false);
  const png = await page.screenshot();
  await skyVisible(page, true);
  const { data, info } = await sharp(png)
    .extract({
      left: Math.round((rect.x + rect.w * 0.4) * dpr),
      top: Math.round((rect.y + rect.h * 0.24) * dpr),
      width: Math.max(1, Math.round(rect.w * 0.2 * dpr)),
      height: Math.max(1, Math.round(rect.h * 0.1 * dpr)),
    })
    .raw()
    .toBuffer({ resolveWithObject: true });
  let violet = 0;
  const n = info.width * info.height;
  for (let i = 0; i < n; i++) {
    const [r, g, b] = [
      data[i * info.channels],
      data[i * info.channels + 1],
      data[i * info.channels + 2],
    ];
    if (b > 200 && r > 80 && r < 160 && g < 110) violet++;
  }
  return { back: violet / n > 0.5, png };
}

// Meteor tails blended over navy can match the card's violet, so the sky is hidden (not
// stopped) for the screenshots that measure the card.
const skyVisible = (page, on) =>
  page.evaluate((on) => {
    const s = document.querySelector("[data-atmosphere]");
    if (s) s.style.visibility = on ? "" : "hidden";
  }, on);

const state = (page) =>
  page.evaluate(
    () => document.querySelector("[data-lanyard]")?.dataset.lanyard,
  );
const pressed = (page) =>
  page.evaluate(() =>
    document
      .querySelector("[aria-controls=hero-card-desc]")
      .getAttribute("aria-pressed"),
  );

// A device that throws or stalls must still close its browser, or the run never exits.
const PER_DEVICE_MS = Number(process.env.DEVICE_TIMEOUT_MS) || 180_000;

async function withTimeout(promise, ms, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`${label} timed out after ${Math.round(ms / 1000)}s`)),
      ms,
    );
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

/** Close the browser, but never wait more than 10 s for it (a stuck close can't hang the run). */
const closeQuietly = (browser) =>
  Promise.race([browser.close(), wait(10_000)]).catch(() => {});

/** Runs one device; `r` collects results as they are measured, so a failure keeps what was seen. */
async function run(d, r) {
  // Playwright's own launch timeout: on failure there is no orphaned browser left to close.
  const browser = await d.engine.launch({ timeout: 60_000 });
  try {
    await withTimeout(body(browser, d, r), PER_DEVICE_MS, d.name);
  } finally {
    await closeQuietly(browser);
  }
}

/**
 * Scrolls so the [data-exit] block `sel` is a fraction q through its exit (0 = about to leave,
 * 1 = fully above the screen; negative = still fully in place), waits for the scroll-driven
 * (or fallback) update, and reads its transform scale and opacity. Uses layout positions
 * (offsetTop), which the exit's own transform doesn't change.
 */
async function exitAt(page, sel, q) {
  await page.evaluate(
    ([sel, q]) => {
      const el = document.querySelector(sel);
      let y = 0;
      for (let n = el; n; n = n.offsetParent) y += n.offsetTop;
      const h = el.offsetHeight;
      window.scrollTo({ top: Math.max(0, y + h - (1 - q) * Math.min(h, innerHeight)), behavior: "instant" });
    },
    [sel, q],
  );
  const read = () =>
    page.evaluate((sel) => {
      const s = getComputedStyle(document.querySelector(sel));
      const m = s.transform;
      const mx = m === "none" ? null : new DOMMatrixReadOnly(m);
      return {
        // An identity matrix (a scroll-driven animation before its range) counts as "none".
        t: !mx || mx.isIdentity ? "none" : +mx.a.toFixed(3), // horizontal scale
        o: +(+s.opacity).toFixed(2),
      };
    }, sel);
  // Settled: the same reading twice, 150 ms apart (the fallback smooths over 0.15 s, and a
  // software renderer under load can take a while to deliver the next frame). At most ~3 s.
  await wait(300);
  let prev = null;
  for (let i = 0; i < 20; i++) {
    await wait(150);
    const cur = await read();
    if (prev && JSON.stringify(prev) === JSON.stringify(cur)) return cur;
    prev = cur;
  }
  return prev;
}

/** The deep-space exit's behaviour on one page; failures go to r.problems. */
async function deepExitChecks(page, d, r, path) {
  const phone = d.ctx.viewport.width < 768;
  const res = { path };
  res.mode = await page.evaluate(() =>
    "exitFallback" in document.documentElement.dataset ? "fallback" : "native",
  );
  const about = "#about [data-exit]";
  res.rest = await exitAt(page, about, -0.3);
  res.early = await exitAt(page, about, 0.3);
  res.late = await exitAt(page, about, 0.85);
  // Fully above the screen, then back: the block keeps its fly-in state (no replay when scrolled
  // back into from the top: the exit reversing is what brings it forward).
  await exitAt(page, about, 1.2);
  res.keptInview = await page.evaluate(() =>
    document.querySelector("#about [data-fly]").hasAttribute("data-inview"),
  );
  res.back = await exitAt(page, about, -0.3);

  // Jumped past: About (on screen) leaves through the top, the page jumps back to the top (About
  // never crosses the screen), then About is scrolled into from below: its fly-in plays again.
  await exitAt(page, about, 1.2);
  await page.evaluate(() => {
    window.__flyLog = [];
    new MutationObserver((ms) => {
      // Records arrive after the change, so the current state can't tell: log whether the
      // attribute existed before each change. A replay is a removal followed by an add ("add"
      // after a prior record); re-setting a present attribute logs only "had".
      for (const m of ms) window.__flyLog.push(m.oldValue === null ? "add" : "had");
    }).observe(document.querySelector("#about [data-fly]"), {
      attributes: true,
      attributeOldValue: true,
      attributeFilter: ["data-inview"],
    });
    window.scrollTo({ top: 0, behavior: "instant" });
  });
  await wait(400);
  // About's top comes up to 60% down the screen: arriving from below.
  await page.evaluate(() => {
    let y = 0;
    for (let n = document.querySelector("#about [data-exit]"); n; n = n.offsetParent) y += n.offsetTop;
    window.scrollTo({ top: y - innerHeight * 0.6, behavior: "instant" });
  });
  await wait(800);
  res.replayAfterJump = await page.evaluate(
    () =>
      window.__flyLog.join(",").includes("had,add") &&
      document.querySelector("#about [data-fly]").hasAttribute("data-inview"),
  );

  // Never seen, scrolled into from the top: About is reset (scrolled below the screen), the page
  // jumps so it is far above, then scrolls up into it: it appears in place, without a fly-in.
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await wait(400);
  await exitAt(page, about, 1.6);
  await page.evaluate(() => {
    let y = 0;
    for (let n = document.querySelector("#about [data-exit]"); n; n = n.offsetParent) y += n.offsetTop;
    const el = document.querySelector("#about [data-exit]");
    window.scrollTo({ top: y + el.offsetHeight - innerHeight * 0.5, behavior: "instant" });
  });
  await wait(250); // well under the fly-in's 0.7 s
  res.fromTopInstant = await page.evaluate(() => {
    const el = document.querySelector("#about [data-fly]");
    return el.hasAttribute("data-inview") && +getComputedStyle(el).opacity === 1;
  });

  // Hero: the text recedes; the lanyard stage only fades, and nothing around the canvas turns.
  res.hero = await exitAt(page, "#home [data-exit]:not([data-exit=fade])", 0.85);
  // The stage itself and everything from it down to the canvas (or, if the 3D hasn't loaded,
  // to the stage's [data-lanyard] box). canvas: whether the 3D was there to check.
  res.stage = await page.evaluate(() => {
    const stage = document.querySelector("[data-exit=fade]");
    const canvas = stage.querySelector("canvas");
    const chain = [stage];
    for (let n = canvas ?? stage.querySelector("[data-lanyard]"); n && n !== stage; n = n.parentElement)
      chain.push(n);
    return {
      canvas: !!canvas,
      checked: chain.length,
      untransformed: chain.every((n) => getComputedStyle(n).transform === "none"),
    };
  });
  res.overflowX = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );

  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));

  const tag = `deep exit (${path})`;
  for (const [ok, msg] of [
    [res.mode === path, `${tag}: ran the ${res.mode} path`],
    [res.rest.t === "none" && res.rest.o === 1, `${tag}: moved while in place ${JSON.stringify(res.rest)}`],
    [res.early.o === 1, `${tag}: faded too early (30% out) ${JSON.stringify(res.early)}`],
    [res.late.t !== "none" && res.late.t < 1 && res.late.o < 1, `${tag}: no recede at 85% ${JSON.stringify(res.late)}`],
    // Lighter on phones: shrinks to 0.95 at most (desktop/tablet 0.88).
    [phone ? res.late.t > 0.94 : res.late.t < 0.93, `${tag}: strength ${res.late.t} on ${phone ? "a phone" : "a large screen"}`],
    [res.keptInview, `${tag}: fly-in reset when leaving through the top`],
    [res.back.t === "none" && res.back.o === 1, `${tag}: not restored ${JSON.stringify(res.back)}`],
    [res.hero.o < 1, `${tag}: hero text did not fade ${JSON.stringify(res.hero)}`],
    [res.stage.untransformed, `${tag}: lanyard stage, canvas or its wrappers transformed`],
    [res.replayAfterJump, `${tag}: no fly-in after jumping past About and coming back from below`],
    [res.fromTopInstant, `${tag}: an unseen section scrolled into from the top flew in`],
    [res.overflowX === 0, `${tag}: overflowX ${res.overflowX}`],
  ])
    if (!ok) r.problems.push(msg);
  return res;
}

async function body(browser, d, r) {
  const ctx = await browser.newContext(d.ctx);
  const page = await ctx.newPage();
  const errors = [];
  r.errors = errors;
  r.problems = []; // failed checks (beyond page errors) that fail the run
  page.on("pageerror", (e) => errors.push(e.message));
  if (process.env.DEBUG)
    page.on(
      "console",
      (msg) =>
        msg.text().includes("DEBUG") &&
        console.error(d.name, Math.round(performance.now()), msg.text()),
    );
  const dpr = d.ctx.deviceScaleFactor ?? 1;

  await page.goto(base, { waitUntil: "load" });
  // Self-test of the cleanup: FAIL_AT=throw fails the device, FAIL_AT=hang stalls it until the
  // timeout (use with DEVICE_TIMEOUT_MS). Either way its browser must close and the run go on.
  if (process.env.FAIL_AT === "throw") throw new Error("forced failure (FAIL_AT=throw)");
  if (process.env.FAIL_AT === "hang") await new Promise(() => {});
  await page.screenshot({ path: `${out}/${d.name}-1-hero.png` });

  // Scroll the stage up under the header (phones/tablets; on desktop it already is).
  await page.evaluate(() => {
    const st = document.querySelector("[data-lanyard]");
    if (st.getBoundingClientRect().top > 70)
      window.scrollTo(0, st.getBoundingClientRect().top + window.scrollY - 64);
  });
  for (let i = 0; i < 40 && (await state(page)) !== "running"; i++)
    await wait(500);
  r.state = await state(page);
  await wait(2500); // let the load-in swing settle

  const m = await page.evaluate(() => {
    const rect = (el) => {
      const b = el.getBoundingClientRect();
      return { x: b.x, y: b.y, w: b.width, h: b.height };
    };
    const st = document.querySelector("[data-lanyard]");
    const card = document.querySelector("[data-static-card]");
    const btn = document.querySelector("[aria-controls=hero-card-desc]");
    const small = [...document.querySelectorAll("a, button")]
      .filter(
        (e) => e.offsetParent && getComputedStyle(e).visibility !== "hidden",
      )
      // Layout size (offset*), not the box on screen: sections waiting to fly in are scaled down.
      .map((e) => [
        e.textContent.trim() || e.getAttribute("aria-label"),
        e.offsetHeight,
        e.offsetWidth,
      ])
      .filter(([, h, w]) => h > 0 && (h < 44 || w < 44));
    return {
      vw: innerWidth,
      vh: innerHeight,
      stage: rect(st),
      still: rect(card),
      button: rect(btn),
      overflowX:
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
      touchAction: getComputedStyle(st).touchAction,
      small,
    };
  });
  Object.assign(r, {
    cardWidthPct: +((m.still.w / m.vw) * 100).toFixed(1),
    cardPx: `${Math.round(m.still.w)}x${Math.round(m.still.h)}`,
    overflowX: m.overflowX,
    touchAction: m.touchAction,
    smallTapTargets: m.small,
    buttonVisible: m.button.y + m.button.h <= m.vh,
    strapFromHeader: Math.round(m.stage.y),
  });
  await skyVisible(page, false);
  const shot = await page.screenshot({ path: `${out}/${d.name}-2-card.png` });
  await skyVisible(page, true);
  // Search the stage's full width (the canvas can extend past it) and a band around the card.
  const area = {
    x: Math.max(0, m.still.x - m.still.w * 0.5),
    y: m.still.y - 60,
    w: m.still.w * 2,
    h: m.still.h + 120,
  };
  const drawn = await cardBox(shot, dpr, area, m.still.w);
  r.alignPx = drawn
    ? Math.round(
        Math.max(
          Math.abs(drawn.x - m.still.x),
          Math.abs(drawn.y - m.still.y),
          Math.abs(drawn.w - m.still.w),
          Math.abs(drawn.h - m.still.h),
        ),
      )
    : "card not found";

  const cx = m.still.x + m.still.w / 2,
    cy = m.still.y + m.still.h * 0.6;
  await page.evaluate(() => {
    window.__downs = [];
    // Touches on the card only (the control swipe beside it doesn't reset the idle timer).
    const c = document
      .querySelector("[data-static-card]")
      .getBoundingClientRect();
    window.addEventListener(
      "pointerdown",
      (e) => {
        if (e.clientX >= c.left && e.clientX <= c.right)
          window.__downs.push([performance.now()]);
      },
      true,
    );
  });
  const isTouch = !!d.ctx.hasTouch;
  // Chromium: raw touch input through CDP, with human timing (taps ~150 ms apart).
  const cdp =
    isTouch && d.engine === chromium ? await ctx.newCDPSession(page) : null;
  // `timestamp` (s since epoch) sets the events' timeStamp, so slow software rendering in
  // headless Chromium can't stretch a quick double-tap.
  const touchAt = (type, x, y, timestamp) =>
    cdp.send("Input.dispatchTouchEvent", {
      type,
      touchPoints: type === "touchEnd" ? [] : [{ x, y, id: 1 }],
      ...(timestamp ? { timestamp } : {}),
    });
  const doubleTap = async () => {
    if (cdp) {
      const t = Date.now() / 1000; // tap 60 ms, gap 90 ms, tap 60 ms
      await touchAt("touchStart", cx, cy, t);
      await touchAt("touchEnd", 0, 0, t + 0.06);
      await touchAt("touchStart", cx, cy, t + 0.15);
      await touchAt("touchEnd", 0, 0, t + 0.21);
    } else if (isTouch) {
      await page.touchscreen.tap(cx, cy);
      await page.touchscreen.tap(cx, cy);
    } else await page.mouse.dblclick(cx, cy);
  };

  // Frame rate of this (headless, software-rendered) browser: low values explain late peeks.
  r.fps = await page.evaluate(
    () =>
      new Promise((res) => {
        let n = 0;
        const t0 = performance.now();
        const f = () =>
          performance.now() - t0 < 2000
            ? (n++, requestAnimationFrame(f))
            : res(+(n / ((performance.now() - t0) / 1000)).toFixed(1));
        requestAnimationFrame(f);
      }),
  );

  // Double-tap (touch) / double-click (mouse) flips.
  await doubleTap();
  await wait(1500);
  r.doubleTapFlips = (await pressed(page)) === "true";
  await page.screenshot({ path: `${out}/${d.name}-3-back.png` });
  await doubleTap();
  await wait(1500);
  r.doubleTapBack = (await pressed(page)) === "false";

  // Chromium touch: a horizontal drag swings the card; a vertical swipe scrolls the page.
  if (cdp) {
    await touchAt("touchStart", cx, cy);
    for (let i = 1; i <= 12; i++) {
      await touchAt("touchMove", cx - i * 10, cy);
      await wait(16);
    }
    const before = await violetCentreX(shot, dpr, area);
    await skyVisible(page, false);
    const mid = await violetCentreX(await page.screenshot(), dpr, area);
    await skyVisible(page, true);
    await touchAt("touchEnd");
    r.dragMovedPx = before && mid ? Math.round(before - mid) : null;
    r.dragMovesCard = r.dragMovedPx > 40;
    await wait(2500);
    const y0 = await page.evaluate(() => scrollY);
    const swipe = async (x, y) => {
      await page.evaluate((y) => window.scrollTo(0, y), y0);
      await wait(300);
      // A finger moving up 250 px over ~0.3 s.
      await touchAt("touchStart", x, y);
      for (let i = 1; i <= 20; i++) {
        await touchAt("touchMove", x, y - i * 12.5);
        await wait(16);
      }
      await touchAt("touchEnd");
      await wait(800);
      return Math.round((await page.evaluate(() => scrollY)) - y0);
    };
    // Control first (the same swipe over the background beside the card), then over the
    // card, which is also the last touch before the idle-peek wait.
    const control = await swipe(
      Math.min(m.vw - 8, m.still.x + m.still.w + 20),
      cy,
    );
    r.swipeScrollPx = { overCard: await swipe(cx, cy), control };
    r.swipeScrollsPage = r.swipeScrollPx.overCard > 100;
    r.flippedAfterTouchTests = (await pressed(page)) === "true";
    await page.evaluate((y) => window.scrollTo(0, y), y0); // back to the card
  }

  if (process.env.DEBUG)
    console.error("peek wait starts", Math.round(performance.now()));
  // Idle peek: no input for a while, then the back should show briefly.
  // Stay hands-off until 8.5 s after the last touch: screenshots stall slow software
  // renderers (WebKit here runs at ~5 fps), which would eat into the idle timer.
  const sinceTouch = await page.evaluate(() => {
    const last = window.__downs.at(-1);
    return last ? performance.now() - last[0] : 0;
  });
  await wait(Math.max(0, 8500 - sinceTouch));
  const t0 = Date.now();
  r.idlePeekAt = null;
  while (Date.now() - t0 < 12000) {
    const { back, png } = await backShowing(page, m.still, dpr);
    if (back) {
      r.idlePeekAt = +((Date.now() - t0) / 1000).toFixed(1);
      r.flippedAtPeek = (await pressed(page)) === "true";
      r.peekSecsAfterLastTouch = await page.evaluate(() => {
        const last = window.__downs.at(-1);
        return last ? +((performance.now() - last[0]) / 1000).toFixed(1) : null;
      });
      writeFileSync(`${out}/${d.name}-4-peek.png`, png);
      break;
    }
    await wait(250);
  }
  // Atmosphere (star canvas): running, and paused while the tab is hidden.
  const sky = () =>
    page.evaluate(
      () => document.querySelector("[data-atmosphere]")?.dataset.atmosphere,
    );
  const setHidden = (hidden) =>
    page.evaluate((hidden) => {
      if (hidden)
        Object.defineProperty(document, "visibilityState", {
          configurable: true,
          get: () => "hidden",
        });
      else delete document.visibilityState;
      document.dispatchEvent(new Event("visibilitychange"));
    }, hidden);
  r.atmosphere = await sky();
  // Sky renderer stats (data-sky = "frames,launched,peak", updated once a second by the
  // worker): it is drawing, and launching meteors with several in flight at once.
  const skyStats = () =>
    page.evaluate(() =>
      (document.querySelector("[data-atmosphere]")?.dataset.sky ?? "0,0,0")
        .split(",")
        .map(Number),
    );
  r.skyMode = await page.evaluate(
    () => document.querySelector("[data-atmosphere]")?.dataset.skyMode,
  );
  const s0 = await skyStats();
  let peak = 0;
  for (let i = 0; i < 6; i++) {
    await wait(1000);
    peak = Math.max(peak, (await skyStats())[2]);
  }
  const s1 = await skyStats();
  r.skyFramesPerSec = +((s1[0] - s0[0]) / 6).toFixed(1);
  r.meteorsLaunched6s = s1[1] - s0[1];
  r.meteorsPeak = peak;
  await setHidden(true);
  await wait(300);
  r.atmospherePausedWhenHidden = (await sky()) === "paused";
  await setHidden(false);
  await wait(300);
  r.atmosphereResumes = (await sky()) === "running";

  // Warp: a fast scroll (~3600 px/s, down three screens and back) stretches the stars; they
  // snap back to dots once scrolling stops. data-sky[3] = peak warp (0–100) over the last second.
  // Scrolls at a real-time speed (3600 px/s), however slowly this headless page renders.
  // Three screens, not one: the headless main thread can run at ~7 fps, and the page's scroll
  // speed needs at least two scroll events (the first only sets the starting point); one
  // screen took ~0.2 s, sometimes a single event, so no speed at all.
  // Returns [speed actually achieved (px/s), scroll events seen].
  const fastScroll = (dy) =>
    page.evaluate(async (dy) => {
      const speed = 3600;
      let events = 0;
      const count = () => events++;
      addEventListener("scroll", count, { passive: true });
      const y0 = scrollY;
      const t0 = performance.now();
      const dur = (Math.abs(dy) / speed) * 1000;
      let t = t0;
      while (t - t0 < dur) {
        await new Promise((r) => setTimeout(r, 16));
        t = performance.now();
        const p = Math.min(1, (t - t0) / dur);
        window.scrollTo({ top: y0 + dy * p, behavior: "instant" });
      }
      const pxPerSec = Math.round(Math.abs(scrollY - y0) / ((performance.now() - t0) / 1000));
      await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0))); // last event
      removeEventListener("scroll", count);
      return [pxPerSec, events];
    }, dy);
  const yBefore = await page.evaluate(() => scrollY);
  let warpPeak = 0;
  let scrollDoneAt = Infinity;
  // Sample until 1.5 s after scrolling stops (the stats arrive once a second), at most 40
  // times: if scrolling throws, the finally below still ends the loop, and the .catch keeps a
  // closed page from becoming an unhandled rejection that would end the whole run.
  const warpWatch = (async () => {
    for (let i = 0; i < 40 && Date.now() < scrollDoneAt + 1500; i++) {
      await wait(250);
      warpPeak = Math.max(warpPeak, (await skyStats())[3] ?? 0);
    }
  })().catch(() => {});
  let down, up;
  try {
    down = await fastScroll(3 * m.vh);
    up = await fastScroll(-3 * m.vh);
  } finally {
    scrollDoneAt = Date.now();
  }
  r.fastScrollPxPerSec = [down[0], up[0]];
  r.fastScrollEvents = [down[1], up[1]];
  await warpWatch;
  await page.evaluate((y) => window.scrollTo({ top: y, behavior: "instant" }), yBefore);
  r.warpPeak = warpPeak;
  await wait(2200); // two stats updates after scrolling stopped
  r.warpAfterStop = (await skyStats())[3] ?? null;
  if (r.skyMode === "worker") {
    if (!(r.warpPeak > 10)) r.problems.push(`warpPeak ${r.warpPeak} (want > 10)`);
    if (r.warpAfterStop !== 0) r.problems.push(`warpAfterStop ${r.warpAfterStop} (want 0)`);
  }
  const launchedBeforeAbout = (await skyStats())[1];

  // Scroll to About: the nav highlights it and the stat cards count up.
  await page.evaluate(() =>
    document.getElementById("about").scrollIntoView({ block: "start" }),
  );
  await wait(2000);
  // Meteor burst for the newly active section (5–8, phones 3–4), on top of the usual shower.
  r.meteorsOnSectionChange = (await skyStats())[1] - launchedBeforeAbout;
  const wantBurst = d.ctx.viewport.width >= 768 ? 5 : 3;
  if (r.skyMode === "worker" && r.meteorsOnSectionChange < wantBurst)
    r.problems.push(`meteorsOnSectionChange ${r.meteorsOnSectionChange} (want >= ${wantBurst})`);
  r.navActive = await page.evaluate(
    () => document.querySelector("[aria-current=location]")?.textContent,
  );
  // The stats sit below the photo and bio on phones: bring them on screen, let them count.
  await page.evaluate(() =>
    document.querySelector("[data-stats]").scrollIntoView({ block: "center" }),
  );
  await wait(1800);
  r.statsShown = await page.evaluate(() =>
    [...document.querySelectorAll("[data-stats] [aria-hidden=true]")]
      .map((e) => e.textContent)
      .join(","),
  );
  r.overflowXAbout = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  await page.locator("#about").screenshot({ path: `${out}/${d.name}-5-about.png` });

  // About photo: cutout loaded with alt text; the reveal circle follows the mouse (desktop) or
  // a finger dragged sideways (touch), and a vertical swipe over the photo still scrolls.
  r.aboutPhoto = await page.evaluate(() => {
    const img = document.querySelector("[data-profile-reveal] img[alt]:not([alt=''])");
    return img ? { alt: img.alt, loaded: img.naturalWidth > 0 } : null;
  });
  await page.evaluate(() => {
    document.querySelector("[data-profile-reveal]").scrollIntoView({ block: "center" });
    window.__revealSeen = false;
    const el = document.querySelector("[data-profile-reveal]");
    new MutationObserver(() => {
      if (el.dataset.reveal === "on") window.__revealSeen = true;
    }).observe(el, { attributes: true, attributeFilter: ["data-reveal"] });
  });
  // The one-time automatic sweep across the face runs (and ends) on its own.
  // (It may already have run while earlier steps scrolled past About: data-swept records that.)
  await page
    .waitForFunction(() => document.querySelector("[data-profile-reveal]").hasAttribute("data-swept"), null, {
      timeout: 5000,
    })
    .catch(() => {});
  r.revealSwept = await page.evaluate(
    () => document.querySelector("[data-profile-reveal]").dataset.swept ?? null,
  );
  await wait(600); // the circle shrinks away after the sweep
  r.aboutPhotoFrame = await page.evaluate(() => {
    // Layout size (offsetWidth/Height), not the on-screen box: a fly-in still running under load
    // tilts the section back in 3D, which would squash the measured box.
    const el = document.querySelector("[data-profile-reveal]");
    return {
      w: el.offsetWidth,
      h: el.offsetHeight,
      aspect: +(el.offsetWidth / el.offsetHeight).toFixed(3),
      ring: !!document.querySelector("[data-reveal-ring]"),
      labelOpacity: getComputedStyle(document.querySelector("[data-reveal-label]")).opacity,
    };
  });
  const ph = await page.evaluate(() => {
    const b = document.querySelector("[data-profile-reveal]").getBoundingClientRect();
    return { x: b.x, y: b.y, w: b.width, h: b.height };
  });
  const px = ph.x + ph.w / 2,
    py = ph.y + ph.h * 0.42; // over the face
  const revealState = () =>
    page.evaluate(() => {
      const el = document.querySelector("[data-profile-reveal]");
      return { on: el.dataset.reveal, r: el.style.getPropertyValue("--r") };
    });
  if (!isTouch) {
    await page.mouse.move(px - 80, py);
    await page.mouse.move(px, py, { steps: 8 });
    await wait(600);
    r.revealHover = await revealState();
    await page.screenshot({ path: `${out}/${d.name}-7-about-reveal.png` });
    await page.mouse.move(5, 5);
    await wait(600);
    r.revealHoverOff = await revealState();
  } else if (cdp) {
    await touchAt("touchStart", px - 70, py);
    for (let i = 1; i <= 10; i++) {
      await touchAt("touchMove", px - 70 + i * 7, py);
      await wait(16);
    }
    await wait(400);
    r.revealDrag = await revealState();
    await page.screenshot({ path: `${out}/${d.name}-7-about-reveal.png` });
    await touchAt("touchEnd");
    await wait(600);
    r.revealDragOff = await revealState();
    const y0 = await page.evaluate(() => scrollY);
    await touchAt("touchStart", px, py);
    for (let i = 1; i <= 20; i++) {
      await touchAt("touchMove", px, py - i * 12.5);
      await wait(16);
    }
    await touchAt("touchEnd");
    await wait(800);
    r.photoSwipeScrollPx = Math.round((await page.evaluate(() => scrollY)) - y0);
  } else {
    // WebKit touch: Playwright has no touch drag here, so replay the pointer events a finger
    // dragging sideways produces. A plain tap must NOT show the circle (it waits for a drag).
    await page.touchscreen.tap(px, py);
    await wait(400);
    r.revealOnTap = await page.evaluate(() => window.__revealSeen);
    r.revealDrag = await page.evaluate(
      async ({ x, y }) => {
        const el = document.querySelector("[data-profile-reveal]");
        const ev = (type, dx, buttons) =>
          el.dispatchEvent(
            new PointerEvent(type, {
              bubbles: true,
              pointerType: "touch",
              pointerId: 7,
              isPrimary: true,
              buttons,
              clientX: x + dx,
              clientY: y,
            }),
          );
        ev("pointerdown", -70, 1);
        for (let i = 1; i <= 10; i++) {
          ev("pointermove", -70 + i * 7, 1);
          await new Promise((r) => setTimeout(r, 16));
        }
        await new Promise((r) => setTimeout(r, 400));
        const s = { on: el.dataset.reveal, r: el.style.getPropertyValue("--r") };
        ev("pointerup", 0, 0);
        return s;
      },
      { x: px, y: py },
    );
  }
  r.revealSeen = await page.evaluate(() => window.__revealSeen);
  await wait(600); // label fade
  r.revealLabelOpacityAfter = await page.evaluate(
    () => getComputedStyle(document.querySelector("[data-reveal-label]")).opacity,
  );
  {
    const wantR = d.ctx.viewport.width < 640 ? 80 : 110;
    const active = isTouch ? r.revealDrag : r.revealHover;
    const rPx = active ? parseFloat(active.r) : NaN;
    for (const [ok, msg] of [
      [r.revealSwept === "auto", `auto sweep ended as ${r.revealSwept} (want "auto")`],
      [Math.abs(r.aboutPhotoFrame.aspect - 853 / 1280) < 0.01, `photo aspect ${r.aboutPhotoFrame.aspect}`],
      [r.aboutPhotoFrame.ring, "reveal ring missing"],
      [r.aboutPhotoFrame.labelOpacity === "1", `label before use ${r.aboutPhotoFrame.labelOpacity}`],
      [!active || (active.on === "on" && Math.abs(rPx - wantR) < 8), `reveal ${JSON.stringify(active)} (want r≈${wantR})`],
      [r.revealOnTap !== true, "a plain tap showed the reveal"],
      [r.revealLabelOpacityAfter === "0", `label after use ${r.revealLabelOpacityAfter}`],
    ])
      if (!ok) r.problems.push(msg);
  }

  // Reduced motion: only the still cutout (no reveal layer, no hint).
  if (!isTouch) {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await wait(300);
    r.reducedMotionPhotoImgs = await page.evaluate(
      () => document.querySelectorAll("[data-profile-reveal] img").length,
    );
    await page.emulateMedia({ reducedMotion: "no-preference" });
  }

  // Projects: two cards, stacked on phones, side by side from 768px, screenshots loaded.
  await page.evaluate(() =>
    document.getElementById("projects").scrollIntoView({ block: "start" }),
  );
  await wait(1500);
  // Lazy images load as they near the screen: wait for both (up to 8 s).
  await page
    .waitForFunction(
      () =>
        [...document.querySelectorAll("[data-project] img")].every(
          (i) => i.complete && i.naturalWidth > 0,
        ),
      null,
      { timeout: 8000 },
    )
    .catch(() => {});
  // Let the dealt cards land first (slow renderers): their x positions include the spin.
  await page
    .waitForFunction(
      () =>
        [...document.querySelectorAll("#projects [data-deal]")].every(
          (el) => getComputedStyle(el).transform === "none" && +getComputedStyle(el).opacity === 1,
        ),
      null,
      { timeout: 6000 },
    )
    .catch(() => {});
  Object.assign(
    r,
    await page.evaluate(() => {
      const cards = [...document.querySelectorAll("[data-project]")];
      return {
        projectCards: cards.length,
        projectCols: new Set(cards.map((c) => Math.round(c.getBoundingClientRect().x))).size,
        projectImgsLoaded: cards.every((c) => c.querySelector("img")?.naturalWidth > 0),
        projectImgsWhole: cards.every((c) => {
          const i = c.querySelector("img");
          return i && getComputedStyle(i).objectFit === "contain" && getComputedStyle(i).transform === "none";
        }),
        overflowXProjects:
          document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    }),
  );
  const wantCols = d.ctx.viewport.width >= 768 ? 2 : 1;
  for (const [ok, msg] of [
    [r.projectCards === 2, `projectCards ${r.projectCards} (want 2)`],
    [r.projectCols === wantCols, `projectCols ${r.projectCols} (want ${wantCols})`],
    [r.projectImgsLoaded, "project screenshots not loaded"],
    [r.projectImgsWhole, "project screenshots cropped (want object-fit contain, no zoom)"],
    [r.overflowXProjects === 0, `overflowXProjects ${r.overflowXProjects}`],
  ])
    if (!ok) r.problems.push(msg);
  await page.locator("#projects").screenshot({ path: `${out}/${d.name}-8-projects.png` });
  if (!isTouch) {
    // Hover lifts the card (translate) and adds the glow (box-shadow).
    const card = page.locator("[data-project]").first();
    const look = () =>
      card.evaluate((el) => {
        const s = getComputedStyle(el);
        return { translate: s.translate, shadow: s.boxShadow };
      });
    const before = await look();
    const b = await card.boundingBox();
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
    await wait(600);
    const after = await look();
    r.projectHoverLifts = after.translate !== before.translate;
    r.projectHoverGlows = after.shadow !== before.shadow;
    if (!r.projectHoverLifts || !r.projectHoverGlows) r.problems.push("project hover lift/glow missing");
    await page.locator("#projects").screenshot({ path: `${out}/${d.name}-9-project-hover.png` });
    await page.mouse.move(5, 5);
  }
  // Shock Motion: Projects flew in (opacity 1, no transform), cards dealt, heading swept; the
  // fly-in replays after the section leaves the screen; background words are faint.
  const flyState = (sel) =>
    page.evaluate((sel) => {
      const el = document.querySelector(sel);
      const s = getComputedStyle(el);
      return { inview: el.hasAttribute("data-inview"), opacity: +s.opacity, transform: s.transform };
    }, sel);
  const landed = (f) => f.inview && f.opacity === 1 && f.transform === "none";
  r.shockOn = await page.evaluate(() => document.documentElement.hasAttribute("data-shock"));
  // Self-contained: the element screenshots and hover above can scroll the page.
  await page.evaluate(() =>
    document.getElementById("projects").scrollIntoView({ block: "start", behavior: "instant" }),
  );
  await page
    .waitForFunction(
      () => {
        const ok = (el) =>
          getComputedStyle(el).transform === "none" && +getComputedStyle(el).opacity === 1;
        return (
          ok(document.querySelector("#projects [data-fly]")) &&
          [...document.querySelectorAll("#projects [data-deal]")].every(ok)
        );
      },
      null,
      { timeout: 5000 },
    )
    .catch(() => {});
  r.projectsFly = await flyState("#projects [data-fly]");
  r.projectsDealt = await page.evaluate(() =>
    [...document.querySelectorAll("#projects [data-deal]")].every((el) => {
      const s = getComputedStyle(el);
      return +s.opacity === 1 && s.transform === "none";
    }),
  );
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await wait(400);
  r.flyResetWhenAway = !(await flyState("#projects [data-fly]")).inview;
  await page.evaluate(() =>
    document.getElementById("projects").scrollIntoView({ block: "start", behavior: "instant" }),
  );
  // Poll: slow software renderers (a few fps) report the intersection a frame or two late.
  let replay = await flyState("#projects [data-fly]");
  for (let i = 0; i < 40 && !replay.inview; i++) {
    await wait(25);
    replay = await flyState("#projects [data-fly]");
  }
  r.flyReplays = replay.inview && replay.opacity < 1; // mid-animation again
  await wait(1500);
  r.projectsFlyAgain = landed(await flyState("#projects [data-fly]"));
  r.bgWords = await page.evaluate(() =>
    [...document.querySelectorAll(".bg-word")].map((w) => ({
      text: w.textContent,
      opacity: +getComputedStyle(w).opacity,
      hidden: w.closest("[aria-hidden=true]") !== null,
    })),
  );
  r.overflowXShock = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  for (const [ok, msg] of [
    [r.shockOn, "html[data-shock] not set"],
    [landed(r.projectsFly), `projects fly-in not landed ${JSON.stringify(r.projectsFly)}`],
    [r.projectsDealt, "project cards not dealt"],
    [r.flyResetWhenAway, "fly-in not reset after leaving the screen"],
    [r.flyReplays, `fly-in did not replay ${JSON.stringify(replay)}`],
    [r.projectsFlyAgain, "fly-in replay did not land"],
    [r.bgWords.length === 4, `bgWords ${r.bgWords.length} (want 4)`],
    [r.bgWords.every((w) => w.opacity <= 0.08 && w.hidden), "bg words too strong or not aria-hidden"],
    [r.overflowXShock === 0, `overflowXShock ${r.overflowXShock}`],
  ])
    if (!ok) r.problems.push(msg);

  // Experience: education card, three roles in order, certificate column (right from 1024px),
  // all cards dealt in; then the certificate lightbox opens and closes three ways.
  await page.evaluate(() =>
    document.getElementById("experience").scrollIntoView({ block: "start", behavior: "instant" }),
  );
  await page
    .waitForFunction(
      () =>
        [...document.querySelectorAll("#experience [data-deal]")].every(
          (el) => getComputedStyle(el).transform === "none" && +getComputedStyle(el).opacity === 1,
        ) &&
        [...document.querySelectorAll("[data-certificate] img")].every(
          (i) => i.complete && i.naturalWidth > 0,
        ),
      null,
      { timeout: 8000 },
    )
    .catch(() => {});
  Object.assign(
    r,
    await page.evaluate(() => {
      const deal = [...document.querySelectorAll("#experience [data-deal]")];
      const cert = document.querySelector("[data-certificate]");
      const role = document.querySelector("[data-role]");
      return {
        expEducation: document.querySelectorAll("[data-education]").length,
        expRoles: [...document.querySelectorAll("[data-role] p:first-child")].map((p) =>
          p.textContent.trim(),
        ),
        expDealt:
          deal.length === 5 &&
          deal.every((el) => {
            const s = getComputedStyle(el);
            return +s.opacity === 1 && s.transform === "none";
          }),
        expCertBesideTimeline:
          cert.getBoundingClientRect().left > role.getBoundingClientRect().right,
        expCertImgLoaded: cert.querySelector("img")?.naturalWidth > 0,
        jeanRoseRole: document.querySelector("[data-project=jean-rose] p")?.textContent.trim(),
        overflowXExperience:
          document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    }),
  );
  const wantRoles = ["Lead Full Stack Developer", "Project Leader", "Team Lead & Documentation Lead"];
  for (const [ok, msg] of [
    [r.expEducation === 1, `expEducation ${r.expEducation} (want 1)`],
    [JSON.stringify(r.expRoles) === JSON.stringify(wantRoles), `expRoles ${JSON.stringify(r.expRoles)}`],
    [r.expDealt, "experience cards not dealt"],
    [
      r.expCertBesideTimeline === d.ctx.viewport.width >= 1024,
      `expCertBesideTimeline ${r.expCertBesideTimeline} at ${d.ctx.viewport.width}px`,
    ],
    [r.expCertImgLoaded, "certificate thumbnail not loaded"],
    [r.jeanRoseRole === "Lead Full Stack Developer", `jeanRoseRole ${r.jeanRoseRole}`],
    [r.overflowXExperience === 0, `overflowXExperience ${r.overflowXExperience}`],
  ])
    if (!ok) r.problems.push(msg);

  // Lightbox. A real tap on touch devices, a click otherwise (both at viewport coordinates).
  // Chromium taps go through CDP with a 60 ms press: slow software rendering can stretch a
  // Playwright tap into a long press, which fires no click.
  const press = async (x, y) => {
    if (cdp) {
      const t = Date.now() / 1000;
      await touchAt("touchStart", x, y, t);
      await touchAt("touchEnd", 0, 0, t + 0.06);
    } else if (isTouch) await page.touchscreen.tap(x, y);
    else await page.mouse.click(x, y);
  };
  const openCert = async () => {
    await page.evaluate(() =>
      document
        .querySelector("[data-certificate]")
        .scrollIntoView({ block: "center", behavior: "instant" }),
    );
    await wait(300);
    const b = await page.locator("[data-certificate]").boundingBox();
    await press(b.x + b.width / 2, b.y + b.height / 3);
    // Headless Chromium touch emulation now and then drops the click of the first tap (the
    // events show touchstart/touchend with no click; not reproducible in a fresh page). Retry
    // once and record it, so a dropped tap stays visible in results.json.
    const shown = await page
      .waitForSelector(".lightbox[open]", { timeout: 3000 })
      .then(() => true, () => false);
    if (!shown && isTouch) {
      r.lightboxTapRetries = (r.lightboxTapRetries ?? 0) + 1;
      await press(b.x + b.width / 2, b.y + b.height / 3);
      await page.waitForSelector(".lightbox[open]", { timeout: 3000 }).catch(() => {});
    }
    await wait(400);
  };
  const lbOpen = () => page.evaluate(() => !!document.querySelector(".lightbox[open]"));
  // The thumbnail's keyboard focus ring (violet-soft box-shadow ring): focused and showing it?
  // Read after the card's 300 ms box-shadow transition, never mid-way.
  const certRing = async () => {
    await wait(450);
    return page.evaluate(() => {
      const a = document.querySelector("[data-certificate]");
      return {
        focused: document.activeElement === a,
        ring: getComputedStyle(a).boxShadow.includes("rgb(166, 140, 255)"),
        lifted: !["none", "0px", "0px 0px"].includes(getComputedStyle(a).translate),
      };
    });
  };
  await openCert();
  await page
    .waitForFunction(() => document.querySelector(".lightbox-img")?.naturalWidth > 0, null, {
      timeout: 8000,
    })
    .catch(() => {});
  await wait(300); // let the open animation finish before measuring
  Object.assign(
    r,
    await page.evaluate(() => {
      const img = document.querySelector(".lightbox-img");
      const b = img?.getBoundingClientRect();
      const top = b && document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
      return {
        lightboxOpen: !!document.querySelector(".lightbox[open]"),
        lightboxImgLoaded: img?.naturalWidth > 0,
        lightboxImgOnTop: top === img,
        lightboxFits:
          !!b && b.left >= 0 && b.right <= innerWidth && b.top >= 0 && b.bottom <= innerHeight,
        lightboxFocus: document.activeElement?.getAttribute("aria-label"),
      };
    }),
  );
  await page.screenshot({ path: `${out}/${d.name}-11-lightbox.png` });
  await page.keyboard.press("Escape");
  await wait(300);
  r.lightboxEscCloses = !(await lbOpen());
  r.lightboxFocusReturns = await page.evaluate(
    () => document.activeElement?.hasAttribute("data-certificate") ?? false,
  );
  await openCert();
  await press(8, 30); // outside the image (the top-left padding)
  await wait(300);
  r.lightboxOutsideCloses = !(await lbOpen());
  r.ringAfterTapOutside = await certRing();
  await openCert();
  const cb = await page.locator(".lightbox button").boundingBox();
  r.lightboxCloseSize = cb && Math.min(cb.width, cb.height);
  if (cb) await press(cb.x + cb.width / 2, cb.y + cb.height / 2);
  await wait(300);
  r.lightboxButtonCloses = !(await lbOpen());
  r.ringAfterCloseTap = await certRing();
  // Keyboard: Enter on the (autofocused) close button closes it and the ring does show.
  await openCert();
  await page.keyboard.press("Enter");
  await wait(300);
  r.lightboxEnterCloses = !(await lbOpen());
  r.ringAfterKeyboard = await certRing();
  await page.evaluate(() => document.activeElement?.blur());
  for (const [ok, msg] of [
    [r.lightboxOpen, "lightbox did not open"],
    [r.lightboxImgLoaded, "lightbox image not loaded"],
    [r.lightboxImgOnTop, "lightbox image covered"],
    [r.lightboxFits, "lightbox image does not fit the screen"],
    [r.lightboxFocus === "Close certificate", `lightbox focus on ${r.lightboxFocus}`],
    [r.lightboxEscCloses, "Esc did not close the lightbox"],
    [r.lightboxFocusReturns, "focus did not return to the thumbnail"],
    [r.lightboxOutsideCloses, "tap outside did not close the lightbox"],
    [r.lightboxCloseSize >= 44, `close button ${r.lightboxCloseSize}px (want >= 44)`],
    [r.lightboxButtonCloses, "close button did not close the lightbox"],
    [
      r.ringAfterTapOutside.focused && !r.ringAfterTapOutside.ring && !r.ringAfterTapOutside.lifted,
      `after a tap outside: ${JSON.stringify(r.ringAfterTapOutside)} (want focused only)`,
    ],
    [
      r.ringAfterCloseTap.focused && !r.ringAfterCloseTap.ring && !r.ringAfterCloseTap.lifted,
      `after a close-button tap: ${JSON.stringify(r.ringAfterCloseTap)} (want focused only)`,
    ],
    [r.lightboxEnterCloses, "Enter on the close button did not close the lightbox"],
    [
      r.ringAfterKeyboard.focused && r.ringAfterKeyboard.ring && r.ringAfterKeyboard.lifted,
      `after a keyboard close: ${JSON.stringify(r.ringAfterKeyboard)} (want focused, ring, lift)`,
    ],
  ])
    if (!ok) r.problems.push(msg);
  await page.locator("#experience").screenshot({ path: `${out}/${d.name}-10-experience.png` });

  // Contact: email (mailto + Copy), GitHub and LinkedIn as large links, dealt in; intro beside
  // the links from 1024px; 44px targets, 16px+ text, no sideways scroll.
  await page.evaluate(() =>
    document.getElementById("contact").scrollIntoView({ block: "start", behavior: "instant" }),
  );
  await page
    .waitForFunction(
      () =>
        [...document.querySelectorAll("#contact [data-deal]")].every(
          (el) => getComputedStyle(el).transform === "none" && +getComputedStyle(el).opacity === 1,
        ),
      null,
      { timeout: 6000 },
    )
    .catch(() => {});
  Object.assign(
    r,
    await page.evaluate(() => {
      const c = document.getElementById("contact");
      const link = (k) => c.querySelector(`[data-contact=${k}]`);
      const targets = [...c.querySelectorAll("a, button")].map((el) => {
        const b = el.getBoundingClientRect();
        return { h: Math.round(b.height), w: Math.round(b.width) };
      });
      const smallText = [...c.querySelectorAll("p, a, button, span, h2, h3")].filter(
        (el) => el.textContent.trim() && el.offsetParent && parseFloat(getComputedStyle(el).fontSize) < 16,
      ).length;
      const deal = [...c.querySelectorAll("[data-deal]")];
      const intro = document.getElementById("contact-heading").getBoundingClientRect();
      const links = c.querySelector("[data-contact-links]").getBoundingClientRect();
      return {
        contactHrefs: ["email", "github", "linkedin"].map((k) => link(k)?.getAttribute("href")),
        contactExternalRel: ["github", "linkedin"].every((k) =>
          (link(k)?.rel ?? "").includes("noopener"),
        ),
        contactMinTarget: Math.min(...targets.map((t) => Math.min(t.h, t.w))),
        contactSmallText: smallText,
        contactDealt:
          deal.length === 4 && // email, GitHub, LinkedIn, form
          deal.every((el) => +getComputedStyle(el).opacity === 1 && getComputedStyle(el).transform === "none"),
        contactIntroBeside: intro.right <= links.left,
        overflowXContact: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    }),
  );
  await page.locator("#contact").screenshot({ path: `${out}/${d.name}-12-contact.png` });
  // Copy button: Chromium gets clipboard permission; WebKit may take the execCommand fallback.
  if (d.engine === chromium)
    await page.context().grantPermissions(["clipboard-read", "clipboard-write"]).catch(() => {});
  await page.locator("[data-copy-email]").click();
  await page
    .waitForFunction(() => document.querySelector("[data-copy-status]").textContent !== "Copy", null, {
      timeout: 2000,
    })
    .catch(() => {});
  r.contactCopyStatus = await page.evaluate(
    () => document.querySelector("[data-copy-status]").textContent,
  );
  {
    const wantHrefs = [
      "mailto:jericcontadan6@gmail.com",
      "https://github.com/jericcontadan",
      "https://www.linkedin.com/in/jeric-contadan-aa6484452/",
    ];
    for (const [ok, msg] of [
      [JSON.stringify(r.contactHrefs) === JSON.stringify(wantHrefs), `contactHrefs ${JSON.stringify(r.contactHrefs)}`],
      [r.contactExternalRel, "contact external links missing rel=noopener"],
      [r.contactMinTarget >= 44, `contact tap target ${r.contactMinTarget}px (want >= 44)`],
      [r.contactSmallText === 0, `contact text under 16px: ${r.contactSmallText}`],
      [r.contactDealt, "contact cards not dealt"],
      [
        r.contactIntroBeside === d.ctx.viewport.width >= 1024,
        `contactIntroBeside ${r.contactIntroBeside} at ${d.ctx.viewport.width}px`,
      ],
      [r.overflowXContact === 0, `overflowXContact ${r.overflowXContact}`],
      [r.contactCopyStatus === "Copied", `copy email: ${r.contactCopyStatus}`],
    ])
      if (!ok) r.problems.push(msg);
  }

  // Contact form (Supabase via a Server Action; the test server points it at
  // scripts/mock-supabase.mjs). Fields labelled, 16px+ and 44px+, honeypot hidden from people;
  // an empty send shows three errors and focuses Name; a valid send shows "Message sent" and
  // reaches the (mock) database with exactly what was typed.
  const received = () =>
    fetch(`${MOCK_SUPABASE}/_received`)
      .then((res) => res.json())
      .catch(() => null);
  const form = page.locator("[data-contact-form]");
  await form.scrollIntoViewIfNeeded();
  r.contactForm = await page.evaluate(() => {
    const f = document.querySelector("[data-contact-form]");
    const fields = [...f.querySelectorAll("input:not([type=hidden]), textarea")].filter(
      (el) => el.name !== "hp_x7",
    );
    const trap = f.querySelector("[name=hp_x7]");
    return {
      fields: fields.map((el) => el.name).join(","),
      labelled: fields.every((el) => f.querySelector(`label[for="${el.id}"]`)?.textContent.trim()),
      minFont: Math.min(...fields.map((el) => parseFloat(getComputedStyle(el).fontSize))),
      minHeight: Math.min(
        ...[...fields, f.querySelector("button[type=submit]")].map((el) =>
          Math.round(el.getBoundingClientRect().height),
        ),
      ),
      trapHidden: trap.tabIndex === -1 && !!trap.closest("[aria-hidden=true]") &&
        trap.getBoundingClientRect().right < 0,
    };
  });
  await form.locator("button[type=submit]").click();
  await wait(300);
  r.contactEmptySend = await page.evaluate(() => ({
    errors: document.querySelectorAll("[data-contact-form] [id$=-error]").length,
    focus: document.activeElement?.name ?? null,
  }));
  await page.locator("[data-contact-form]").screenshot({ path: `${out}/${d.name}-13-contact-form.png` });
  const sentMsg = `Hello from the ${d.name} device test.`;
  await page.fill("#contact-name", "Device Test");
  await page.fill("#contact-email", "device.test@example.com");
  await page.fill("#contact-message", sentMsg);
  const before = (await received())?.length ?? null;
  await form.locator("button[type=submit]").click();
  r.contactSent = await page
    .waitForSelector("[data-contact-sent]", { timeout: 10000 })
    .then(() => true, () => false);
  if (!r.contactSent)
    r.contactSendError = await page.evaluate(
      () => document.querySelector("[data-contact-error]")?.textContent ?? null,
    );
  const after = await received();
  r.contactStored = !!after && after.length === before + 1 &&
    JSON.stringify(after.at(-1)) ===
      JSON.stringify({ name: "Device Test", email: "device.test@example.com", message: sentMsg });
  // React moves focus in an effect, which can run a frame after the panel appears.
  r.contactSentFocused = await page
    .waitForFunction(() => document.activeElement?.hasAttribute("data-contact-sent"), null, {
      timeout: 2000,
    })
    .then(() => true, () => false);
  await page.locator("[data-contact-sent]").screenshot({ path: `${out}/${d.name}-14-contact-sent.png` }).catch(() => {});

  // Desktop only: the database's rate limit shows a clear message, and a bot that fills the
  // honeypot is told "sent" while nothing is stored.
  if (!isTouch && r.contactSent) {
    await page.getByRole("button", { name: "Send another message" }).click();
    await wait(3300); // the form's minimum fill time restarts
    await page.fill("#contact-name", "Device Test");
    await page.fill("#contact-email", "device.test@example.com");
    await page.fill("#contact-message", "Testing the limit [mock:rate-limit]");
    await page.locator("[data-contact-form] button[type=submit]").click();
    r.contactRateLimited = await page
      .waitForSelector("[data-contact-error]", { timeout: 10000 })
      .then((el) => el.textContent(), () => null);
    const n = (await received())?.length;
    await page.fill("#contact-message", "I am definitely a person, honestly.");
    await page.evaluate(() => {
      document.querySelector("[data-contact-form] [name=hp_x7]").value = "Spam Inc";
    });
    await page.locator("[data-contact-form] button[type=submit]").click();
    const botSent = await page
      .waitForSelector("[data-contact-sent]", { timeout: 10000 })
      .then(() => true, () => false);
    r.contactHoneypot = { shownSent: botSent, stored: ((await received())?.length ?? n) - n };
  }
  for (const [ok, msg] of [
    [r.contactForm.fields === "name,email,message", `form fields ${r.contactForm.fields}`],
    [r.contactForm.labelled, "form fields missing labels"],
    [r.contactForm.minFont >= 16, `form font ${r.contactForm.minFont}px (want >= 16)`],
    [r.contactForm.minHeight >= 44, `form control ${r.contactForm.minHeight}px tall (want >= 44)`],
    [r.contactForm.trapHidden, "honeypot field is reachable or visible"],
    [
      r.contactEmptySend.errors === 3 && r.contactEmptySend.focus === "name",
      `empty send ${JSON.stringify(r.contactEmptySend)}`,
    ],
    [r.contactSent, `form not sent: ${r.contactSendError}`],
    [r.contactStored, "message did not reach the (mock) database intact"],
    [r.contactSentFocused, "focus did not move to the confirmation"],
    [
      isTouch || /Too many messages/.test(r.contactRateLimited ?? ""),
      `rate limit message: ${r.contactRateLimited}`,
    ],
    [
      isTouch || (r.contactHoneypot?.shownSent && r.contactHoneypot?.stored === 0),
      `honeypot ${JSON.stringify(r.contactHoneypot)}`,
    ],
  ])
    if (!ok) r.problems.push(msg);

  // Deep-space exit: content leaving the top recedes (tilt, shrink, fade), tied to scrolling.
  r.deepExit = await deepExitChecks(page, d, r, "native");
  if (d.name === "desktop-1280x800") {
    // The fallback path (no scroll timelines, e.g. iOS Safari before 26), forced in Chromium:
    // the JS check says "unsupported" and the native CSS rules are switched off.
    const fctx = await browser.newContext(d.ctx);
    await fctx.addInitScript(() => {
      const orig = CSS.supports.bind(CSS);
      CSS.supports = (...a) => (a.join(" ").includes("animation-timeline") ? false : orig(...a));
      document.addEventListener("DOMContentLoaded", () => {
        const st = document.createElement("style");
        st.textContent = "[data-exit]{animation:none!important}";
        document.head.append(st);
      });
    });
    const fpage = await fctx.newPage();
    await fpage.goto(base, { waitUntil: "load" });
    await wait(1000);
    r.deepExitFallback = await deepExitChecks(fpage, d, r, "fallback");
    await fctx.close();
  }

  // Mobile menu (below md): opens above everything and pauses the sky.
  if ((d.ctx.viewport.width ?? 1280) < 768) {
    // A real tap (page.click would first scroll the page, which a finger never does).
    const t = await page.locator("[aria-controls=mobile-menu]").boundingBox();
    const yBeforeMenu = await page.evaluate(() => Math.round(scrollY));
    await page.touchscreen.tap(t.x + t.width / 2, t.y + t.height / 2);
    await wait(500);
    r.menuPausesSky = (await sky()) === "paused";
    r.menuActive = await page.evaluate(
      () => document.querySelector("#mobile-menu [aria-current=location]")?.textContent,
    );
    await page.screenshot({ path: `${out}/${d.name}-6-menu.png` });
    await page.keyboard.press("Escape");
    await wait(300);
    r.menuClosed = await page.evaluate(
      () => document.getElementById("mobile-menu").hidden,
    );
    // Closing with Esc must leave the page where it was (focus returns to the toggle).
    r.menuCloseScrollJump = (await page.evaluate(() => Math.round(scrollY))) - yBeforeMenu;
    if (r.menuCloseScrollJump !== 0) r.problems.push(`menu close moved the page ${r.menuCloseScrollJump}px`);
  }

  // Reduced motion: no fly-ins (content simply there), still sky, so no warp or bursts.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await wait(300);
  await page.evaluate(() =>
    document.getElementById("experience").scrollIntoView({ block: "start", behavior: "instant" }),
  );
  await wait(100);
  const rm = await page.evaluate(() => {
    const el = document.querySelector("#experience [data-fly]");
    const s = getComputedStyle(el);
    return {
      shock: document.documentElement.hasAttribute("data-shock"),
      opacity: +s.opacity,
      transform: s.transform,
      cardsStill: [...document.querySelectorAll("#experience [data-deal]")].every(
        (c) => +getComputedStyle(c).opacity === 1 && getComputedStyle(c).transform === "none",
      ),
      sky: document.querySelector("[data-atmosphere]")?.dataset.atmosphere,
      // Diagnostics, for a failure: what is still moving, and why.
      inview: el.hasAttribute("data-inview"),
      transition: `${s.transitionProperty} ${s.transitionDuration}`,
      anims: el.getAnimations().map((a) => `${a.transitionProperty ?? a.animationName}:${a.playState}`),
      movingCards: [...document.querySelectorAll("#experience [data-deal]")]
        .filter((c) => getComputedStyle(c).transform !== "none")
        .map((c) => `${getComputedStyle(c).transition.slice(0, 60)} | ${c.getAnimations().length} anims`),
    };
  });
  r.reducedMotionShock = rm;
  if (
    rm.shock ||
    rm.opacity !== 1 ||
    rm.transform !== "none" ||
    !rm.cardsStill ||
    rm.sky !== "static"
  )
    r.problems.push(`reduced motion still animates ${JSON.stringify(rm)}`);
  // ...and no deep-space exit either: content leaving the top stays as it is.
  r.reducedMotionExit = await exitAt(page, "#about [data-exit]", 0.85);
  if (r.reducedMotionExit.t !== "none" || r.reducedMotionExit.o !== 1)
    r.problems.push(`reduced motion: exit still applied ${JSON.stringify(r.reducedMotionExit)}`);
  await page.emulateMedia({ reducedMotion: "no-preference" });

  // Loading mid-page must not flash: a section shown on screen is never hidden again to fly in.
  // (Arriving later, e.g. by the smooth scroll to #projects, it may fly in as usual.) Sampled
  // every frame for 1.5 s after load: a flash is opacity 1 on screen, then below 1 on screen.
  const noFlash = () =>
    page.evaluate(
      () =>
        new Promise((res) => {
          const el = document.querySelector("#projects [data-fly]");
          let shown = false;
          let flash = false;
          const t0 = performance.now();
          const f = () => {
            const b = el.parentElement.getBoundingClientRect();
            const onScreen = b.bottom > 0 && b.top < innerHeight;
            const o = +getComputedStyle(el).opacity;
            if (onScreen && o === 1) shown = true;
            else if (onScreen && shown && o < 1) flash = true;
            if (performance.now() - t0 < 1500) requestAnimationFrame(f);
            else res({ shock: document.documentElement.hasAttribute("data-shock"), flash });
          };
          f();
        }),
    );
  await page.goto(`${base}/#projects`, { waitUntil: "load" });
  r.hashLoad = await noFlash();
  await page.evaluate(() =>
    document.getElementById("projects").scrollIntoView({ block: "start", behavior: "instant" }),
  );
  await wait(1500);
  await page.reload({ waitUntil: "load" });
  r.reloadMidPage = await noFlash();
  for (const [k, v] of [["#projects load", r.hashLoad], ["reload mid-page", r.reloadMidPage]])
    if (!v.shock || v.flash) r.problems.push(`${k}: projects flashed ${JSON.stringify(v)}`);

}

const results = [];
for (const d of DEVICES.filter((x) => !ONLY || x.name.includes(ONLY))) {
  const r = { device: d.name };
  try {
    await run(d, r);
  } catch (e) {
    r.error = String(e).split("\n")[0];
  }
  // Snapshot: after a timeout the abandoned run may still write into `r` until its browser dies.
  const snap = structuredClone(r);
  results.push(snap);
  console.log(JSON.stringify(snap));
}
writeFileSync(`${out}/results.json`, JSON.stringify(results, null, 2));
const failed = results.filter((r) => r.error || r.errors?.length || r.problems?.length);
console.log(
  failed.length
    ? `FAILED: ${failed.map((r) => r.device).join(", ")}`
    : `OK: ${results.length} device(s)`,
);
// Exit explicitly: a browser whose close timed out would otherwise keep Node alive.
process.exit(failed.length ? 1 : 0);
