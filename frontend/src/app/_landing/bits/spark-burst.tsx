"use client";

// Adapted from React Bits "ClickSpark" (Animations category) by David Haz. Licence: ./LICENSE.md.
// Changes for StandByDev: fired on demand (a rank-up) instead of on every click, the frame
// loop only runs while sparks are alive, the colour is read from a CSS token, it is DPR
// aware, and it does nothing for reduced motion.

import { useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";

type Spark = { x: number; y: number; angle: number; start: number };

const easeOut = (t: number) => t * (2 - t);

/** Fills its (positioned) parent. Bump `fire` to burst at `at` (fractions of the parent box). */
export function SparkBurst({
  fire,
  at = { x: 0.5, y: 0.5 },
  colorVar = "--signature-yellow",
  count = 10,
  radius = 42,
  size = 14,
  duration = 560,
}: {
  fire: number;
  at?: { x: number; y: number };
  colorVar?: string;
  count?: number;
  radius?: number;
  size?: number;
  duration?: number;
}) {
  const reduce = useReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sparks = useRef<Spark[]>([]);
  const raf = useRef(0);

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const parent = canvas?.parentElement;
    if (!fire || reduce || !canvas || !parent) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = parent.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const color = getComputedStyle(canvas).getPropertyValue(colorVar).trim() || "currentColor";

    const now = performance.now();
    const x = at.x * rect.width;
    const y = at.y * rect.height;
    for (let i = 0; i < count; i++) sparks.current.push({ x, y, angle: (2 * Math.PI * i) / count + Math.random() * 0.2, start: now });

    const draw = (t: number) => {
      ctx.clearRect(0, 0, rect.width, rect.height);
      sparks.current = sparks.current.filter((s) => {
        const elapsed = t - s.start;
        if (elapsed >= duration) return false;
        const e = easeOut(elapsed / duration);
        const dist = e * radius;
        const len = size * (1 - e);
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.5;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(s.x + dist * Math.cos(s.angle), s.y + dist * Math.sin(s.angle));
        ctx.lineTo(s.x + (dist + len) * Math.cos(s.angle), s.y + (dist + len) * Math.sin(s.angle));
        ctx.stroke();
        return true;
      });
      raf.current = sparks.current.length ? requestAnimationFrame(draw) : 0;
    };
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(draw);
    // `at` is read at fire time only; re-running on a new object identity would re-burst.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fire]);

  return <canvas ref={canvasRef} aria-hidden className="pointer-events-none absolute inset-0 h-full w-full" />;
}
