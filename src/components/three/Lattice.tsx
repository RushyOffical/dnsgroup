"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useDeviceTier } from "@/hooks/useDeviceTier";

/**
 * A soft round dot, drawn once into a canvas at module scope.
 * pointsMaterial renders hard squares without one, which reads as pixel
 * garbage rather than a lattice.
 */
function createDotTexture() {
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
    gradient.addColorStop(0.4, "rgba(255,255,255,0.65)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

/**
 * A wave-driven point lattice used as a section backdrop.
 *
 * Deliberately built from Points rather than meshes: thousands of vertices for
 * the cost of a single draw call, which is what makes it safe to run behind
 * content on the same page as a transmission-heavy hero.
 */
export default function Lattice({ color = "#c8a45c" }: { color?: string }) {
  const points = useRef<THREE.Points>(null);
  const { tier, reducedMotion } = useDeviceTier();

  const dot = useMemo(() => createDotTexture(), []);
  const grid = tier === "high" ? 78 : tier === "mid" ? 52 : 34;
  const spread = 26;

  const positions = useMemo(() => {
    const array = new Float32Array(grid * grid * 3);
    let i = 0;
    for (let x = 0; x < grid; x++) {
      for (let z = 0; z < grid; z++) {
        array[i++] = (x / (grid - 1) - 0.5) * spread;
        array[i++] = 0;
        array[i++] = (z / (grid - 1) - 0.5) * spread;
      }
    }
    return array;
  }, [grid]);

  // Kept as a stable reference so the wave mutates in place each frame.
  const base = useMemo(() => positions.slice(), [positions]);

  useFrame(({ clock }) => {
    const geometry = points.current?.geometry;
    if (!geometry) return;
    const attribute = geometry.getAttribute(
      "position",
    ) as THREE.BufferAttribute;
    const t = reducedMotion ? 0 : clock.getElapsedTime();

    for (let i = 0; i < attribute.count; i++) {
      const x = base[i * 3];
      const z = base[i * 3 + 2];
      const distance = Math.sqrt(x * x + z * z);
      const wave =
        Math.sin(distance * 0.45 - t * 0.9) * 0.55 +
        Math.sin(x * 0.22 + t * 0.4) * 0.28;
      attribute.setY(i, wave);
    }
    attribute.needsUpdate = true;
  });

  return (
    <>
      <points ref={points} rotation={[-0.42, 0, 0]} position={[0, -1.6, 0]}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[positions, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.09}
          map={dot}
          alphaMap={dot}
          color={color}
          transparent
          opacity={0.85}
          sizeAttenuation
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
      <fog attach="fog" args={["#04060c", 8, 26]} />
    </>
  );
}
