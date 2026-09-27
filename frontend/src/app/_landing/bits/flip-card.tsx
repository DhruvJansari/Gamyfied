"use client";

// Adapted from React Bits "FlipCard" (Micro category) by David Haz. Licence: ./LICENSE.md.
// Changes for StandByDev: colours default to our tokens instead of hex, the width may be any
// CSS length (the card is fluid on phones) and the drag span is measured from the element,
// and the unused axis/shadow knobs are trimmed.

import {
  animate,
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  type AnimationPlaybackControls,
  type MotionStyle,
} from "motion/react";
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
} from "react";

type Grip = { id: number; x: number; base: number; moved: boolean; slop: number; span: number; hist: { t: number; v: number }[] };

const SLOP = { fine: 4, coarse: 8 };
const TILT_SPRING = { stiffness: 240, damping: 24, mass: 0.6 };
const LIFT_SPRING = { stiffness: 320, damping: 26 };
const FLING = 0.16;
const HISTORY_MS = 90;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const snap = (deg: number) => Math.round(deg / 180) * 180;
const isBack = (deg: number) => Math.abs(Math.round(deg / 180)) % 2 === 1;

const GLARE =
  "radial-gradient(circle farthest-side at var(--fc-gx,50%) var(--fc-gy,50%), rgba(255,255,255,var(--fc-glare)) 0%, rgba(255,255,255,calc(var(--fc-glare)*0.5)) 26%, rgba(255,255,255,calc(var(--fc-glare)*0.12)) 60%, rgba(255,255,255,0) 100%)";

