"use client";

import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "motion/react";
import type { PointerEvent, ReactNode } from "react";
import { cn } from "@/lib/utils";

const SPRING = { stiffness: 180, damping: 20, mass: 0.4 };

/**
 * Pointer-tracked 3D tilt with a light that follows the cursor.
 *
 * Runs entirely on motion values, so tilting never triggers a React render —
 * important when several of these sit on screen beside a live WebGL canvas.
 */
export default function TiltCard({
  children,
  className,
  intensity = 8,
  glow = true,
}: {
  children: ReactNode;
  className?: string;
  intensity?: number;
  glow?: boolean;
}) {
  const reduced = useReducedMotion();

  const pointerX = useMotionValue(0.5);
  const pointerY = useMotionValue(0.5);
  const tiltX = useMotionValue(0);
  const tiltY = useMotionValue(0);

  const rotateX = useSpring(tiltX, SPRING);
  const rotateY = useSpring(tiltY, SPRING);

  const glowX = useTransform(pointerX, (v) => `${v * 100}%`);
  const glowY = useTransform(pointerY, (v) => `${v * 100}%`);
  const highlight = useMotionTemplate`radial-gradient(420px circle at ${glowX} ${glowY}, color-mix(in oklab, var(--color-accent) 18%, transparent), transparent 70%)`;

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (reduced) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    pointerX.set(x);
    pointerY.set(y);
    tiltY.set((x - 0.5) * intensity * 2);
    tiltX.set(-(y - 0.5) * intensity * 2);
  };

  const onPointerLeave = () => {
    tiltX.set(0);
    tiltY.set(0);
    pointerX.set(0.5);
    pointerY.set(0.5);
  };

  return (
    <motion.div
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      style={{
        rotateX,
        rotateY,
        transformPerspective: 1100,
        transformStyle: "preserve-3d",
      }}
      className={cn("group/tilt relative will-change-transform", className)}
    >
      {glow ? (
        <motion.div
          aria-hidden
          style={{ background: highlight }}
          className="pointer-events-none absolute inset-0 z-20 rounded-[inherit] opacity-0 transition-opacity duration-500 group-hover/tilt:opacity-100"
        />
      ) : null}
      {children}
    </motion.div>
  );
}
