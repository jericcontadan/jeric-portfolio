// Runs the sky renderer off the main thread, drawing into a transferred OffscreenCanvas.
import { createSky, type SkySize, type SkyState } from "./engine";

type Msg =
  | { type: "init"; canvas: OffscreenCanvas; size: SkySize; state: SkyState }
  | { type: "resize"; size: SkySize }
  | { type: "state"; state: SkyState }
  | { type: "warp"; v: number }
  | { type: "burst"; n: number };

let sky: ReturnType<typeof createSky> | null = null;

self.onmessage = (e: MessageEvent<Msg>) => {
  const msg = e.data;
  if (msg.type === "init") {
    sky = createSky(msg.canvas, {
      maxFps: 60,
      onStats: (stats) => self.postMessage({ type: "stats", stats }),
    });
    sky.resize(msg.size);
    sky.setState(msg.state);
  } else if (msg.type === "resize") sky?.resize(msg.size);
  else if (msg.type === "state") sky?.setState(msg.state);
  else if (msg.type === "warp") sky?.setWarp(msg.v);
  else if (msg.type === "burst") sky?.burst(msg.n);
};