export function FlipCard({
  front,
  back,
  onFlipChange,
  tiltMax = 10,
  glareOpacity = 0.18,
  hoverScale = 1.02,
  perspective = 1200,
  stiffness = 170,
  damping = 20,
  width = "360px",
  height = 480,
  radius = 24,
  background = "var(--signature-navy)",
  color = "var(--on-dark)",
  shadowColor = "var(--signature-navy)",
  shadowOpacity = 0.5,
  ariaLabel = "Flip card",
  className = "",
}: {
  front: ReactNode;
  back: ReactNode;
  onFlipChange?: (flipped: boolean) => void;
  tiltMax?: number;
  glareOpacity?: number;
  hoverScale?: number;
  perspective?: number;
  stiffness?: number;
  damping?: number;
  width?: string;
  height?: number;
  radius?: number;
  background?: string;
  color?: string;
  shadowColor?: string;
  shadowOpacity?: number;
  ariaLabel?: string;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(false);
  const shownRef = useRef(false);
  const [dragging, setDragging] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const grip = useRef<Grip | null>(null);
  const spin = useRef<AnimationPlaybackControls | null>(null);

  const turn = useMotionValue(0);
  const tiltX = useSpring(0, TILT_SPRING);
  const tiltY = useSpring(0, TILT_SPRING);
  const lift = useSpring(1, LIFT_SPRING);
  const sheen = useSpring(0, LIFT_SPRING);
  const gx = useMotionValue(50);
  const gy = useMotionValue(50);

  const sumY = useTransform([turn, tiltY], ([t, y]: number[]) => t + y);
  const transform = useMotionTemplate`perspective(${perspective}px) scale(${lift}) rotateX(${tiltX}deg) rotateY(${sumY}deg)`;
  const facing = useTransform(turn, (t) => Math.abs(Math.cos((t * Math.PI) / 180)));
  const spread = useTransform(facing, (f) => 0.08 + 0.92 * f);
  const shade = useTransform(facing, (f) => 0.1 + 0.9 * f * f);
  const gxPct = useMotionTemplate`${gx}%`;
  const gyPct = useMotionTemplate`${gy}%`;

  useEffect(() => () => spin.current?.stop(), []);

  function settle(to: number, velocity: number, instant: boolean) {
    spin.current?.stop();
    if (instant || reduce) turn.jump(to);
    else spin.current = animate(turn, to, { type: "spring", stiffness, damping, velocity, restDelta: 0.05 });
    const next = isBack(to);
    if (next === shownRef.current) return;
    shownRef.current = next;
    setShown(next);
    onFlipChange?.(next);
  }
  function flip(instant: boolean) {
    const base = snap(turn.get());
    settle(isBack(base) ? base - 180 : base + 180, 0, instant);
  }
  function rest() {
    tiltX.set(0);
    tiltY.set(0);
    sheen.set(0);
    lift.set(1);
  }

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    if (e.button !== 0 || grip.current) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Capture is a nicety; without it the drag still ends on pointerup over the card.
    }
    spin.current?.stop();
    grip.current = {
      id: e.pointerId,
      x: e.clientX,
      base: turn.get(),
      moved: false,
      slop: e.pointerType === "touch" ? SLOP.coarse : SLOP.fine,
      span: e.currentTarget.getBoundingClientRect().width || 360,
      hist: [],
    };
    if (!reduce) lift.set(hoverScale);
  }
  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    const g = grip.current;
    if (g && g.id === e.pointerId) {
      const d = e.clientX - g.x;
      if (!g.moved) {
        if (Math.abs(d) < g.slop || reduce) return;
        g.moved = true;
        setDragging(true);
        tiltX.set(0);
        tiltY.set(0);
        sheen.set(0);
      }
      const deg = g.base + (d / g.span) * 180;
      turn.set(deg);
      const now = performance.now();
      g.hist.push({ t: now, v: deg });
      while (g.hist.length > 2 && now - g.hist[0]!.t > HISTORY_MS) g.hist.shift();
      return;
    }
    if (reduce || e.pointerType === "touch") return;
    const r = e.currentTarget.getBoundingClientRect();
    const px = clamp((e.clientX - r.left) / r.width, 0, 1);
    const py = clamp((e.clientY - r.top) / r.height, 0, 1);
    tiltX.set((0.5 - py) * 2 * tiltMax);
    tiltY.set((px - 0.5) * 2 * tiltMax);
    gx.set(px * 100);
    gy.set(py * 100);
    sheen.set(1);
  }
  function release(e: PointerEvent<HTMLDivElement>, cancelled: boolean) {
    const g = grip.current;
    if (!g || g.id !== e.pointerId) return;
    grip.current = null;
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Already released by the browser; nothing to undo.
    }
    setDragging(false);
    if (e.pointerType === "touch" || !rootRef.current?.matches(":hover")) rest();
    if (!g.moved) {
      if (!cancelled) flip(false);
      else settle(snap(turn.get()), 0, false);
      return;
    }
    const here = turn.get();
    let velocity = 0;
    const a = g.hist[0];
    const b = g.hist[g.hist.length - 1];
    if (!cancelled && a && b && b.t > a.t && performance.now() - b.t < 60) velocity = ((b.v - a.v) / (b.t - a.t)) * 1000;
    const to = cancelled ? snap(g.base) : clamp(snap(here + velocity * FLING), snap(here) - 180, snap(here) + 180);
    settle(to, velocity, false);
  }
  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    if (!e.repeat) flip(true);
  }
  function onClick(e: MouseEvent<HTMLDivElement>) {
    // detail 0 = a click synthesised by assistive tech rather than a pointer.
    if (e.detail === 0) flip(true);
  }

  const face =
    "absolute inset-0 overflow-hidden rounded-(--fc-radius) bg-(--fc-bg) text-(--fc-ink) [backface-visibility:hidden] [-webkit-backface-visibility:hidden] group-data-[fade]:opacity-0 group-data-[fade]:[backface-visibility:visible] group-data-[fade]:[transition:opacity_200ms_ease]";

  return (
    <div
      ref={rootRef}
      role="button"
      tabIndex={0}
      aria-pressed={shown}
      aria-label={ariaLabel}
      className={`group relative inline-block max-w-full cursor-grab touch-pan-y select-none outline-none w-(--fc-w) h-(--fc-h) rounded-(--fc-radius) [-webkit-tap-highlight-color:transparent] focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-4 focus-visible:ring-offset-page data-dragging:cursor-grabbing ${className}`}
      data-dragging={dragging ? "" : undefined}
      data-fade={reduce ? (shown ? "back" : "front") : undefined}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={(e) => release(e, false)}
      onPointerCancel={(e) => release(e, true)}
      onLostPointerCapture={(e) => release(e, true)}
      onPointerEnter={(e) => {
        if (!reduce && e.pointerType !== "touch") lift.set(hoverScale);
      }}
      onPointerLeave={() => {
        if (!grip.current) rest();
      }}
      onKeyDown={onKeyDown}
      onClick={onClick}
      onDragStart={(e) => e.preventDefault()}
      style={
        {
          "--fc-w": width,
          "--fc-h": `${height}px`,
          "--fc-radius": `${radius}px`,
          "--fc-bg": background,
          "--fc-ink": color,
          "--fc-shadow": shadowColor,
          "--fc-shadow-o": shadowOpacity,
          "--fc-glare": glareOpacity,
        } as CSSProperties
      }
    >
      <motion.span
        aria-hidden
        className="pointer-events-none absolute inset-[14%_8%_-6%] rounded-(--fc-radius) [background:color-mix(in_srgb,var(--fc-shadow)_calc(var(--fc-shadow-o)*100%),transparent)] blur-[28px]"
        style={{ scaleX: spread, opacity: shade }}
      />
      <motion.div
        className="absolute inset-0 transform-3d"
        style={reduce ? undefined : ({ transform, "--fc-gx": gxPct, "--fc-gy": gyPct, "--fc-sheen": sheen } as MotionStyle)}
      >
        <div className={`${face} group-data-[fade=front]:opacity-100!`} aria-hidden={shown} inert={shown}>
          {front}
          <span aria-hidden className="pointer-events-none absolute inset-0 opacity-(--fc-sheen,0)" style={{ background: GLARE }} />
        </div>
        <div
          className={`${face} transform-[rotateY(180deg)] group-data-fade:transform-none! group-data-[fade=back]:opacity-100!`}
          aria-hidden={!shown}
          inert={!shown}
        >
          {back}
          <span aria-hidden className="pointer-events-none absolute inset-0 opacity-(--fc-sheen,0)" style={{ background: GLARE }} />
        </div>
      </motion.div>
    </div>
  );
}
