"use client";

// 3D lanyard ID card. Rope physics adapted from the React Bits "Lanyard" component
// (https://reactbits.dev), with the GLB card replaced by a code-built 5:7 card so the
// card-front/card-back textures map 1:1 with no cropping or stretching.
import { useTexture } from "@react-three/drei";
import {
  Canvas,
  extend,
  useFrame,
  useThree,
  type ThreeElement,
  type ThreeEvent,
} from "@react-three/fiber";
import {
  BallCollider,
  CuboidCollider,
  Physics,
  RigidBody,
  useRopeJoint,
  useSphericalJoint,
  type RapierRigidBody,
} from "@react-three/rapier";
import { MeshLineGeometry, MeshLineMaterial } from "meshline";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import * as THREE from "three";

extend({ MeshLineGeometry, MeshLineMaterial });

declare module "@react-three/fiber" {
  interface ThreeElements {
    meshLineGeometry: ThreeElement<typeof MeshLineGeometry>;
    meshLineMaterial: ThreeElement<typeof MeshLineMaterial>;
  }
}

// --- Scene constants (world units) -------------------------------------------------------
const FOV = 20;
const CAMERA_Z = 13; // visible height ≈ 2·13·tan(10°) ≈ 4.6
const CARD_W = 1.6;
const CARD_H = (CARD_W * 7) / 5; // exact 5:7, same as card-front.png / card-back.png
const CARD_D = 0.02;
const ROPE = 0.5; // length of each of the 3 rope segments
const ANCHOR_Y = 2.6; // just above the top edge of the view, so the strap comes from off-screen
const HANG = CARD_H / 2 + 0.13; // card centre → joint at the clip
// Where the card's centre comes to rest: the rope hangs straight down, fully stretched,
// plus the joints' small stretch under gravity (measured: 0.037 at every screen size).
const REST_Y = ANCHOR_Y - 3 * ROPE - HANG - 0.037;
// Height of the view at the card's depth, at camera zoom 1.
const VIEW_H = 2 * CAMERA_Z * Math.tan(THREE.MathUtils.degToRad(FOV / 2));
const STRAP_W = 0.3; // strap width in world units
const STRAP_TEX_ASPECT = 2874 / 160; // lanyard.png width / height
// meshline widths are in clip space; this converts a world width at the card's depth
// (at zoom 1; Band scales it by the camera zoom every frame).
const LINE_WIDTH = STRAP_W / Math.tan(THREE.MathUtils.degToRad(FOV / 2)) / 2;

const segmentProps = {
  type: "dynamic" as const,
  canSleep: true,
  colliders: false as const,
  angularDamping: 4,
  linearDamping: 4,
};

type Props = {
  /** false pauses rendering and physics (offscreen, menu open, tab hidden). */
  active: boolean;
  /** Called once the first frame with textures has been drawn. */
  onReady: () => void;
  /** Element that receives pointer events (the canvas itself ignores them, so text stays clickable). */
  eventSource: RefObject<HTMLElement>;
  /** The lanyard hangs from the horizontal centre of this element. */
  stage: RefObject<HTMLElement | null>;
  /** Show the back of the card (animated). */
  flipped: boolean;
  /** Double-click / double-tap on the card. */
  onFlip: () => void;
  /** Occasionally twist the card to show the back while idle. */
  idlePeek: boolean;
};

// Flip animation: exponential smoothing rates (higher = faster).
const FLIP_LAMBDA = 7; // ~0.5 s
const PEEK_LAMBDA = 2.5; // slow, gentle
const IDLE_PEEK_AFTER = 8; // seconds without interaction
const PEEK_HOLD = 1.2; // seconds the back stays visible during a peek
// Double-tap / double-click detection (same for mouse and touch).
const TAP_MAX_MOVE = 8; // px
const TAP_MAX_MS = 300;
const DOUBLE_TAP_MS = 350;
const DOUBLE_TAP_MAX_GAP = 30; // px between the two taps

const MAX_SPEED = 14; // world units per second; keeps hard flings on screen

