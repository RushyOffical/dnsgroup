"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Environment, Lightformer, Float, ContactShadows } from "@react-three/drei";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import * as THREE from "three";
import type { Service } from "@/content/site";
import { useDeviceTier } from "@/hooks/useDeviceTier";
import { MODELS } from "./models/CleaningObjects";

const AQUA = "#2fd4c4";
const AQUA_SOFT = "#7df3e4";

/**
 * Presents the active service's equipment on a turntable.
 *
 * Each object grows in on change so switching services reads as a swap
 * rather than a pop, and a slow rotation lets you read its silhouette from
 * more than one angle.
 */
function Piece({ model }: { model: Service["model"] }) {
  const group = useRef<THREE.Group>(null);
  const entry = useRef(0);
  const Model = MODELS[model];

  useFrame(({ clock }, delta) => {
    entry.current = Math.min(1, entry.current + delta * 2.2);
    const eased = 1 - Math.pow(1 - entry.current, 3);

    if (group.current) {
      // Turntable, plus a settle from slightly overhead as it arrives.
      group.current.rotation.y = clock.getElapsedTime() * 0.35;
      group.current.scale.setScalar(eased);
      group.current.position.y = (1 - eased) * 0.5;
    }
  });

  return (
    <group ref={group}>
      <Model />
    </group>
  );
}

export default function ServiceOrbit({ model }: { model: Service["model"] }) {
  const { tier, reducedMotion } = useDeviceTier();

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[4, 6, 4]} intensity={1.9} />
      <pointLight position={[-4, 2, -2]} intensity={18} distance={14} decay={2} color={AQUA} />
      <pointLight position={[3, -1, 3]} intensity={10} distance={12} decay={2} color="#8fc4ff" />

      <Environment resolution={tier === "high" ? 256 : 128} frames={1}>
        <Lightformer intensity={3} position={[0, 4, -4]} scale={[8, 4, 1]} color={AQUA_SOFT} />
        <Lightformer intensity={2.2} position={[-5, 1, 3]} scale={[2, 6, 1]} color="#ffffff" />
        <Lightformer intensity={1.4} position={[5, -1, 2]} scale={[4, 3, 1]} color={AQUA} />
      </Environment>

      <Float
        speed={reducedMotion ? 0 : 1.3}
        rotationIntensity={reducedMotion ? 0 : 0.12}
        floatIntensity={reducedMotion ? 0 : 0.5}
      >
        {/* Remounting on change restarts the entry animation. */}
        <Piece key={model} model={model} />
      </Float>

      {/* Grounds the object so it doesn't float in a void */}
      <ContactShadows
        position={[0, -1.35, 0]}
        opacity={0.5}
        scale={7}
        blur={2.6}
        far={3}
        resolution={tier === "high" ? 512 : 256}
        color="#000000"
      />

      {tier === "high" ? (
        <EffectComposer enableNormalPass={false}>
          <Bloom
            intensity={0.55}
            luminanceThreshold={0.55}
            luminanceSmoothing={0.9}
            mipmapBlur
          />
        </EffectComposer>
      ) : null}
    </>
  );
}
