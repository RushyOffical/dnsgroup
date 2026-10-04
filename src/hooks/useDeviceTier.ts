"use client";

import { useEffect, useState } from "react";

export type DeviceTier = "high" | "mid" | "low";

export type Capability = {
  tier: DeviceTier;
  /** True once we've measured on the client. Render conservatively until then. */
  ready: boolean;
  reducedMotion: boolean;
  coarsePointer: boolean;
  /** Device pixel ratio ceiling appropriate for this device. */
  dpr: [number, number];
};

const INITIAL: Capability = {
  tier: "mid",
  ready: false,
  reducedMotion: false,
  coarsePointer: false,
  dpr: [1, 1.5],
};

/**
 * Grades the device so the 3D scenes can scale themselves down instead of
 * dropping frames. The site is designed 3D-first, so nothing is removed
 * outright — geometry detail, effect passes and DPR are what flex.
 */
export function useDeviceTier(): Capability {
  const [cap, setCap] = useState<Capability>(INITIAL);

  useEffect(() => {
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const pointerQuery = window.matchMedia("(pointer: coarse)");

    const measure = () => {
      const cores = navigator.hardwareConcurrency ?? 4;
      // deviceMemory is Chromium-only. Absent is not evidence of a weak
      // device, so it must not pull the tier down on Safari or Firefox —
      // core count carries the decision there.
      const memory =
        (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
      const coarse = pointerQuery.matches;
      const narrow = window.innerWidth < 768;

      let tier: DeviceTier = "high";
      if (cores <= 4 || memory <= 4) tier = "mid";
      if (cores <= 2 || memory <= 2 || (coarse && narrow && cores <= 4)) {
        tier = "low";
      }

      const dpr: [number, number] =
        tier === "high" ? [1, 2] : tier === "mid" ? [1, 1.5] : [1, 1];

      setCap({
        tier,
        ready: true,
        reducedMotion: motionQuery.matches,
        coarsePointer: coarse,
        dpr,
      });
    };

    measure();
    motionQuery.addEventListener("change", measure);
    pointerQuery.addEventListener("change", measure);
    return () => {
      motionQuery.removeEventListener("change", measure);
      pointerQuery.removeEventListener("change", measure);
    };
  }, []);

  return cap;
}