export default function Lanyard({
  active,
  onReady,
  eventSource,
  stage,
  flipped,
  onFlip,
  idlePeek,
}: Props) {
  const box = useRef<HTMLDivElement>(null);
  return (
    // Own wrapper so framing can measure the canvas area reliably.
    <div ref={box} data-lanyard-canvas className="h-full w-full">
      <Canvas
        // Tight near/far planes: the card is only 0.02 thick, and some mobile GPUs have a
        // 16-bit depth buffer, so a wide range would let the back face bleed through.
        camera={{ position: [0, 0, CAMERA_Z], fov: FOV, near: 5, far: 30 }}
        // Native resolution up to 2x: sharp on phones and tablets, still smooth on low-end Android.
        dpr={[1, 2]}
        gl={{ alpha: true, antialias: true, powerPreference: "default" }}
        frameloop={active ? "always" : "never"}
        eventSource={eventSource}
        onCreated={({ gl, camera, setEvents }) => {
          gl.setClearColor(0x000000, 0);
          // Aspect and view offset are owned by <Framing>, not R3F's auto-resize.
          (camera as THREE.PerspectiveCamera & { manual?: boolean }).manual =
            true;
          // Pointer position relative to the canvas, wherever the event came from.
          setEvents({
            compute: (event, state) => {
              const r = (
                box.current ?? state.gl.domElement
              ).getBoundingClientRect();
              state.pointer.set(
                ((event.clientX - r.left) / r.width) * 2 - 1,
                -((event.clientY - r.top) / r.height) * 2 + 1,
              );
              state.raycaster.setFromCamera(state.pointer, state.camera);
            },
          });
        }}
      >
        <Framing stage={stage} box={box} />
        <ambientLight intensity={1.2} />
        <directionalLight position={[2, 3, 5]} intensity={1.5} />
        <Physics
          gravity={[0, -40, 0]}
          timeStep={1 / 60}
          interpolate
          paused={!active}
        >
          <Band
            onReady={onReady}
            flipped={flipped}
            onFlip={onFlip}
            idlePeek={idlePeek}
          />
        </Physics>
      </Canvas>
    </div>
  );
}

/**
 * Matches the 3D card to the still card's box ([data-static-card]), which CSS lays out per
 * breakpoint: the camera zoom sets the size, and a view offset puts the resting card on
 * the still card's centre (no perspective skew, and no jump when one replaces the other).
 * Without a still card it falls back to centring the anchor on the stage at zoom 1.
 */
function Framing({
  stage,
  box,
}: {
  stage: RefObject<HTMLElement | null>;
  box: RefObject<HTMLElement | null>;
}) {
  const get = useThree((s) => s.get);
  const size = useThree((s) => s.size);

  useLayoutEffect(() => {
    const frame = () => {
      const camera = get().camera as THREE.PerspectiveCamera;
      const el = stage.current;
      const { width: W, height: H } = size;
      // The wrapper's ref isn't attached yet on the first run (parent refs attach after child
      // layout effects), but its DOM node already exists, so look it up.
      const area = box.current ?? el?.querySelector("[data-lanyard-canvas]");
      if (!el || !area || !W || !H) return;
      const c = area.getBoundingClientRect();
      if (!c.width) return; // not laid out yet (e.g. hidden while textures load); RO retries
      const r = el.getBoundingClientRect();
      const s = r.left + r.width / 2 - c.left; // stage centre in canvas px
      const full = 2 * Math.max(s, W - s);
      const card = el
        .querySelector("[data-static-card]")
        ?.getBoundingClientRect();
      let zoom = 1;
      let offY = 0;
      if (card && card.height > 0) {
        const ppw = card.height / CARD_H; // px per world unit the card should get
        zoom = (ppw * VIEW_H) / H;
        const cy = card.top + card.height / 2 - c.top; // still card centre in canvas px
        offY = H / 2 - REST_Y * ppw - cy;
      }
      camera.zoom = zoom;
      camera.aspect = full / H;
      camera.setViewOffset(full, H, full / 2 - s, offY, W, H);
      camera.updateProjectionMatrix();
    };
    frame();
    window.addEventListener("resize", frame);
    const ro = new ResizeObserver(frame);
    if (stage.current) {
      ro.observe(stage.current);
      const area = stage.current.querySelector("[data-lanyard-canvas]");
      if (area) ro.observe(area);
      const still = stage.current.querySelector("[data-static-card]");
      if (still) ro.observe(still);
    }
    return () => {
      window.removeEventListener("resize", frame);
      ro.disconnect();
    };
  }, [get, size, stage, box]);

  return null;
}

type BandProps = Pick<Props, "onReady" | "flipped" | "onFlip" | "idlePeek">;

