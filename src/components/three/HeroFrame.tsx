"use client";

import { useThree } from "@react-three/fiber";
import { useMemo, type ReactNode } from "react";

/**
 * Positions a hero subject so it never sits underneath the headline.
 *
 * The copy is left-aligned in a max-w-7xl column, so on wide screens the
 * subject is pushed into the empty right-hand third. As the viewport narrows
 * there is no free column left, so it shrinks and lifts above the text block
 * instead of competing with it.
 */
export default function HeroFrame({ children }: { children: ReactNode }) {
  const width = useThree((state) => state.size.width);

  const { position, scale } = useMemo(() => {
    if (width >= 1280) {
      return { position: [2.05, 0.1, 0] as const, scale: 0.8 };
    }
    if (width >= 1024) {
      return { position: [1.75, 0.1, 0] as const, scale: 0.68 };
    }
    if (width >= 768) {
      return { position: [1.15, 0.95, -0.5] as const, scale: 0.58 };
    }
    // Phones: ambient backdrop only — small, high, and well clear of the copy.
    return { position: [0.45, 1.75, -1.2] as const, scale: 0.42 };
  }, [width]);

  return (
    <group position={[position[0], position[1], position[2]]} scale={scale}>
      {children}
    </group>
  );
}
