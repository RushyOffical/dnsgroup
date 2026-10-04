/**
 * Timeline for the four cleaning passes, shared by the 3D scene and the copy
 * that runs beside it so the two can never drift apart.
 *
 * Deliberately separate from the scene module: the section imports these
 * eagerly, while the Three.js bundle stays behind a dynamic import.
 *
 * Progress runs 0 → 1 across the pinned section:
 *   0.00 – 0.08  intro heading over the establishing shot
 *   then four passes, each a window with a short travel gap after it
 *   0.94 – 1.00  the finished room holds before the section releases
 */

export type Window = [number, number];

export const WIPE: Window = [0.1, 0.27];
export const VACUUM: Window = [0.31, 0.48];
export const MOP: Window = [0.52, 0.7];
export const SHINE: Window = [0.74, 0.92];

export const WINDOWS: Window[] = [WIPE, VACUUM, MOP, SHINE];

/** When the intro heading has fully handed over to the first pass. */
export const INTRO_OUT: Window = [0.05, 0.085];

export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

/** 0 before the window, 1 after it, eased in between. */
export function smoothstep([a, b]: Window, v: number) {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
}

/** Linear 0 → 1 across the window. */
export function linear([a, b]: Window, v: number) {
  return clamp01((v - a) / (b - a));
}

/** 0 at both ends of the window, 1 in the middle — for things that only
 *  exist while a pass is underway. */
export function pulse([a, b]: Window, v: number) {
  const t = linear([a, b], v);
  return Math.sin(t * Math.PI);
}

/**
 * Scroll stops for each pass's copy: [fade in start, fully in, fade out start,
 * fully out]; the last pass never fades out. Each pass's copy holds through
 * the travel gap after it, then hands over: the outgoing block clears before
 * the incoming one arrives, so two blocks never share the slot.
 */
export function copyStops(
  index: number,
): [number, number, number | null, number | null] {
  const [start] = WINDOWS[index];
  const fadeIn: Window =
    index === 0 ? [INTRO_OUT[1], INTRO_OUT[1] + 0.025] : [start - 0.01, start + 0.015];
  const next = WINDOWS[index + 1];
  if (!next) return [fadeIn[0], fadeIn[1], null, null];
  return [fadeIn[0], fadeIn[1], next[0] - 0.035, next[0] - 0.01];
}

/** Which pass is current, for the rail labels. */
export function activeStage(progress: number) {
  const p = clamp01(progress);
  let stage = 0;
  for (let i = 0; i < WINDOWS.length; i++) {
    if (p >= WINDOWS[i][0] - 0.02) stage = i;
  }
  return stage;
}
