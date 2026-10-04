/**
 * Surface textures for the office scene, drawn to canvases at runtime.
 *
 * No image assets are fetched: everything is generated from deterministic
 * noise, so the scene looks the same on every load and works offline. Each
 * texture tiles seamlessly, which lets a small canvas cover a whole floor.
 */

import * as THREE from "three";

/** Deterministic hash → [0, 1). */
function hash(x: number, y: number, seed: number) {
  const s = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453;
  return s - Math.floor(s);
}

/** Seamless value noise with the given lattice period. */
function tileNoise(period: number, seed: number) {
  const grid = new Float32Array(period * period);
  for (let y = 0; y < period; y++) {
    for (let x = 0; x < period; x++) grid[y * period + x] = hash(x, y, seed);
  }
  const at = (x: number, y: number) =>
    grid[((y % period) + period) % period * period + (((x % period) + period) % period)];
  return (u: number, v: number) => {
    // u, v in [0, 1) across one tile
    const x = u * period;
    const y = v * period;
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    let fx = x - xi;
    let fy = y - yi;
    fx = fx * fx * (3 - 2 * fx);
    fy = fy * fy * (3 - 2 * fy);
    const a = at(xi, yi);
    const b = at(xi + 1, yi);
    const c = at(xi, yi + 1);
    const d = at(xi + 1, yi + 1);
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  };
}

function fbm(octaves: { period: number; weight: number }[], seed: number) {
  const layers = octaves.map((o, i) => ({ fn: tileNoise(o.period, seed + i * 13), w: o.weight }));
  const total = octaves.reduce((sum, o) => sum + o.weight, 0);
  return (u: number, v: number) => {
    let sum = 0;
    for (const layer of layers) sum += layer.fn(u, v) * layer.w;
    return sum / total;
  };
}

function canvas(width: number, height: number) {
  const el = document.createElement("canvas");
  el.width = width;
  el.height = height;
  const ctx = el.getContext("2d");
  if (!ctx) throw new Error("2D canvas unavailable");
  return { el, ctx };
}

function toTexture(el: HTMLCanvasElement, color: boolean, repeat = 1) {
  const texture = new THREE.CanvasTexture(el);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeat, repeat);
  texture.anisotropy = 8;
  texture.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  texture.needsUpdate = true;
  return texture;
}

/** Fills a greyscale canvas from a per-pixel function returning [0, 1]. */
function paint(size: number, fn: (u: number, v: number) => number) {
  const { el, ctx } = canvas(size, size);
  const image = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const value = Math.max(0, Math.min(1, fn(x / size, y / size)));
      const i = (y * size + x) * 4;
      const byte = Math.round(value * 255);
      image.data[i] = byte;
      image.data[i + 1] = byte;
      image.data[i + 2] = byte;
      image.data[i + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);
  return el;
}

/**
 * Polished concrete: broad cloudy mottling, a finer trowel grain and the odd
 * aggregate fleck. The map multiplies the material colour; the roughness map
 * varies the sheen so the floor never reads as a flat plastic plane.
 */
export function concreteTextures(size = 512, repeat = 3) {
  const cloud = fbm(
    [
      { period: 3, weight: 1 },
      { period: 7, weight: 0.55 },
      { period: 16, weight: 0.3 },
    ],
    11,
  );
  const grain = fbm(
    [
      { period: 64, weight: 1 },
      { period: 128, weight: 0.6 },
    ],
    29,
  );

  const map = paint(size, (u, v) => {
    const c = cloud(u, v);
    const g = grain(u, v);
    let value = 0.8 + (c - 0.5) * 0.32 + (g - 0.5) * 0.08;
    // Aggregate flecks
    const fleck = hash(Math.floor(u * size), Math.floor(v * size), 5);
    if (fleck > 0.996) value -= 0.18;
    else if (fleck > 0.992) value += 0.1;
    return value;
  });

  const rough = paint(size, (u, v) => 0.72 + (cloud(u + 0.37, v + 0.21) - 0.5) * 0.5 + (grain(u, v) - 0.5) * 0.12);

  return { map: toTexture(map, true, repeat), roughnessMap: toTexture(rough, false, repeat) };
}

/** Painted plaster: almost flat, with just enough unevenness to catch light. */
export function plasterTexture(size = 256, repeat = 4) {
  const n = fbm(
    [
      { period: 4, weight: 1 },
      { period: 32, weight: 0.4 },
      { period: 96, weight: 0.25 },
    ],
    41,
  );
  return toTexture(paint(size, (u, v) => 0.93 + (n(u, v) - 0.5) * 0.12), true, repeat);
}

/** Matte laminate for the desk: near-uniform with a faint fibre. */
export function laminateTexture(size = 256) {
  const n = fbm(
    [
      { period: 8, weight: 1 },
      { period: 64, weight: 0.5 },
    ],
    53,
  );
  return toTexture(paint(size, (u, v) => 0.95 + (n(u, v) - 0.5) * 0.08), true, 1);
}

/**
 * The view out of the window: a soft morning sky over two layers of city,
 * the far one lost in haze. Drawn wide so it can sit some distance behind
 * the glass and shift with the camera like a real view.
 */
