"use client";

// Adapted from React Bits "RubberSegment" (Micro category) by David Haz. Licence: ./LICENSE.md.
// Changes for StandByDev: colours default to our tokens, sizes trimmed to the two we use.

import { animate, useMotionValue, useReducedMotion, type MotionValue } from "motion/react";
import { useEffect, useLayoutEffect, useRef, type CSSProperties, type ReactNode } from "react";

type Item = { value: string; label: ReactNode };
type Slot = { l: number; r: number };
type Sample = [number, number];
type Drag = { id: number; x0: number; slot: number; onThumb: boolean; live: boolean; offset: number; w: number; hist: Sample[] };

const EASE_OUT: [number, number, number, number] = [0.23, 1, 0.32, 1];
const SPRING_UI = { type: "spring" as const, duration: 0.3, bounce: 0 };
const SPRING_MOMENTUM = { type: "spring" as const, duration: 0.4, bounce: 0.2 };
const SPRING_RELAX = { type: "spring" as const, duration: 0.16, bounce: 0 };
const DILATE = 0.19;
const HANDOFF = 0.15;
const FLICK = 110;
const MAX_VELOCITY = 2000;
const DEADZONE = 4;
const SLOP = 10;
const RUBBER = 0.55;
const SIZES = {
  md: { height: 40, font: 14, pad: 16, min: 44 },
  lg: { height: 48, font: 15, pad: 20, min: 48 },
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const rubber = (over: number, dim: number) => (over * dim * RUBBER) / (dim + RUBBER * Math.abs(over));
const project = (v: number, glide: number) => {
  const d = 1 - 0.1 * Math.pow(0.05, glide / 100);
  return ((v / 1000) * d) / (1 - d);
};
const velocityOf = (hist: Sample[], now: number) => {
  const recent = hist.filter(([t]) => now - t <= 100);
  if (recent.length < 2) return 0;
  const [t0, x0] = recent[0]!;
  const [t1, x1] = recent[recent.length - 1]!;
  return t1 - t0 >= 8 ? ((x1 - x0) / (t1 - t0)) * 1000 : 0;
};
const nearestSlot = (slots: Slot[], x: number) => {
  let best = 0;
  for (let i = 1; i < slots.length; i++) {
    if (Math.abs((slots[i]!.l + slots[i]!.r) / 2 - x) < Math.abs((slots[best]!.l + slots[best]!.r) / 2 - x)) best = i;
  }
  return best;
};

export function RubberSegment({
  items,
  value,
  onChange,
  trackColor = "var(--surface-strong)",
  thumbColor = "var(--canvas)",
  textColor = "var(--body)",
  activeTextColor = "var(--ink)",
  size = "md",
  radius = 12,
  inset = 4,
  stretch = 100,
  squash = 3,
  glide = 75,
  className = "",
  "aria-label": ariaLabel,
}: {
  items: Item[];
  value: string;
  onChange: (value: string) => void;
  trackColor?: string;
  thumbColor?: string;
  textColor?: string;
  activeTextColor?: string;
  size?: keyof typeof SIZES;
  radius?: number;
  inset?: number;
  stretch?: number;
  squash?: number;
  glide?: number;
  className?: string;
  "aria-label": string;
}) {
  const index = Math.max(
    0,
    items.findIndex((item) => item.value === value),
  );
  const reduce = useReducedMotion();

  const trackRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const slots = useRef<Slot[]>([]);
  const box = useRef<DOMRect | null>(null);
  const committed = useRef(index);
  const handoff = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const drag = useRef<Drag | null>(null);
  const gen = useRef(0);

  const edgeL = useMotionValue(0);
  const edgeR = useMotionValue(0);
  const innerW = useMotionValue(0);
  const thumbRadius = Math.max(0, radius - inset);
  const overlayRef = useRef<HTMLDivElement>(null);

  // The thumb is a clipped copy of the labels. Its clip is written straight from the edge values
  // by a subscription owned here, so a StrictMode effect replay can never leave it stale.
  useLayoutEffect(() => {
    const write = () => {
      const el = overlayRef.current;
      if (el) el.style.clipPath = `inset(0 ${Math.max(0, innerW.get() - edgeR.get())}px 0 ${Math.max(0, edgeL.get())}px round ${thumbRadius}px)`;
    };
    write();
    const offs = [innerW.on("change", write), edgeL.on("change", write), edgeR.on("change", write)];
    return () => offs.forEach((off) => off());
  }, [innerW, edgeL, edgeR, thumbRadius]);

  const jumpTo = (i: number) => {
    const s = slots.current[i];
    if (!s) return;
    clearTimeout(handoff.current);
    gen.current += 1;
    edgeL.jump(s.l);
    edgeR.jump(s.r);
  };

  const listKey = items.map((item) => item.value).join("|");
  useLayoutEffect(() => {
    const measure = () => {
      const track = trackRef.current;
      if (!track) return;
      const rect = track.getBoundingClientRect();
      box.current = rect;
      slots.current = itemRefs.current.map((el) => {
        if (!el) return { l: 0, r: 0 };
        const r = el.getBoundingClientRect();
        return { l: r.left - rect.left - inset, r: r.right - rect.left - inset };
      });
      innerW.set(rect.width - inset * 2);
      jumpTo(committed.current);
    };
    measure();
    const observer = new ResizeObserver(measure);
    if (trackRef.current) observer.observe(trackRef.current);
    document.fonts?.ready.then(measure);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listKey, size, inset]);

  useEffect(() => {
    if (!drag.current && committed.current !== index) {
      committed.current = index;
      jumpTo(index);
    }
  });

  useEffect(
    () => () => {
      clearTimeout(handoff.current);
      edgeL.stop();
      edgeR.stop();
    },
    [edgeL, edgeR],
  );

  const commit = (i: number) => {
    committed.current = i;
    if (i === index) return;
    onChange(items[i]!.value);
  };

  const land = (to: number, v: number | null, flick: boolean, withSquash: boolean) => {
    const b = slots.current[to];
    if (!b) return;
    const g = ++gen.current;
    const dir = Math.sign((b.l + b.r) / 2 - (edgeL.get() + edgeR.get()) / 2) || 1;
    const [lead, leadTo, trail, trailTo] = dir > 0 ? [edgeR, b.r, edgeL, b.l] : [edgeL, b.l, edgeR, b.r];
    const velocityFor = (mv: MotionValue<number>) => clamp(v === null ? mv.getVelocity() : v, -MAX_VELOCITY, MAX_VELOCITY);
    animate(lead, leadTo, { ...(flick ? SPRING_MOMENTUM : SPRING_UI), velocity: velocityFor(lead) });
    const trailVelocity = velocityFor(trail);
    if (!withSquash || squash <= 0) {
      animate(trail, trailTo, { ...SPRING_UI, velocity: trailVelocity });
      return;
    }
    animate(trail, trailTo + dir * squash, { ...SPRING_UI, velocity: trailVelocity }).then(() => {
      if (gen.current === g) animate(trail, trailTo, SPRING_RELAX);
    });
  };

  const travel = (from: number, to: number) => {
    const a = slots.current[from];
    const b = slots.current[to];
    if (!a || !b) return;
    clearTimeout(handoff.current);
    gen.current += 1;
    if (reduce) {
      edgeL.jump(b.l);
      edgeR.jump(b.r);
      return;
    }
    const u = stretch / 100;
    const tween = { duration: DILATE, ease: EASE_OUT };
    animate(edgeL, b.l + (Math.min(a.l, b.l) - b.l) * u, tween);
    animate(edgeR, b.r + (Math.max(a.r, b.r) - b.r) * u, tween);
    handoff.current = setTimeout(() => land(to, null, false, true), HANDOFF * 1000);
  };

  const localX = (e: { clientX: number }) => e.clientX - (box.current ? box.current.left : 0) - inset;

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>, i: number) => {
    if (drag.current || e.button !== 0) return;
    box.current = trackRef.current?.getBoundingClientRect() ?? null;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Without capture a tap still works; only the thumb drag is lost.
    }
    const x = localX(e);
    const onThumb = x >= edgeL.get() && x <= edgeR.get();
    drag.current = { id: e.pointerId, x0: x, slot: i, onThumb, live: false, offset: 0, w: 0, hist: [[e.timeStamp, x]] };
    if (onThumb) {
      clearTimeout(handoff.current);
      gen.current += 1;
      edgeL.stop();
      edgeR.stop();
    } else if (!reduce) {
      e.currentTarget.dataset.pressed = "";
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || e.pointerId !== d.id || !d.onThumb) return;
    const x = localX(e);
    d.hist.push([e.timeStamp, x]);
    if (d.hist.length > 8) d.hist.shift();
    if (!d.live) {
      if (Math.abs(x - d.x0) < DEADZONE) return;
      d.live = true;
      d.offset = x - edgeL.get();
      d.w = edgeR.get() - edgeL.get();
      if (trackRef.current) trackRef.current.dataset.held = "";
    }
    const width = innerW.get();
    const l = x - d.offset;
    const maxL = width - d.w;
    if (reduce) {
      const c = clamp(l, 0, maxL);
      edgeL.set(c);
      edgeR.set(c + d.w);
    } else if (l < 0) {
      edgeL.set(0);
      edgeR.set(d.w - rubber(-l, d.w));
    } else if (l > maxL) {
      edgeR.set(width);
      edgeL.set(maxL + rubber(l - maxL, d.w));
    } else {
      edgeL.set(l);
      edgeR.set(l + d.w);
    }
  };

  const release = () => {
    const d = drag.current as Drag;
    drag.current = null;
    if (trackRef.current) delete trackRef.current.dataset.held;
    const el = itemRefs.current[d.slot];
    if (el) delete el.dataset.pressed;
    return d;
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || e.pointerId !== d.id) return;
    release();
    const x = localX(e);
    if (!d.live) {
      if (Math.abs(x - d.x0) <= SLOP && d.slot !== committed.current) {
        const from = committed.current;
        commit(d.slot);
        travel(from, d.slot);
      }
      return;
    }
    const v = velocityOf(d.hist, e.timeStamp);
    const flick = Math.abs(v) > FLICK;
    let to = nearestSlot(slots.current, (edgeL.get() + edgeR.get()) / 2 + project(v, glide));
    if (flick && to === committed.current) to = clamp(to + Math.sign(v), 0, items.length - 1);
    commit(to);
    if (reduce) jumpTo(to);
    else land(to, v, flick, flick);
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || e.pointerId !== d.id) return;
    release();
    if (!d.live) return;
    if (reduce) jumpTo(committed.current);
    else land(committed.current, null, false, false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    const last = items.length - 1;
    let next: number | null = null;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = Math.min(last, index + 1);
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = Math.max(0, index - 1);
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = last;
    if (next === null) return;
    e.preventDefault();
    if (next === index) return;
    const from = committed.current;
    commit(next);
    travel(from, next);
    itemRefs.current[next]?.focus();
  };

  const preset = SIZES[size];
  const cell =
    "inline-flex h-[calc(var(--rs-h)-var(--rs-inset)*2)] min-w-(--rs-min) items-center justify-center gap-1.5 whitespace-nowrap rounded-(--rs-thumb-radius) px-(--rs-pad) text-(length:--rs-font) leading-none font-medium";

  return (
    <div
      ref={trackRef}
      role="radiogroup"
      aria-label={ariaLabel}
      className={`group relative inline-grid auto-cols-[minmax(0,1fr)] grid-flow-col rounded-(--rs-radius) bg-(--rs-track) p-(--rs-inset) align-middle select-none touch-pan-y [-webkit-tap-highlight-color:transparent] data-held:cursor-grabbing ${className}`}
      style={
        {
          "--rs-track": trackColor,
          "--rs-thumb": thumbColor,
          "--rs-ink": textColor,
          "--rs-ink-active": activeTextColor,
          "--rs-radius": `${radius}px`,
          "--rs-inset": `${inset}px`,
          "--rs-thumb-radius": `${thumbRadius}px`,
          "--rs-h": `${preset.height}px`,
          "--rs-font": `${preset.font}px`,
          "--rs-pad": `${preset.pad}px`,
          "--rs-min": `${preset.min}px`,
        } as CSSProperties
      }
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onLostPointerCapture={handlePointerCancel}
    >
      {items.map((item, i) => (
        <button
          key={item.value}
          ref={(el) => {
            itemRefs.current[i] = el;
          }}
          type="button"
          role="radio"
          aria-checked={i === index}
          tabIndex={i === index ? 0 : -1}
          className={`${cell} cursor-pointer text-(--rs-ink) outline-none transition-[opacity,transform] duration-150 aria-checked:cursor-grab data-pressed:scale-[0.96] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent [@media(hover:hover)_and_(pointer:fine)]:hover:text-(--rs-ink-active)`}
          onPointerDown={(e) => handlePointerDown(e, i)}
          onKeyDown={handleKeyDown}
        >
          {item.label}
        </button>
      ))}
      <div
        ref={overlayRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-(--rs-inset) grid auto-cols-[minmax(0,1fr)] grid-flow-col bg-(--rs-thumb) text-(--rs-ink-active) [clip-path:inset(0_100%_0_0)]"
      >
        {items.map((item) => (
          <span key={item.value} className={cell}>
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}
