"use client";

// Adapted from React Bits "StatusMark" (Micro category) by David Haz. Licence: ./LICENSE.md.
// Changes for StandByDev: no hard-coded green or red; done and error colours come from the
// caller (our tokens), and the strike-through label variant is dropped.

import { animate, useMotionValue, useReducedMotion } from "motion/react";
import { useEffect, useLayoutEffect, useRef, type CSSProperties } from "react";

export type StatusMarkStatus = "pending" | "running" | "done" | "failed";

const UI = { type: "spring" as const, duration: 0.3, bounce: 0 };
const MORPH = { duration: 0.3, ease: [0.77, 0, 0.175, 1] as [number, number, number, number] };
const CHECK = "M7.5 12.25 10.5 15.25 16.75 8.75";
const CROSS = "M8.5 8.5 15.5 15.5M15.5 8.5 8.5 15.5";
const SPOKEN: Record<StatusMarkStatus, string> = {
  pending: "Pending",
  running: "In progress",
  done: "Done",
  failed: "Failed",
};
const IDLE_DASH = 0.3;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export function StatusMark({
  status = "pending",
  progress,
  color = "currentColor",
  doneColor = "currentColor",
  errorColor = "var(--signature-coral)",
  size = 20,
  strokeWidth = 2,
  dashes = 8,
  spinDuration = 1100,
  arcLength = 0.68,
  fillOpacity = 0.12,
  label,
  className = "",
  style,
}: {
  status?: StatusMarkStatus;
  /** 0..1 while running draws a determinate ring; omit it for a spinner. */
  progress?: number;
  color?: string;
  doneColor?: string;
  errorColor?: string;
  size?: number;
  strokeWidth?: number;
  dashes?: number;
  spinDuration?: number;
  arcLength?: number;
  fillOpacity?: number;
  /** Accessible name. Defaults to the status in words. */
  label?: string;
  className?: string;
  style?: CSSProperties;
}) {
  const reduce = useReducedMotion();
  const r = 10 - strokeWidth / 2;
  const C = 2 * Math.PI * r;
  const P = C / Math.max(1, dashes);
  const determinate = status === "running" && typeof progress === "number" && Number.isFinite(progress);
  const indeterminate = status === "running" && !determinate;
  const solid = status === "running" || status === "done" || status === "failed";
  const targetArc = indeterminate ? arcLength : determinate ? clamp01(progress as number) : 1;

  const mode = useMotionValue(solid ? 1 : 0);
  const arc = useMotionValue(targetArc);
  const travel = useMotionValue(0);
  const ringRef = useRef<SVGCircleElement>(null);
  const geo = useRef({ C, P });
  const gen = useRef(0);

  useLayoutEffect(() => {
    geo.current = { C, P };
  });

  useEffect(() => {
    const writeDash = () => {
      const g = geo.current;
      const m = mode.get();
      const a = arc.get();
      const dash = IDLE_DASH * g.P + (a * g.C - IDLE_DASH * g.P) * m;
      const gap = (1 - IDLE_DASH) * g.P + ((1 - a) * g.C - (1 - IDLE_DASH) * g.P) * m;
      ringRef.current?.setAttribute("stroke-dasharray", `${Math.max(0, dash)} ${Math.max(0, gap)}`);
    };
    writeDash();
    ringRef.current?.setAttribute("stroke-dashoffset", String(travel.get()));
    const offs = [
      mode.on("change", writeDash),
      arc.on("change", writeDash),
      travel.on("change", (v: number) => ringRef.current?.setAttribute("stroke-dashoffset", String(v))),
    ];
    return () => {
      offs.forEach((off) => off());
      mode.stop();
      arc.stop();
      travel.stop();
    };
  }, [mode, arc, travel, C, P]);

  useEffect(() => {
    const g = ++gen.current;
    if (reduce) {
      mode.jump(solid ? 1 : 0);
      arc.jump(targetArc);
      travel.jump(0);
      return;
    }
    if (mode.get() === 0) arc.jump(targetArc);
    animate(mode, solid ? 1 : 0, MORPH);
    animate(arc, targetArc, UI);
    if (indeterminate) {
      const t0 = travel.get();
      const spin = animate(travel, [t0, t0 - C], { duration: spinDuration / 1000, ease: "linear", repeat: Infinity });
      return () => spin.stop();
    }
    const unit = determinate ? C : P;
    const to = Math.floor(travel.get() / unit) * unit;
    animate(travel, to, UI).then(() => {
      if (gen.current === g) travel.jump(0);
    });
  }, [status, solid, indeterminate, determinate, targetArc, reduce, C, P, spinDuration, mode, arc, travel]);

  const spoken = label ?? SPOKEN[status] + (determinate ? `, ${Math.round(clamp01(progress as number) * 100)}%` : "");

  return (
    <span
      className={`group relative inline-flex shrink-0 items-center align-middle leading-none ${className}`}
      data-status={status}
      style={
        {
          "--sm-stroke": strokeWidth,
          "--sm-color": color,
          "--sm-done": doneColor,
          "--sm-error": errorColor,
          "--sm-fill": fillOpacity,
          ...style,
        } as CSSProperties
      }
    >
      <svg
        className="shrink-0 overflow-visible text-(--sm-color) transition-colors duration-200 group-data-[status=done]:text-(--sm-done) group-data-[status=failed]:text-(--sm-error)"
        viewBox="0 0 24 24"
        width={size}
        height={size}
        role="img"
        aria-label={spoken}
      >
        <circle
          className="fill-current stroke-current [stroke-width:var(--sm-stroke)] [fill-opacity:0] [stroke-opacity:0] [transition:fill-opacity_180ms_ease,stroke-opacity_200ms_ease] group-data-[status=running]:[stroke-opacity:0.2] group-data-[status=done]:[fill-opacity:var(--sm-fill)] group-data-[status=failed]:[fill-opacity:var(--sm-fill)]"
          cx="12"
          cy="12"
          r={r}
          transform="rotate(-90 12 12)"
        />
        <circle
          ref={ringRef}
          className="fill-none stroke-current [stroke-width:var(--sm-stroke)] [stroke-linecap:round] opacity-55 transition-opacity duration-200 group-data-[status=running]:opacity-100 group-data-[status=done]:opacity-100 group-data-[status=failed]:opacity-100"
          cx="12"
          cy="12"
          r={r}
          transform="rotate(-90 12 12)"
        />
        <path
          className="fill-none stroke-current [stroke-width:var(--sm-stroke)] [stroke-linecap:round] [stroke-linejoin:round] [stroke-dasharray:1_2] [stroke-dashoffset:1.05] opacity-0 [transition:stroke-dashoffset_160ms_cubic-bezier(0.23,1,0.32,1),opacity_0ms_linear_160ms] group-data-[status=done]:[stroke-dashoffset:0] group-data-[status=done]:opacity-100 group-data-[status=done]:[transition:stroke-dashoffset_240ms_cubic-bezier(0.23,1,0.32,1)_120ms,opacity_0ms_linear_120ms] motion-reduce:[stroke-dashoffset:0] motion-reduce:[transition:opacity_200ms_ease]"
          d={CHECK}
          pathLength="1"
        />
        <path
          className="fill-none stroke-current [stroke-width:var(--sm-stroke)] [stroke-linecap:round] [stroke-linejoin:round] [stroke-dasharray:1_2] [stroke-dashoffset:1.05] opacity-0 [transition:stroke-dashoffset_160ms_cubic-bezier(0.23,1,0.32,1),opacity_0ms_linear_160ms] group-data-[status=failed]:[stroke-dashoffset:0] group-data-[status=failed]:opacity-100 group-data-[status=failed]:[transition:stroke-dashoffset_240ms_cubic-bezier(0.23,1,0.32,1)_120ms,opacity_0ms_linear_120ms] motion-reduce:[stroke-dashoffset:0] motion-reduce:[transition:opacity_200ms_ease]"
          d={CROSS}
          pathLength="1"
        />
      </svg>
    </span>
  );
}
