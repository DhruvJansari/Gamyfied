"use client";

// Adapted from React Bits "Counter" (Components category) by David Haz. Licence: ./LICENSE.md.
// An odometer: every digit is a strip of 0-9 on a spring, so a change rolls through the
// numbers in between instead of snapping. Changes for StandByDev: sized in em so it inherits
// the surrounding type, thousands separators, a `from` value to roll in on mount, integer
// only, and hooks called unconditionally.

import { motion, useReducedMotion, useSpring, useTransform, type MotionValue } from "motion/react";
import { useEffect } from "react";

const SPRING = { stiffness: 70, damping: 16, mass: 1 };

function Glyph({ mv, digit }: { mv: MotionValue<number>; digit: number }) {
  const y = useTransform(mv, (latest) => {
    const place = ((latest % 10) + 10) % 10;
    let offset = (10 + digit - place) % 10;
    if (offset > 5) offset -= 10;
    return `${offset}em`;
  });
  return (
    <motion.span className="absolute inset-0 flex items-center justify-center" style={{ y }}>
      {digit}
    </motion.span>
  );
}

function Digit({ place, value, from }: { place: number; value: number; from: number }) {
  const reduce = useReducedMotion();
  const whole = Math.floor(value / place);
  const mv = useSpring(Math.floor(from / place), SPRING);
  useEffect(() => {
    if (reduce) mv.jump(whole);
    else mv.set(whole);
  }, [mv, whole, reduce]);
  return (
    <span className="relative inline-block h-[1em] w-[0.62em] overflow-hidden">
      {Array.from({ length: 10 }, (_, i) => (
        <Glyph key={i} mv={mv} digit={i} />
      ))}
    </span>
  );
}

/** `digits` fixes the width so the number never reflows while it rolls. */
export function RollingNumber({
  value,
  digits,
  from = value,
  prefix = "",
  className = "",
}: {
  value: number;
  digits: number;
  from?: number;
  prefix?: string;
  className?: string;
}) {
  const places = Array.from({ length: digits }, (_, i) => 10 ** (digits - i - 1));
  return (
    <span className={`inline-flex items-center leading-none tabular-nums ${className}`}>
      <span className="sr-only">
        {prefix}
        {value.toLocaleString("en-US")}
      </span>
      <span aria-hidden className="inline-flex items-center">
        {prefix ? <span>{prefix}</span> : null}
        {places.map((place, i) => {
          const remaining = digits - i;
          // Leading zeros (and the comma after them) are hidden, not rendered as "0,998".
          const lead = place > 1 && value < place;
          const comma = i > 0 && remaining % 3 === 0;
          return (
            <span key={place} className={lead ? "hidden" : "inline-flex items-center"}>
              {comma ? <span className={value >= places[i - 1]! ? "w-[0.28em] text-center" : "hidden"}>,</span> : null}
              <Digit place={place} value={value} from={from} />
            </span>
          );
        })}
      </span>
    </span>
  );
}
