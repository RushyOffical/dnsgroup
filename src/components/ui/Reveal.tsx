"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

/**
 * Scroll-triggered entrance. Honours prefers-reduced-motion by showing the
 * final state the moment it enters view rather than animating to it.
 */
export default function Reveal({
  children,
  delay = 0,
  y = 28,
  className,
  once = true,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  once?: boolean;
}) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      className={className}
      // The same initial state on server and client, so hydration matches
      // whatever the visitor's motion preference. Reduced motion then snaps
      // to the final state instead of animating to it.
      initial={{ opacity: 0, y, filter: "blur(6px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once, margin: "-80px" }}
      transition={
        reduced
          ? { duration: 0 }
          : { duration: 0.85, delay, ease: [0.16, 1, 0.3, 1] }
      }
    >
      {children}
    </motion.div>
  );
}