export function skylineTexture(width = 2048, height = 768) {
  const { el, ctx } = canvas(width, height);

  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, "#5a8fd0");
  sky.addColorStop(0.45, "#9cc0e6");
  sky.addColorStop(0.72, "#e9e4dc");
  sky.addColorStop(1, "#f3dcc0");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);

  // Low sun glow
  const glow = ctx.createRadialGradient(width * 0.72, height * 0.7, 0, width * 0.72, height * 0.7, height * 0.9);
  glow.addColorStop(0, "rgba(255, 236, 205, 0.85)");
  glow.addColorStop(1, "rgba(255, 236, 205, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);

  const rnd = (i: number, salt: number) => hash(i, salt, 3);

  const drawLayer = (
    baseY: number,
    minH: number,
    maxH: number,
    minW: number,
    maxW: number,
    colour: string,
    lit: number,
    salt: number,
  ) => {
    let x = -20;
    let i = 0;
    while (x < width + 20) {
      const w = minW + rnd(i, salt) * (maxW - minW);
      const h = minH + Math.pow(rnd(i, salt + 1), 1.6) * (maxH - minH);
      ctx.fillStyle = colour;
      ctx.fillRect(x, baseY - h, w, h + height);
      // Occasional crown or spire
      if (rnd(i, salt + 2) > 0.82) ctx.fillRect(x + w * 0.4, baseY - h - h * 0.08, w * 0.2, h * 0.08);
      // Window grid
      if (lit > 0) {
        for (let wy = baseY - h + 8; wy < baseY - 6; wy += 9) {
          for (let wx = x + 5; wx < x + w - 5; wx += 8) {
            const r = hash(wx, wy, salt);
            if (r < lit) {
              ctx.fillStyle = r < lit * 0.35 ? "rgba(255, 226, 170, 0.55)" : "rgba(210, 228, 245, 0.28)";
              ctx.fillRect(wx, wy, 4, 5);
            }
          }
        }
      }
      x += w + rnd(i, salt + 3) * 6;
      i++;
    }
  };

  drawLayer(height * 0.86, height * 0.12, height * 0.42, 40, 110, "#93a3b7", 0, 101);
  // Atmospheric haze between the layers
  const haze = ctx.createLinearGradient(0, height * 0.4, 0, height);
  haze.addColorStop(0, "rgba(232, 228, 222, 0)");
  haze.addColorStop(1, "rgba(232, 228, 222, 0.55)");
  ctx.fillStyle = haze;
  ctx.fillRect(0, 0, width, height);

  drawLayer(height * 0.98, height * 0.18, height * 0.55, 70, 170, "#45525f", 0.22, 202);

  const texture = new THREE.CanvasTexture(el);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
}

/**
 * What is on the monitor once it's wiped: a calm dashboard in the brand
 * aqua — enough structure to read as a screen, nothing legible.
 */
export function screenTexture(width = 512, height = 288) {
  const { el, ctx } = canvas(width, height);
  const bg = ctx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, "#0b2a33");
  bg.addColorStop(1, "#0d1c2b");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  // Sidebar and header
  ctx.fillStyle = "rgba(47, 212, 196, 0.10)";
  ctx.fillRect(0, 0, 70, height);
  ctx.fillStyle = "rgba(255, 255, 255, 0.06)";
  ctx.fillRect(70, 0, width - 70, 28);

  // Cards
  const cards = [
    [86, 44, 130, 70],
    [228, 44, 130, 70],
    [370, 44, 126, 70],
    [86, 126, 272, 146],
    [370, 126, 126, 146],
  ];
  for (const [x, y, w, h] of cards) {
    ctx.fillStyle = "rgba(255, 255, 255, 0.07)";
    ctx.fillRect(x, y, w, h);
  }
  // A chart line in the large card
  ctx.strokeStyle = "rgba(125, 243, 228, 0.9)";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  for (let i = 0; i <= 20; i++) {
    const x = 98 + i * 12.4;
    const y = 240 - (Math.sin(i * 0.55) * 0.5 + 0.5) * 60 - i * 2.2;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  // Bars in the side card
  ctx.fillStyle = "rgba(47, 212, 196, 0.75)";
  for (let i = 0; i < 6; i++) {
    const h = 20 + hash(i, 7, 1) * 80;
    ctx.fillRect(384 + i * 18, 258 - h, 10, h);
  }
  // Text-ish lines
  ctx.fillStyle = "rgba(255, 255, 255, 0.22)";
  for (let i = 0; i < 6; i++) ctx.fillRect(12, 44 + i * 18, 46 - (i % 3) * 8, 5);
  for (const [x, y] of cards) ctx.fillRect(x + 10, y + 12, 50, 5);

  const texture = new THREE.CanvasTexture(el);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

/** A quiet abstract print for the wall above the credenza. */
export function artTexture(width = 384, height = 512) {
  const { el, ctx } = canvas(width, height);
  ctx.fillStyle = "#e9e5dc";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "#2f6f68";
  ctx.beginPath();
  ctx.arc(width * 0.42, height * 0.4, width * 0.26, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#c9a46a";
  ctx.fillRect(width * 0.18, height * 0.62, width * 0.64, height * 0.06);
  ctx.fillStyle = "#1d2433";
  ctx.fillRect(width * 0.58, height * 0.22, width * 0.05, height * 0.5);
  const texture = new THREE.CanvasTexture(el);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

/** Keycaps for the keyboard top. */
export function keyboardTexture(width = 512, height = 160) {
  const { el, ctx } = canvas(width, height);
  ctx.fillStyle = "#1a1d24";
  ctx.fillRect(0, 0, width, height);
  const rows = 5;
  const cols = 15;
  const pad = 6;
  const kw = (width - pad * 2) / cols;
  const kh = (height - pad * 2) / rows;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      // Space bar on the bottom row
      if (r === rows - 1 && c > 3 && c < 10) {
        if (c === 4) {
          ctx.fillStyle = "#2a2e37";
          ctx.fillRect(pad + c * kw + 1.5, pad + r * kh + 1.5, kw * 6 - 3, kh - 3);
        }
        continue;
      }
      ctx.fillStyle = "#2a2e37";
      ctx.fillRect(pad + c * kw + 1.5, pad + r * kh + 1.5, kw - 3, kh - 3);
    }
  }
  const texture = new THREE.CanvasTexture(el);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}
