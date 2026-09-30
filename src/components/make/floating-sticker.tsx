import { useEffect, useRef, useState } from "react";
import {
  animate,
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  type AnimationPlaybackControls,
} from "motion/react";
import { cn } from "@/lib/utils";

type Props = {
  src: string;
  holo: boolean;
  /** Visual longest-side size in CSS pixels. */
  displayPx: number;
  appearKey: string | number;
  className?: string;
  /** Fired once when the sticker is fully peeled — continue to place on wall. */
  onFullyPeeled?: () => void;
};

type PeelEdge = "left" | "right" | "top" | "bottom";
type PeelCorner = "tl" | "tr" | "bl" | "br";
type PeelOrigin =
  | { kind: "edge"; edge: PeelEdge }
  | { kind: "corner"; corner: PeelCorner };

const TILT_SPRING = { stiffness: 240, damping: 20, mass: 0.6 };
/** Settle when snapping shut or opening fully — snappy release. */
const SETTLE_SPRING = {
  type: "spring" as const,
  stiffness: 320,
  damping: 30,
  mass: 0.55,
};

/** Release below this → snap shut; at/above → finish the peel. */
const PEEL_THRESHOLD = 0.5;

/**
 * Px the PAPER flap reaches past the crease, over the still-stuck image. The
 * image is cut exactly on the crease, so none of it can peek out beside the
 * paper; the paper edge simply covers the seam.
 */
const FLAP_OVERLAP = 3;

/** Max fold angle (deg). Under 180 so a paper face stays toward the camera. */
const FOLD_MAX = 158;
/**
 * Peel progress at which the flap is fully folded over. Small = the paper
 * flips over almost immediately on the first drag.
 */
const FOLD_RAMP = 0.05;
/** Drag response curve: >1 softens early drag so the peel feels heavier. */
const DRAG_CURVE = 1.05;
/** Perspective distance as a multiple of sticker size. Higher = flatter, less warp. */
const PERSPECTIVE_FACTOR = 8;
/** Extra CSS px around the sticker so the die-cut edge is easy to grab. */
const HIT_PAD = 44;
/**
 * Crease travel vs pointer travel. ~1 keeps the fold under the finger;
 * lower values leave a visible gap between cursor and peel tip.
 */
const PEEL_GAIN = 0.95;

/** Matte paper back: flat colour plus a fine fibre grain, no gradient. */
const PAPER = "#e2ddd0";
const PAPER_GRAIN = `url("data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'>
    <filter id='n' x='0' y='0' width='100%' height='100%'>
      <feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/>
      <feColorMatrix values='0 0 0 0 0.32  0 0 0 0 0.28  0 0 0 0 0.22  0.9 0 0 0 -0.28'/>
    </filter>
    <rect width='100%' height='100%' filter='url(#n)'/>
  </svg>`,
)}")`;

const LINER_PATTERN = `url("data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='132' height='52' viewBox='0 0 132 52'>
    <text x='8' y='32' font-family='ui-sans-serif,system-ui,sans-serif' font-size='12' font-weight='700' letter-spacing='3' fill='rgba(80,80,80,0.28)'>NETKRAF</text>
  </svg>`,
)}")`;

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

function peelFromGrab(gx: number, gy: number): PeelOrigin {
  if (Math.abs(gx) > 0.4 && Math.abs(gy) > 0.4) {
    const corner: PeelCorner =
      gy < 0 ? (gx < 0 ? "tl" : "tr") : gx < 0 ? "bl" : "br";
    return { kind: "corner", corner };
  }
  if (Math.abs(gx) >= Math.abs(gy)) {
    return { kind: "edge", edge: gx >= 0 ? "right" : "left" };
  }
  return { kind: "edge", edge: gy >= 0 ? "bottom" : "top" };
}

/**
 * Free-direction peel: crease starts at the grab and advances along the
 * pointer vector, so the flap follows finger/mouse instead of locking to
 * one axis after the first pixel of drag.
 */
function freeGeometry(
  cx: number,
  cy: number,
  nx: number,
  ny: number,
  w: number,
  h: number,
): Geo {
  let maxD = 0;
  for (const [x, y] of [
    [0, 0],
    [w, 0],
    [w, h],
    [0, h],
  ] as const) {
    const d = (x - cx) * nx + (y - cy) * ny;
    if (d > maxD) maxD = d;
  }
  return { cx, cy, nx, ny, len: Math.max(maxD, 1) };
}

