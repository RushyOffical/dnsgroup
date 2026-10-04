import * as THREE from "three";

let cached: THREE.CanvasTexture | null = null;

/**
 * A soft round dot, drawn once and shared by every points material on the site.
 *
 * Without it `pointsMaterial` renders hard squares, which reads as pixel
 * garbage rather than dust, grit or a glint. Cached because several scenes
 * want the same texture and it never changes.
 */
export function dotTexture(): THREE.CanvasTexture {
  if (cached) return cached;

  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext("2d");
  if (ctx) {
    const gradient = ctx.createRadialGradient(
      size / 2,
      size / 2,
      0,
      size / 2,
      size / 2,
      size / 2,
    );
    gradient.addColorStop(0, "rgba(255,255,255,1)");
    gradient.addColorStop(0.35, "rgba(255,255,255,0.7)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
  }

  cached = new THREE.CanvasTexture(canvas);
  cached.needsUpdate = true;
  return cached;
}
