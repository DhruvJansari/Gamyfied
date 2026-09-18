"use client";

import { useEffect, useRef } from "react";

// The strip at the top of a profile: a shallow 3D field of points that drift weightlessly and
// parallax against the cursor. Dots within reach are drawn toward the cursor, circle it a
// little, and get carried along in the direction it moves — then float back home once it
// leaves. Dots are `--ink`, tinted toward `--accent` near the cursor; the base wash is the
// banner gradient. No glow: the elevation model is colour-block first (DESIGN.md). Everything
// runs in one requestAnimationFrame loop on a canvas — React renders this component once.
//
// Rules it follows: paused while off-screen or the tab is hidden; static when the user
// prefers reduced motion; no cursor coupling for touch pointers; DPR capped at 2.

const DPR_MAX = 2;
const DENSITY = 1 / 5200; // particles per CSS px²
const COUNT_MAX = 220;
const COUNT_MIN = 40;
const CURSOR_RADIUS = 210; // px, how far the cursor's influence reaches
const CURSOR_CORE = 28; // px, inside this dots are held off so they ring the cursor, not pile on it
const CURSOR_EASE = 0.2; // lerp factor for the smoothed cursor — snappy, not laggy
const PULL = 0.55; // attraction toward the cursor
const SWIRL = 0.35; // tangential share of the pull, gives the orbit
const WAKE = 0.28; // how much of the cursor's own velocity nearby dots inherit
const RETURN_SPRING = 0.03; // how eagerly displaced dots drift home
const DAMPING = 0.9; // < 1 so the motion stays floaty rather than snapping
const PARALLAX = 22; // px of depth shift at the strip's edge

type Particle = {
  x: number; // 0..1 of width
  y: number; // 0..1 of height
  z: number; // 0 far .. 1 near
  vx: number;
  vy: number;
  phase: number;
  ox: number; // cursor-induced displacement, eases back to 0
  oy: number;
  vox: number;
  voy: number;
};

type Rgb = [number, number, number];

