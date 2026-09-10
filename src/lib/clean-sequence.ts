/**
 * Scroll windows for the four cleaning passes, shared by the 3D scene and the
 * copy that runs beside it so the two can never drift apart.
 *
 * Deliberately separate from the scene module: the section imports these
 * eagerly, while the Three.js bundle stays behind a dynamic import.
 */

export type Window = [number, number];

/* Widened, with longer gaps between them. Each pass now holds for longer
   before the camera moves on, which is what makes the whole run feel
   unhurried rather than like four quick cuts. */
export const WIPE: Window = [0.05, 0.23];
export const VACUUM: Window = [0.29, 0.47];
export const MOP: Window = [0.53, 0.71];
export const SHINE: Window = [0.77, 0.95];

export const WINDOWS: Window[] = [WIPE, VACUUM, MOP, SHINE];

export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

export function smoothstep([a, b]: Window, v: number) {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
}

/**
 * Which pass the copy should be showing.
 *
 * A pass stays selected through the gap that follows it, so the text never
 * blanks out while the camera is travelling to the next one.
 */
export function activeStage(progress: number) {
  const p = clamp01(progress);
  let stage = 0;
  for (let i = 0; i < WINDOWS.length; i++) {
    if (p >= WINDOWS[i][0] - 0.03) stage = i;
  }
  return stage;
}