function Band({ onReady, flipped, onFlip, idlePeek }: BandProps) {
  const band = useRef<THREE.Mesh<MeshLineGeometry, MeshLineMaterial>>(null);
  // Flip is a visual rotation of the card mesh only; the physics body keeps facing forward.
  const face = useRef<THREE.Group>(null);
  const yaw = useRef(0);
  const lastUp = useRef<PointerEvent | null>(null);
  const idle = useRef(0);
  const peek = useRef<{ phase: "none" | "out" | "hold" | "back"; t: number }>({
    phase: "none",
    t: 0,
  });
  const tap = useRef({
    x: 0,
    y: 0,
    t: 0,
    lastT: -Infinity,
    lastX: 0,
    lastY: 0,
  });
  // Rapier's joint hooks take non-null refs; bodies are attached on first commit.
  const fixed = useRef<RapierRigidBody>(null!);
  const j1 = useRef<RapierRigidBody>(null!);
  const j2 = useRef<RapierRigidBody>(null!);
  const j3 = useRef<RapierRigidBody>(null!);
  const card = useRef<RapierRigidBody>(null!);
  const readySent = useRef(false);

  // Smoothed rope points (stops the strap jittering at low frame rates).
  const [lerped] = useState(() => [new THREE.Vector3(), new THREE.Vector3()]);
  const lerpInit = useRef(false);
  const [tmp] = useState(() => ({
    vec: new THREE.Vector3(),
    dir: new THREE.Vector3(),
    ang: new THREE.Vector3(),
    rot: new THREE.Vector3(),
    top: new THREE.Vector3(),
  }));
  const [curve] = useState(() => {
    const c = new THREE.CatmullRomCurve3(
      Array.from({ length: 5 }, () => new THREE.Vector3()),
    );
    c.curveType = "chordal";
    return c;
  });

  const [dragged, setDragged] = useState<THREE.Vector3 | false>(false);
  const [hovered, setHovered] = useState(false);
  const size = useThree((s) => s.size);
  const gl = useThree((s) => s.gl);
  // One Vector2 shared with the shader uniform; updated in place on resize.
  const [resolution] = useState(() => new THREE.Vector2(1, 1));
  useEffect(() => {
    resolution.set(size.width, size.height);
  }, [resolution, size.width, size.height]);
  const [repeat] = useState(() => new THREE.Vector2(-1, 1));

  const [front, back, strap] = useTexture(
    ["/card-front.png", "/card-back.png", "/lanyard.png"],
    (loaded) => {
      // Sharp at angles and small sizes: full mipmap chain + the GPU's best anisotropy.
      const aniso = Math.min(16, gl.capabilities.getMaxAnisotropy());
      for (const t of loaded) {
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = aniso;
        t.generateMipmaps = true;
        t.minFilter = THREE.LinearMipmapLinearFilter;
        t.magFilter = THREE.LinearFilter;
      }
      loaded[2].wrapS = THREE.RepeatWrapping; // strap repeats along its length
    },
  );

  useRopeJoint(fixed, j1, [[0, 0, 0], [0, 0, 0], ROPE]);
  useRopeJoint(j1, j2, [[0, 0, 0], [0, 0, 0], ROPE]);
  useRopeJoint(j2, j3, [[0, 0, 0], [0, 0, 0], ROPE]);
  useSphericalJoint(j3, card, [
    [0, 0, 0],
    [0, HANG, 0],
  ]);

  useEffect(() => {
    if (!hovered) return;
    document.body.style.cursor = dragged ? "grabbing" : "grab";
    // Desktop: the canvas overlaps the hero text, so stop double-clicks on the card
    // from selecting words underneath.
    const noSelect = (e: Event) => e.preventDefault();
    document.addEventListener("selectstart", noSelect);
    return () => {
      document.body.style.cursor = "";
      document.removeEventListener("selectstart", noSelect);
    };
  }, [hovered, dragged]);

  // Removes the window listeners that end a drag (see onPointerDown).
  const stopDragEnd = useRef<(() => void) | null>(null);
  useEffect(() => () => stopDragEnd.current?.(), []);

  useFrame((state, rawDelta) => {
    const delta = Math.min(rawDelta, 1 / 30); // physics smoothing: no overshoot after a pause
    // Timers and the flip use real time, so they run at the same speed at any frame rate
    // (iOS Low Power Mode and slow GPUs render far below 60 fps).
    const real = Math.min(rawDelta, 0.25);
    const { vec, dir, ang, rot, top } = tmp;
    if (
      !fixed.current ||
      !j1.current ||
      !j2.current ||
      !j3.current ||
      !card.current ||
      !band.current
    )
      return;

    if (dragged) {
      // Pointer ray to the z = 0 plane the card hangs in.
      vec.set(state.pointer.x, state.pointer.y, 0.5).unproject(state.camera);
      dir.copy(vec).sub(state.camera.position).normalize();
      vec
        .copy(state.camera.position)
        .addScaledVector(dir, -state.camera.position.z / dir.z);
      [card, j1, j2, j3, fixed].forEach((r) => r.current?.wakeUp());
      card.current.setNextKinematicTranslation({
        x: vec.x - dragged.x,
        y: vec.y - dragged.y,
        z: vec.z - dragged.z,
      });
    }

    const joints = [j1.current, j2.current];
    if (!lerpInit.current) {
      joints.forEach((j, i) => lerped[i].copy(j.translation()));
      lerpInit.current = true;
    }
    joints.forEach((j, i) => {
      const t = j.translation();
      const dist = Math.max(0.1, Math.min(1, lerped[i].distanceTo(t)));
      lerped[i].lerp(t, Math.min(1, delta * (dist * 50)));
    });

    const anchor = fixed.current.translation();
    curve.points[0].copy(j3.current.translation());
    curve.points[1].copy(lerped[1]);
    curve.points[2].copy(lerped[0]);
    curve.points[3].copy(anchor);
    curve.points[4].copy(top.set(anchor.x, anchor.y + 2, anchor.z)); // continue off-screen
    band.current.geometry.setPoints(curve.getPoints(32));
    band.current.material.lineWidth = LINE_WIDTH * state.camera.zoom;
    // Keep lanyard.png at its true proportions along the strap.
    band.current.material.repeat.set(
      -curve.getLength() / (STRAP_W * STRAP_TEX_ASPECT),
      1,
    );

    // Cap speed so a hard fling cannot throw the card off screen.
    const v = card.current.linvel();
    const speed = Math.hypot(v.x, v.y, v.z);
    if (!dragged && speed > MAX_SPEED) {
      const k = MAX_SPEED / speed;
      card.current.setLinvel({ x: v.x * k, y: v.y * k, z: v.z * k }, true);
    }

    // Gently turn the card back to face the camera.
    ang.copy(card.current.angvel());
    rot.copy(card.current.rotation());
    card.current.setAngvel(
      { x: ang.x, y: ang.y - rot.y * 0.25, z: ang.z },
      true,
    );

    // Flip and idle peek (visual only).
    const pk = peek.current;
    if (dragged || flipped || !idlePeek) {
      idle.current = 0;
      pk.phase = "none";
    } else if (pk.phase === "none") {
      idle.current += real; // only advances while frames run, so it pauses offscreen/menu/tab hidden
      if (idle.current >= IDLE_PEEK_AFTER) pk.phase = "out";
    }
    let target = flipped ? Math.PI : 0;
    let lambda = FLIP_LAMBDA;
    if (pk.phase !== "none") {
      lambda = PEEK_LAMBDA;
      target = pk.phase === "back" ? 0 : Math.PI;
      if (pk.phase === "out" && Math.abs(yaw.current - Math.PI) < 0.05) {
        pk.phase = "hold";
        pk.t = 0;
      } else if (pk.phase === "hold" && (pk.t += real) > PEEK_HOLD) {
        pk.phase = "back";
      } else if (pk.phase === "back" && Math.abs(yaw.current) < 0.02) {
        pk.phase = "none";
        idle.current = 0;
      }
    }
    yaw.current = THREE.MathUtils.damp(yaw.current, target, lambda, real);
    if (face.current) face.current.rotation.y = yaw.current;

    if (!readySent.current) {
      readySent.current = true;
      onReady();
    }
  });

  /** Any interaction restarts the idle timer and cancels a running peek. */
  const interacted = () => {
    idle.current = 0;
    if (peek.current.phase !== "none") peek.current.phase = "back";
  };

  // Capture can fail (e.g. the browser already took a touch for scrolling); dragging still works.
  const capture = (e: ThreeEvent<PointerEvent>, on: boolean) => {
    try {
      const el = e.target as Element;
      if (on) el.setPointerCapture(e.pointerId);
      else if (el.hasPointerCapture(e.pointerId))
        el.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  /** The press landed on a hero link or button under the (overlapping) canvas. */
  const onControl = (e: ThreeEvent<PointerEvent>) =>
    e.nativeEvent.target instanceof Element &&
    e.nativeEvent.target.closest("a, button") !== null;

  const onPointerDown = (e: ThreeEvent<PointerEvent>) => {
    if (!card.current || onControl(e)) return;
    interacted();
    const tp = tap.current;
    tp.x = e.nativeEvent.clientX;
    tp.y = e.nativeEvent.clientY;
    // Event timestamps, not handler time: a slow frame between the two taps must not
    // make a quick double-tap look slow.
    tp.t = e.nativeEvent.timeStamp;
    capture(e, true);
    // End the drag on release or cancel anywhere. Attached now, not in an effect: iOS can
    // send pointercancel (the touch became a page scroll) before React re-renders, and R3F
    // never delivers pointercancel to objects.
    stopDragEnd.current?.();
    const id = e.nativeEvent.pointerId;
    const end = (ev: PointerEvent) => {
      if (ev.pointerId !== id) return;
      stopDragEnd.current?.();
      setDragged(false);
    };
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
    stopDragEnd.current = () => {
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
      stopDragEnd.current = null;
    };
    const t = card.current.translation();
    setDragged(
      new THREE.Vector3().copy(e.point).sub(tmp.vec.set(t.x, t.y, t.z)),
    );
  };
  const endDrag = (e: ThreeEvent<PointerEvent>) => {
    capture(e, false);
    setDragged(false);
  };
  const onPointerUp = (e: ThreeEvent<PointerEvent>) => {
    endDrag(e);
    // With pointer capture, R3F can deliver one pointerup twice (capture + hit): count it once.
    if (lastUp.current === e.nativeEvent || onControl(e)) return;
    lastUp.current = e.nativeEvent;
    // A short press that barely moved is a tap; two taps close together flip the card.
    // A drag never counts (it moves), so dragging is unaffected.
    const tp = tap.current;
    const now = e.nativeEvent.timeStamp;
    const { clientX: x, clientY: y } = e.nativeEvent;
    if (
      Math.hypot(x - tp.x, y - tp.y) > TAP_MAX_MOVE ||
      now - tp.t > TAP_MAX_MS
    )
      return;
    if (
      now - tp.lastT < DOUBLE_TAP_MS &&
      Math.hypot(x - tp.lastX, y - tp.lastY) < DOUBLE_TAP_MAX_GAP
    ) {
      tp.lastT = -Infinity;
      onFlip();
    } else {
      tp.lastT = now;
      tp.lastX = x;
      tp.lastY = y;
    }
  };

  return (
    <>
      <group position={[0, ANCHOR_Y, 0]}>
        <RigidBody ref={fixed} {...segmentProps} type="fixed" />
        {/* Start sideways so the card swings into place once on load. */}
        <RigidBody position={[ROPE, 0, 0]} ref={j1} {...segmentProps}>
          <BallCollider args={[0.1]} />
        </RigidBody>
        <RigidBody position={[ROPE * 2, 0, 0]} ref={j2} {...segmentProps}>
          <BallCollider args={[0.1]} />
        </RigidBody>
        <RigidBody position={[ROPE * 3, 0, 0]} ref={j3} {...segmentProps}>
          <BallCollider args={[0.1]} />
        </RigidBody>
        <RigidBody
          position={[ROPE * 3 + 0.5, -HANG, 0]}
          ref={card}
          {...segmentProps}
          type={dragged ? "kinematicPosition" : "dynamic"}
        >
          <CuboidCollider args={[CARD_W / 2, CARD_H / 2, CARD_D / 2]} />
          <group
            onPointerOver={() => setHovered(true)}
            onPointerOut={() => setHovered(false)}
            onPointerMove={interacted}
            onPointerDown={onPointerDown}
            onPointerUp={onPointerUp}
          >
            <group ref={face}>
              <mesh>
                <boxGeometry args={[CARD_W, CARD_H, CARD_D]} />
                {/* BoxGeometry groups: +x, -x, +y, -y, +z (front), -z (back) */}
                <meshStandardMaterial attach="material-0" color="#6d4aff" />
                <meshStandardMaterial attach="material-1" color="#6d4aff" />
                <meshStandardMaterial attach="material-2" color="#6d4aff" />
                <meshStandardMaterial attach="material-3" color="#6d4aff" />
                <meshBasicMaterial
                  attach="material-4"
                  map={front}
                  toneMapped={false}
                />
                <meshBasicMaterial
                  attach="material-5"
                  map={back}
                  toneMapped={false}
                />
              </mesh>
              {/* Metal clip that holds the strap */}
              <mesh position={[0, CARD_H / 2 + 0.07, 0]}>
                <boxGeometry args={[0.32, 0.12, 0.05]} />
                <meshStandardMaterial
                  color="#c9ccd6"
                  metalness={0.7}
                  roughness={0.3}
                />
              </mesh>
            </group>
          </group>
        </RigidBody>
      </group>
      <mesh ref={band}>
        <meshLineGeometry />
        <meshLineMaterial
          args={[
            {
              resolution,
              repeat,
              lineWidth: LINE_WIDTH,
              useMap: 1,
              map: strap,
              color: "white",
            },
          ]}
          depthTest={false}
        />
      </mesh>
    </>
  );
}