function readRgb(el: HTMLElement, name: string, fallback: Rgb): Rgb {
  const raw = getComputedStyle(el).getPropertyValue(name).trim();
  const m = /^#([\da-f]{6})$/i.exec(raw);
  if (!m) return fallback;
  const n = parseInt(m[1]!, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const rgba = ([r, g, b]: Rgb, a: number) => `rgba(${r},${g},${b},${a})`;

function seed(count: number): Particle[] {
  return Array.from({ length: count }, () => ({
    x: Math.random(),
    y: Math.random(),
    z: Math.random() ** 1.6, // more far dots than near: reads as depth
    vx: (Math.random() - 0.5) * 0.00012,
    vy: (Math.random() - 0.5) * 0.00008,
    phase: Math.random() * Math.PI * 2,
    ox: 0,
    oy: 0,
    vox: 0,
    voy: 0,
  }));
}

export function HeroField({ className = "" }: { className?: string }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const coarse = window.matchMedia("(pointer: coarse)");

    let width = 0;
    let height = 0;
    let dpr = 1;
    let particles: Particle[] = [];
    let colors = { ink: [24, 29, 38] as Rgb, accent: [27, 97, 201] as Rgb };
    let raf = 0;
    let visible = true;
    let lastT = 0;

    // Cursor in CSS px relative to the canvas; null = not hovering. `cur` chases `target`,
    // and remembers its own smoothed velocity so dots can be carried along with it.
    let target: { x: number; y: number } | null = null;
    const cur = { x: 0, y: 0, vx: 0, vy: 0, strength: 0 };

    function readColors() {
      colors = { ink: readRgb(host!, "--ink", colors.ink), accent: readRgb(host!, "--accent", colors.accent) };
    }

    function resize() {
      const rect = host!.getBoundingClientRect();
      width = Math.max(1, Math.round(rect.width));
      height = Math.max(1, Math.round(rect.height));
      dpr = Math.min(DPR_MAX, window.devicePixelRatio || 1);
      canvas!.width = Math.round(width * dpr);
      canvas!.height = Math.round(height * dpr);
      canvas!.style.width = `${width}px`;
      canvas!.style.height = `${height}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      const wanted = Math.round(Math.min(COUNT_MAX, Math.max(COUNT_MIN, width * height * DENSITY)) * (coarse.matches ? 0.6 : 1));
      if (particles.length !== wanted) particles = seed(wanted);
      if (reducedMotion.matches) draw(0);
    }

    function draw(t: number) {
      ctx!.clearRect(0, 0, width, height);

      // Parallax: near dots slide opposite to the cursor's offset from centre, far dots barely.
      const px = cur.strength * ((cur.x / width) * 2 - 1);
      const py = cur.strength * ((cur.y / height) * 2 - 1);

      for (const p of particles) {
        const depth = 0.35 + p.z * 0.65;
        const floatY = Math.sin(t * 0.0006 + p.phase) * 3 * depth;
        const sx = p.x * width - px * PARALLAX * (p.z - 0.5) + p.ox;
        const sy = p.y * height - py * PARALLAX * 0.5 * (p.z - 0.5) + floatY + p.oy;

        // Dots near the cursor tint toward the accent and grow a touch, so the gathering reads.
        let near = 0;
        if (cur.strength > 0.01) {
          const d = Math.hypot(sx - cur.x, sy - cur.y);
          if (d < CURSOR_RADIUS) near = (1 - d / CURSOR_RADIUS) ** 1.5 * cur.strength;
        }

        const radius = 0.9 + p.z * 1.9 + near * 1.1;
        const alpha = Math.min(1, 0.16 + p.z * 0.38 + near * 0.4);
        const [r, g, b] = near > 0
          ? [
              colors.ink[0] + (colors.accent[0] - colors.ink[0]) * near,
              colors.ink[1] + (colors.accent[1] - colors.ink[1]) * near,
              colors.ink[2] + (colors.accent[2] - colors.ink[2]) * near,
            ]
          : colors.ink;
        ctx!.beginPath();
        ctx!.arc(sx, sy, radius, 0, Math.PI * 2);
        ctx!.fillStyle = rgba([r | 0, g | 0, b | 0], alpha);
        ctx!.fill();
      }
    }

    function step(t: number) {
      const dt = lastT ? Math.min(3, (t - lastT) / 16.667) : 1; // frames at 60Hz, clamped
      lastT = t;

      // Smooth the cursor and fade its influence in/out. Velocity is the smoothed step per
      // frame, so a fast sweep drags dots further than a slow drift.
      if (target) {
        const nx = cur.x + (target.x - cur.x) * CURSOR_EASE * dt;
        const ny = cur.y + (target.y - cur.y) * CURSOR_EASE * dt;
        cur.vx += ((nx - cur.x) / dt - cur.vx) * 0.3;
        cur.vy += ((ny - cur.y) / dt - cur.vy) * 0.3;
        cur.x = nx;
        cur.y = ny;
        cur.strength += (1 - cur.strength) * 0.1 * dt;
      } else {
        cur.vx *= 0.8;
        cur.vy *= 0.8;
        cur.strength += (0 - cur.strength) * 0.05 * dt;
      }

      for (const p of particles) {
        // Weightless drift with wrap-around.
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.x < -0.02) p.x = 1.02;
        else if (p.x > 1.02) p.x = -0.02;
        if (p.y < -0.05) p.y = 1.05;
        else if (p.y > 1.05) p.y = -0.05;

        // Anti-gravity: dots inside the radius are pulled toward the cursor (held off a small
        // core so they ring it rather than stack), nudged sideways so they circle, and carried
        // along with the cursor's motion. Near dots feel it most. Then a spring back home.
        if (cur.strength > 0.01) {
          const dx = cur.x - (p.x * width + p.ox);
          const dy = cur.y - (p.y * height + p.oy);
          const d = Math.hypot(dx, dy) || 1;
          if (d < CURSOR_RADIUS) {
            const t = 1 - d / CURSOR_RADIUS;
            const depth = 0.5 + p.z;
            const f = t * t * depth * cur.strength;
            // Pull fades to zero at the core and flips to a gentle hold-off inside it.
            const pull = PULL * f * Math.min(1, Math.max(-0.6, (d - CURSOR_CORE) / CURSOR_CORE));
            const ux = dx / d;
            const uy = dy / d;
            p.vox += (ux * pull - uy * SWIRL * f) * dt;
            p.voy += (uy * pull + ux * SWIRL * f) * dt;
            p.vox += cur.vx * WAKE * f * dt;
            p.voy += cur.vy * WAKE * f * dt;
          }
        }
        p.vox += -p.ox * RETURN_SPRING * dt;
        p.voy += -p.oy * RETURN_SPRING * dt;
        p.vox *= DAMPING;
        p.voy *= DAMPING;
        p.ox += p.vox * dt;
        p.oy += p.voy * dt;
      }

      draw(t);
      raf = requestAnimationFrame(step);
    }

    function start() {
      if (raf || reducedMotion.matches || !visible || document.hidden) return;
      lastT = 0;
      raf = requestAnimationFrame(step);
    }
    function stop() {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    }

    // Cursor coupling is mouse-only; touch and pen just see the drifting field.
    function onMove(e: PointerEvent) {
      if (e.pointerType !== "mouse") return;
      const rect = canvas!.getBoundingClientRect();
      target = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }
    function onLeave() {
      target = null;
    }

    readColors();
    resize();

    const ro = new ResizeObserver(resize);
    ro.observe(host);
    const io = new IntersectionObserver(
      ([entry]) => {
        visible = !!entry?.isIntersecting;
        if (visible) start();
        else stop();
      },
      { threshold: 0.05 },
    );
    io.observe(host);
    const themeObserver = new MutationObserver(() => {
      readColors();
      if (reducedMotion.matches) draw(0);
    });
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    const onVisibility = () => (document.hidden ? stop() : start());
    document.addEventListener("visibilitychange", onVisibility);
    const onMotionChange = () => {
      stop();
      if (reducedMotion.matches) draw(0);
      else start();
    };
    reducedMotion.addEventListener("change", onMotionChange);
    host.addEventListener("pointermove", onMove);
    host.addEventListener("pointerleave", onLeave);

    start();

    return () => {
      stop();
      ro.disconnect();
      io.disconnect();
      themeObserver.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      reducedMotion.removeEventListener("change", onMotionChange);
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <div
      ref={hostRef}
      aria-hidden
      className={`relative h-36 overflow-hidden md:h-44 ${className}`}
      style={{ background: "linear-gradient(90deg, var(--banner-from), var(--banner-mid), var(--banner-to))" }}
    >
      <canvas ref={canvasRef} className="absolute inset-0 block" />
    </div>
  );
}
