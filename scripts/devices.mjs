// Cross-device check of the hero lanyard, atmosphere, pill nav and stats: WebKit (Safari) + Chromium, phones, tablets, desktop.
// Usage: node scripts/devices.mjs [baseUrl=http://localhost:3101] [outDir=./.devices]
// Writes screenshots + results.json to outDir and prints a summary table.
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium, devices, webkit } from "playwright";
import sharp from "sharp";

const base = process.argv[2] ?? "http://localhost:3101";
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

async function run(d) {
  const browser = await d.engine.launch();
  const ctx = await browser.newContext(d.ctx);
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  if (process.env.DEBUG)
    page.on(
      "console",
      (msg) =>
        msg.text().includes("DEBUG") &&
        console.error(d.name, Math.round(performance.now()), msg.text()),
    );
  const dpr = d.ctx.deviceScaleFactor ?? 1;
  const r = { device: d.name };

  await page.goto(base, { waitUntil: "load" });
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
      .map((e) => [
        e.textContent.trim() || e.getAttribute("aria-label"),
        e.getBoundingClientRect().height,
        e.getBoundingClientRect().width,
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

  // Scroll to About: the nav highlights it and the stat cards count up.
  await page.evaluate(() =>
    document.getElementById("about").scrollIntoView({ block: "start" }),
  );
  await wait(2000);
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
  await wait(1200); // lazy reveal image loads
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

  // Reduced motion: only the still cutout (no reveal layer, no hint).
  if (!isTouch) {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await wait(300);
    r.reducedMotionPhotoImgs = await page.evaluate(
      () => document.querySelectorAll("[data-profile-reveal] img").length,
    );
    await page.emulateMedia({ reducedMotion: "no-preference" });
  }

  // Mobile menu (below md): opens above everything and pauses the sky.
  if ((d.ctx.viewport.width ?? 1280) < 768) {
    // A real tap (page.click would first scroll the page, which a finger never does).
    const t = await page.locator("[aria-controls=mobile-menu]").boundingBox();
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
  }

  r.errors = errors;
  await browser.close();
  return r;
}

const results = [];
for (const d of DEVICES.filter((x) => !ONLY || x.name.includes(ONLY))) {
  try {
    results.push(await run(d));
  } catch (e) {
    results.push({ device: d.name, error: String(e).split("\n")[0] });
  }
  console.log(JSON.stringify(results.at(-1)));
}
writeFileSync(`${out}/results.json`, JSON.stringify(results, null, 2));