/** Min drag distance before the free direction locks onto the pointer vector. */
const DIR_ARM = 6;

/* ------------------------------------------------------------------ */
/* Unified peel geometry (edges and corners share the same model).     */
/*                                                                     */
/*   C   = point where the peel starts (px)                            */
/*   n   = unit vector pointing from C into the sticker                */
/*   d   = dot(point - C, n)                                           */
/*   t   = peel distance; fold line is the set d === t                 */
/*   flap = d <= t   (peeled part)      front = d >= t   (still stuck) */
/* ------------------------------------------------------------------ */

type Geo = { cx: number; cy: number; nx: number; ny: number; len: number };

function geometry(o: PeelOrigin, w: number, h: number): Geo {
  if (o.kind === "edge") {
    switch (o.edge) {
      case "right":
        return { cx: w, cy: 0, nx: -1, ny: 0, len: w };
      case "left":
        return { cx: 0, cy: 0, nx: 1, ny: 0, len: w };
      case "bottom":
        return { cx: 0, cy: h, nx: 0, ny: -1, len: h };
      case "top":
        return { cx: 0, cy: 0, nx: 0, ny: 1, len: h };
    }
  }
  const k = Math.SQRT1_2;
  let cx = 0;
  let cy = 0;
  let nx = k;
  let ny = k;
  switch (o.corner) {
    case "tr":
      cx = w;
      cy = 0;
      nx = -k;
      ny = k;
      break;
    case "tl":
      cx = 0;
      cy = 0;
      nx = k;
      ny = k;
      break;
    case "br":
      cx = w;
      cy = h;
      nx = -k;
      ny = -k;
      break;
    case "bl":
      cx = 0;
      cy = h;
      nx = k;
      ny = -k;
      break;
  }
  // Extent of the rectangle along n, so p=1 means "fully peeled".
  return { cx, cy, nx, ny, len: w * Math.abs(nx) + h * Math.abs(ny) };
}

/** Clip the rectangle to a half-plane; side=+1 keeps d>=t, side=-1 keeps d<=t. */
function clipRect(w: number, h: number, g: Geo, t: number, side: 1 | -1) {
  const pts: [number, number][] = [
    [0, 0],
    [w, 0],
    [w, h],
    [0, h],
  ];
  const f = (x: number, y: number) =>
    side * ((x - g.cx) * g.nx + (y - g.cy) * g.ny - t);
  const out: [number, number][] = [];
  for (let i = 0; i < 4; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % 4];
    const fa = f(a[0], a[1]);
    const fb = f(b[0], b[1]);
    if (fa >= 0) out.push(a);
    if (fa >= 0 !== fb >= 0) {
      const k = fa / (fa - fb);
      out.push([a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k]);
    }
  }
  return out;
}

function toPolygon(pts: [number, number][], w: number, h: number) {
  if (pts.length < 3) return "polygon(0% 0%, 0% 0%, 0% 0%)";
  return `polygon(${pts
    .map(
      ([x, y]) =>
        `${((x / w) * 100).toFixed(3)}% ${((y / h) * 100).toFixed(3)}%`,
    )
    .join(", ")})`;
}

/**
 * Point on the fold line nearest to the grab point (px, py).
 * Used as the 3D pivot so the flap hinges right where the user grabbed.
 */
function foldPivot(g: Geo, px: number, py: number, t: number) {
  const k = (px - g.cx) * g.nx + (py - g.cy) * g.ny - t;
  return { x: px - g.nx * k, y: py - g.ny * k };
}

/** Cream release liner with tiling brand text that always covers the full area. */
function ReleaseLiner() {
  return (
    <div className="absolute inset-0 overflow-hidden bg-[#f3f1e8]">
      <div
        aria-hidden
        className="absolute"
        style={{
          inset: "-80%",
          width: "260%",
          height: "260%",
          backgroundImage: `${LINER_PATTERN}, repeating-linear-gradient(135deg, rgba(0,0,0,0.035) 0 2px, transparent 2px 8px)`,
          backgroundSize: "132px 52px, auto",
          backgroundRepeat: "repeat",
          transform: "rotate(-28deg)",
        }}
      />
    </div>
  );
}

