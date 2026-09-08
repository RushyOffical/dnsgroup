"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Environment, Lightformer, Float } from "@react-three/drei";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import * as THREE from "three";
import type { Service } from "@/content/site";
import { useDeviceTier } from "@/hooks/useDeviceTier";

const AQUA = "#2fd4c4";
const AQUA_SOFT = "#7df3e4";

/** Each service is represented by a distinct solid, keyed off `service.shape`. */
function ShapeGeometry({ shape }: { shape: Service["shape"] }) {
  switch (shape) {
    case "prism":
      return <cylinderGeometry args={[0.95, 0.95, 1.5, 6]} />;
    case "torus":
      return <torusGeometry args={[0.85, 0.32, 32, 96]} />;
    case "capsule":
      return <capsuleGeometry args={[0.6, 0.9, 16, 32]} />;
    case "octa":
      return <octahedronGeometry args={[1.15, 0]} />;
    case "sphere":
      return <sphereGeometry args={[1.05, 48, 48]} />;
    case "box":
    default:
      return <boxGeometry args={[1.5, 1.5, 1.5]} />;
  }
}

function Solid({ shape }: { shape: Service["shape"] }) {
  const mesh = useRef<THREE.Mesh>(null);
  const cage = useRef<THREE.Mesh>(null);
  // Grows from 0 whenever the shape changes, so switching services reads as a
  // transition rather than a pop.
  const entry = useRef(0);

  useFrame(({ clock }, delta) => {
    const t = clock.getElapsedTime();
    entry.current = Math.min(1, entry.current + delta * 2.6);
    const eased = 1 - Math.pow(1 - entry.current, 3);

    if (mesh.current) {
      mesh.current.rotation.y = t * 0.4;
      mesh.current.rotation.x = Math.sin(t * 0.3) * 0.3;
      mesh.current.scale.setScalar(eased);
    }
    if (cage.current) {
      cage.current.rotation.y = -t * 0.22;
      cage.current.rotation.z = t * 0.14;
      cage.current.scale.setScalar(eased * 1.62);
    }
  });

  return (
    <group>
      <mesh ref={mesh}>
        <ShapeGeometry shape={shape} />
        <meshPhysicalMaterial
          color={AQUA_SOFT}
          metalness={0.6}
          roughness={0.14}
          transmission={0.55}
          thickness={1.1}
          ior={1.45}
          iridescence={0.75}
          iridescenceIOR={1.6}
          clearcoat={1}
          clearcoatRoughness={0.1}
        />
      </mesh>

      <mesh ref={cage}>
        <icosahedronGeometry args={[1, 0]} />
        <meshBasicMaterial color={AQUA} wireframe transparent opacity={0.07} />
      </mesh>
    </group>
  );
}

export default function ServiceOrbit({ shape }: { shape: Service["shape"] }) {
  const { tier, reducedMotion } = useDeviceTier();

  return (
    <>
      <ambientLight intensity={0.45} />
      <directionalLight position={[4, 5, 4]} intensity={1.7} />
      <pointLight position={[-4, 1, -2]} intensity={20} color={AQUA} />
      <pointLight position={[3, -3, 3]} intensity={12} color="#4aa8ff" />

      <Environment resolution={128} frames={1}>
        <Lightformer
          intensity={2.6}
          position={[0, 4, -4]}
          scale={[8, 4, 1]}
          color={AQUA_SOFT}
        />
        <Lightformer
          intensity={1.8}
          position={[-5, 0, 2]}
          scale={[2, 6, 1]}
          color="#ffffff"
        />
      </Environment>

      <Float
        speed={reducedMotion ? 0 : 1.6}
        rotationIntensity={reducedMotion ? 0 : 0.35}
        floatIntensity={reducedMotion ? 0 : 0.7}
      >
        {/* Remounting on shape change restarts the entry animation. */}
        <Solid key={shape} shape={shape} />
      </Float>

      {tier === "high" ? (
        <EffectComposer enableNormalPass={false}>
          <Bloom
            intensity={0.7}
            luminanceThreshold={0.4}
            luminanceSmoothing={0.85}
            mipmapBlur
          />
        </EffectComposer>
      ) : null}
    </>
  );
}