export function FloatingSticker({
  src,
  holo,
  displayPx,
  appearKey,
  className,
  onFullyPeeled,
}: Props) {
  const hitRef = useRef<HTMLDivElement>(null);
  const visualRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const [aspect, setAspect] = useState(1);
  const originRef = useRef<PeelOrigin>({ kind: "edge", edge: "right" });
  /** Grab point, normalized 0..1 so it survives size changes. */
  const grabRef = useRef({ x: 0.5, y: 0.5 });
  /** Guards place-on-wall so it only fires once per peel. */
  const placedRef = useRef(false);
  const onFullyPeeledRef = useRef(onFullyPeeled);
  const settleAnim = useRef<AnimationPlaybackControls | null>(null);
  const drag = useRef<{
    id: number;
    /** Grab in sticker px — crease origin follows this point. */
    cx: number;
    cy: number;
    /** Seed normal until the pointer has moved enough to set a free direction. */
    seedNx: number;
    seedNy: number;
    x: number;
    y: number;
    w: number;
    h: number;
    lastX: number;
    lastY: number;
    lastT: number;
  } | null>(null);
  /** Live free-peel geometry while dragging (overrides discrete edge/corner). */
  const freeGeoRef = useRef<Geo | null>(null);

  const width = aspect >= 1 ? displayPx : displayPx * aspect;
  const height = aspect >= 1 ? displayPx / aspect : displayPx;

  // Latest size, read lazily by the transforms below.
  const sizeRef = useRef({ w: width, h: height });

  useEffect(() => {
    onFullyPeeledRef.current = onFullyPeeled;
  });

  useEffect(() => {
    sizeRef.current = { w: width, h: height };
  });

  /** Peel progress 0..1 — set live while dragging, animated on release. */
  const peel = useMotionValue(0);
  const hoverXT = useMotionValue(0);
  const hoverYT = useMotionValue(0);
  const glossXT = useMotionValue(30);
  const glossYT = useMotionValue(20);
  const glossOT = useMotionValue(0);

  const hoverX = useSpring(hoverXT, TILT_SPRING);
  const hoverY = useSpring(hoverYT, TILT_SPRING);
  const glossX = useSpring(glossXT, TILT_SPRING);
  const glossY = useSpring(glossYT, TILT_SPRING);
  const glossOpacity = useSpring(glossOT, TILT_SPRING);

  function frame(p: number) {
    const { w, h } = sizeRef.current;
    const g =
      freeGeoRef.current ?? geometry(originRef.current, w, h);
    const t = p * g.len;
    const gp = grabRef.current;
    const pv = foldPivot(g, gp.x * w, gp.y * h, t);
    return { w, h, g, t, pv };
  }

  // Front still stuck: d >= t, cut exactly on the crease so no image shows
  // beside the paper.
  const frontClip = useTransform(peel, (p) => {
    const { w, h, g, t } = frame(p);
    if (p < 0.002) return "none";
    return toPolygon(clipRect(w, h, g, t, 1), w, h);
  });
  // Flap: d <= t + FLAP_OVERLAP. The paper reaches slightly over the image
  // side so the seam is always covered.
  const flapClip = useTransform(peel, (p) => {
    const { w, h, g, t } = frame(p);
    if (p < 0.002) return "polygon(0% 0%, 0% 0%, 0% 0%)";
    return toPolygon(clipRect(w, h, g, t + FLAP_OVERLAP, -1), w, h);
  });

  // Pivot sits on the crease, as close as possible to where the user grabbed.
  const flapOrigin = useTransform(peel, (p) => {
    const { pv } = frame(p);
    return `${pv.x.toFixed(2)}px ${pv.y.toFixed(2)}px`;
  });

  // Rotate around the crease — ramp by absolute peel distance so edges and
  // corners flip after similar finger travel regardless of peel length.
  const flapTransform = useTransform(peel, (p) => {
    const { w, h, g } = frame(p);
    const rampPx = Math.min(w, h) * FOLD_RAMP;
    const r = Math.min(1, (p * g.len) / Math.max(rampPx, 1));
    const a = FOLD_MAX * (1 - (1 - r) * (1 - r));
    const phi = (Math.atan2(g.ny, g.nx) * 180) / Math.PI;
    const persp = Math.round(Math.max(w, h) * PERSPECTIVE_FACTOR);
    return `perspective(${persp}px) rotate(${phi.toFixed(3)}deg) rotateY(${a.toFixed(
      2,
    )}deg) rotate(${(-phi).toFixed(3)}deg)`;
  });

  const flapOpacity = useTransform(peel, [0, 0.02, 1], [0, 1, 1]);
  const linerOpacity = useTransform(peel, [0, 0.02, 1], [0.06, 0.95, 1]);

  const shadowOpacity = useTransform(peel, [0, 0.1, 1], [0.16, 0.2, 0.1]);
  const shadowBlur = useTransform(peel, [0, 1], [16, 26]);
  const shadowFilter = useMotionTemplate`brightness(0) blur(${shadowBlur}px)`;
  const shadowShift = useTransform(peel, (p) => {
    const { g } = frame(p);
    const d = 8 + p * 16;
    return `translate3d(${(-g.nx * d).toFixed(2)}px, ${(
      -g.ny * d +
      4 +
      p * 6
    ).toFixed(2)}px, 0)`;
  });

  const hoverTilt = useMotionTemplate`perspective(1100px) rotateX(${hoverY}deg) rotateY(${hoverX}deg)`;
  const gloss = useMotionTemplate`radial-gradient(circle at ${glossX}% ${glossY}%, rgba(255,255,255,0.7), rgba(255,255,255,0) 55%)`;
  const holoX = useTransform(hoverX, (v) => 50 + v * 2.4);
  const holoY = useTransform(hoverY, (v) => 50 - v * 2.4);
  const holoPosition = useMotionTemplate`${holoX}% ${holoY}%`;

  // Same silhouette mask for every layer. no-repeat + centered stops the
  // mask tiling/bleeding at the edges, which showed up as gaps.
  const mask = {
    WebkitMaskImage: `url(${src})`,
    maskImage: `url(${src})`,
    WebkitMaskSize: "100% 100%",
    maskSize: "100% 100%",
    WebkitMaskRepeat: "no-repeat",
    maskRepeat: "no-repeat",
    WebkitMaskPosition: "center",
    maskPosition: "center",
  } as const;

  function visualRect() {
    // Prefer the real visual box so pad/DPR/transform never desync grab → crease.
    const el = visualRef.current ?? hitRef.current;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return {
      left: r.left,
      top: r.top,
      width: Math.max(1, r.width),
      height: Math.max(1, r.height),
    };
  }

  function pointerInSticker(clientX: number, clientY: number) {
    const r = visualRect();
    if (!r) return { x: 0.5, y: 0.5, px: 0, py: 0, w: 1, h: 1 };
    const px = clamp(clientX - r.left, 0, r.width);
    const py = clamp(clientY - r.top, 0, r.height);
    return {
      x: px / r.width,
      y: py / r.height,
      px,
      py,
      w: r.width,
      h: r.height,
    };
  }

  function normalized(e: React.PointerEvent) {
    const p = pointerInSticker(e.clientX, e.clientY);
    return {
      nx: clamp(p.x * 2 - 1, -1, 1),
      ny: clamp(p.y * 2 - 1, -1, 1),
    };
  }

  function restHover(hovering: boolean) {
    hoverXT.set(0);
    hoverYT.set(0);
    glossOT.set(hovering ? 0.3 : 0);
  }

  function stopSettle() {
    settleAnim.current?.stop();
    settleAnim.current = null;
  }

  function settleTo(target: 0 | 1, then?: () => void) {
    stopSettle();
    settleAnim.current = animate(peel, target, {
      ...SETTLE_SPRING,
      restDelta: 0.001,
      restSpeed: 0.01,
      onComplete: () => {
        settleAnim.current = null;
        // Springs can stop a hair short — pin exact rest so clips fully clear.
        peel.set(target);
        then?.();
      },
    });
  }

  function clearDrag(e?: {
    pointerId: number;
    currentTarget: EventTarget & Element;
  }) {
    const d = drag.current;
    if (!d) return false;
    drag.current = null;
    if (e && e.currentTarget.hasPointerCapture?.(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    return true;
  }

  function applyFreePeel(
    d: NonNullable<typeof drag.current>,
    clientX: number,
    clientY: number,
  ) {
    const dx = clientX - d.x;
    const dy = clientY - d.y;
    const dist = Math.hypot(dx, dy);

    // Follow the pointer once it has moved enough; seed is only the start.
    let nx = d.seedNx;
    let ny = d.seedNy;
    if (dist >= DIR_ARM) {
      nx = dx / dist;
      ny = dy / dist;
      // Keep peeling into the sticker — outward drags would invert the flap.
      if (nx * d.seedNx + ny * d.seedNy < 0) {
        nx = d.seedNx;
        ny = d.seedNy;
      }
    }

    const g = freeGeometry(d.cx, d.cy, nx, ny, d.w, d.h);
    freeGeoRef.current = g;

    const raw = clamp((dist * PEEL_GAIN) / g.len, 0, 1);
    peel.set(Math.pow(raw, DRAG_CURVE));
    d.lastX = clientX;
    d.lastY = clientY;
    d.lastT = performance.now();
  }

  function onPointerMove(e: React.PointerEvent) {
    const d = drag.current;
    if (d) {
      if (e.pointerId !== d.id) return;
      applyFreePeel(d, e.clientX, e.clientY);
      return;
    }
    if (e.pointerType !== "mouse") return;
    const { nx, ny } = normalized(e);
    hoverXT.set(nx * 7);
    hoverYT.set(-ny * 7);
    glossXT.set(50 + nx * 40);
    glossYT.set(50 + ny * 40);
    glossOT.set(0.4);
  }

  function onPointerDown(e: React.PointerEvent) {
    if (drag.current || placedRef.current) return;
    // Only the first pointer peels — a second thumb must not steal the drag.
    if (e.pointerType !== "mouse" && !e.isPrimary) return;
    const live = pointerInSticker(e.clientX, e.clientY);
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    stopSettle();
    freeGeoRef.current = null;
    // Drop the hover tilt on grab so the pointer and the crease line up 1:1.
    hoverXT.set(0);
    hoverYT.set(0);
    const nx = clamp(live.x * 2 - 1, -1, 1);
    const ny = clamp(live.y * 2 - 1, -1, 1);
    const next = peelFromGrab(nx, ny);
    originRef.current = next;
    grabRef.current = { x: live.x, y: live.y };
    const seed = geometry(next, live.w, live.h);
    const now = performance.now();
    drag.current = {
      id: e.pointerId,
      // Crease origin = grab; peel direction follows the pointer after DIR_ARM.
      cx: live.px,
      cy: live.py,
      seedNx: seed.nx,
      seedNy: seed.ny,
      x: e.clientX,
      y: e.clientY,
      w: live.w,
      h: live.h,
      lastX: e.clientX,
      lastY: e.clientY,
      lastT: now,
    };
    freeGeoRef.current = freeGeometry(
      live.px,
      live.py,
      seed.nx,
      seed.ny,
      live.w,
      live.h,
    );
    peel.set(0.02);
    glossOT.set(0.55);
  }

  function endDrag(e: React.PointerEvent) {
    const d = drag.current;
    if (!d) return;
    // lostpointercapture / mismatched ids still must release the drag.
    if (e.type !== "lostpointercapture" && e.pointerId !== d.id) return;

    // Momentum: a quick flick finishes the peel even below the distance threshold.
    const elapsed = Math.max(1, performance.now() - d.lastT);
    const recentDist = Math.hypot(e.clientX - d.lastX, e.clientY - d.lastY);
    const recentVel = recentDist / elapsed;

    clearDrag(e);
    if (placedRef.current) return;
    const p = peel.get();
    const hovering = e.pointerType === "mouse" && e.type === "pointerup";
    if (p >= PEEL_THRESHOLD || (recentVel > 0.11 && p > 0.18)) {
      placedRef.current = true;
      restHover(false);
      // Keep freeGeoRef after settle so the fold axis doesn’t jump at rest.
      settleTo(1, () => onFullyPeeledRef.current?.());
    } else {
      restHover(hovering);
      settleTo(0, () => {
        freeGeoRef.current = null;
      });
    }
  }

  return (
    <motion.div
      key={appearKey}
      className={cn("sticker-float relative shrink-0", className)}
      initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.9, rotate: -4 }}
      animate={{ opacity: 1, scale: 1, rotate: 0, width, height }}
      transition={{
        opacity: { type: "spring", duration: 0.55, bounce: 0.3 },
        scale: { type: "spring", duration: 0.55, bounce: 0.3 },
        rotate: { type: "spring", duration: 0.55, bounce: 0.3 },
        width: { duration: 0.08, ease: "linear" },
        height: { duration: 0.08, ease: "linear" },
      }}
      style={{ width, height }}
    >
      <div
        ref={hitRef}
        className="absolute touch-none select-none"
        onPointerMove={onPointerMove}
        onPointerDown={onPointerDown}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onLostPointerCapture={endDrag}
        onPointerLeave={() => {
          if (!drag.current) restHover(false);
        }}
        style={{
          cursor: "grab",
          top: -HIT_PAD,
          right: -HIT_PAD,
          bottom: -HIT_PAD,
          left: -HIT_PAD,
        }}
      >
        {/* Visual sticker sits in the unpadded core; hit pad is only for grab. */}
        <div
          ref={visualRef}
          className="absolute"
          style={{
            top: HIT_PAD,
            right: HIT_PAD,
            bottom: HIT_PAD,
            left: HIT_PAD,
          }}
        >
          {/* One shared tilt wrapper: liner, shadow, front and flap all tilt
              together, so the peel stays aligned with the sticker. */}
          <motion.div
            className="absolute inset-0 will-change-transform"
            style={{ transform: hoverTilt }}
          >
            {/* Release liner — full-size, masked to silhouette. */}
            <motion.div
              aria-hidden
              className="pointer-events-none absolute inset-0 overflow-hidden"
              style={{ opacity: linerOpacity, ...mask }}
            >
              <ReleaseLiner />
            </motion.div>

            <motion.img
              src={src}
              alt=""
              aria-hidden
              draggable={false}
              className="pointer-events-none absolute inset-0 size-full"
              style={{
                transform: shadowShift,
                opacity: shadowOpacity,
                filter: shadowFilter,
              }}
            />

            {/* Vinyl front — clipped to the region still stuck. */}
            <motion.div
              className="relative size-full will-change-transform"
              style={{
                clipPath: frontClip,
                WebkitClipPath: frontClip,
              }}
            >
              <img
                src={src}
                alt="Sticker preview"
                draggable={false}
                onLoad={(e) => {
                  const { naturalWidth: w, naturalHeight: h } = e.currentTarget;
                  if (w && h) setAspect(w / h);
                }}
                className="pointer-events-none block size-full object-contain drop-shadow-[0_1px_1px_rgba(0,0,0,0.08)]"
              />
              {holo ? (
                <motion.div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 opacity-60 mix-blend-color-dodge"
                  style={{
                    ...mask,
                    backgroundImage:
                      "linear-gradient(115deg, transparent 22%, rgba(255,110,220,0.6) 36%, rgba(110,220,255,0.6) 47%, rgba(255,245,140,0.55) 58%, transparent 74%)",
                    backgroundSize: "300% 300%",
                    backgroundPosition: holoPosition,
                  }}
                />
              ) : null}
              <motion.div
                aria-hidden
                className="pointer-events-none absolute inset-0 mix-blend-overlay"
                style={{
                  ...mask,
                  backgroundImage: gloss,
                  opacity: glossOpacity,
                }}
              />
            </motion.div>

            {/*
            Peeled flap — double-sided paper. The clip is applied on this
            wrapper (in un-rotated space); the silhouette mask is applied per
            face, at exactly 100% size with no scaling, so the paper edge
            matches the artwork edge and never pokes out or leaves a gap.
          */}
            <motion.div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                transformOrigin: flapOrigin,
                transform: flapTransform,
                opacity: flapOpacity,
                transformStyle: "preserve-3d",
                clipPath: flapClip,
                WebkitClipPath: flapClip,
              }}
            >
              {/* Outward face (early peel) */}
              <div
                className="absolute inset-0"
                style={{
                  ...mask,
                  backgroundColor: PAPER,
                  backgroundImage: PAPER_GRAIN,
                  backgroundSize: "160px 160px",
                  backfaceVisibility: "hidden",
                  WebkitBackfaceVisibility: "hidden",
                }}
              />
              {/* Inward face (late peel, toward camera past 90°) */}
              <div
                className="absolute inset-0"
                style={{
                  ...mask,
                  backgroundColor: PAPER,
                  backgroundImage: PAPER_GRAIN,
                  backgroundSize: "160px 160px",
                  transform: "rotateY(180deg)",
                  backfaceVisibility: "hidden",
                  WebkitBackfaceVisibility: "hidden",
                }}
              />
            </motion.div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
