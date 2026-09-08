"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  Environment,
  Lightformer,
  MeshTransmissionMaterial,
  Sparkles,
} from "@react-three/drei";
import {
  Bloom,
  ChromaticAberration,
  EffectComposer,
  Vignette,
} from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import * as THREE from "three";
import HeroFrame from "./HeroFrame";
import { divisions } from "@/content/site";
import { useDeviceTier, type DeviceTier } from "@/hooks/useDeviceTier";
import { clamp } from "@/lib/utils";

const GOLD = "#c8a45c";
const GOLD_SOFT = "#e8d5a3";

/* -------------------------------------------------------------------------- */

/**
 * The group itself: a single faceted mass that refracts everything around it.
 * One core, many divisions orbiting — the whole metaphor of the page.
 */
function CrystalCore({ tier }: { tier: DeviceTier }) {
  const mesh = useRef<THREE.Mesh>(null);
  const inner = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (mesh.current) {
      mesh.current.rotation.y = t * 0.16;
      mesh.current.rotation.x = Math.sin(t * 0.22) * 0.14;
      // A slow breath, so the core never reads as a static render.
      const breath = 1 + Math.sin(t * 0.7) * 0.02;
      mesh.current.scale.setScalar(breath);
    }
    if (inner.current) {
      inner.current.rotation.y = -t * 0.3;
      inner.current.rotation.z = t * 0.12;
    }
  });

  return (
    <group>
      <mesh ref={mesh}>
        <icosahedronGeometry args={[1.35, 0]} />
        {tier === "high" ? (
          <MeshTransmissionMaterial
            samples={6}
            resolution={512}
            thickness={1.6}
            roughness={0.06}
            anisotropy={0.4}
            chromaticAberration={0.28}
            distortion={0.25}
            distortionScale={0.4}
            temporalDistortion={0.08}
            ior={1.7}
            color={GOLD_SOFT}
            background={new THREE.Color("#04060c")}
          />
        ) : (
          /* Transmission is the single most expensive material we use.
             Mid/low devices get a physical approximation instead. */
          <meshPhysicalMaterial
            color={GOLD_SOFT}
            metalness={0.35}
            roughness={0.15}
            transmission={0.75}
            thickness={1.2}
            ior={1.6}
            clearcoat={1}
            clearcoatRoughness={0.15}
          />
        )}
      </mesh>

      {/* Molten inner shard, visible through the shell */}
      <mesh ref={inner} scale={0.52}>
        <octahedronGeometry args={[1, 0]} />
        <meshStandardMaterial
          color={GOLD}
          emissive={GOLD}
          emissiveIntensity={2.4}
          roughness={0.3}
          metalness={0.9}
        />
      </mesh>

      {/* Faceted cage — reads as engineering, not decoration */}
      <mesh scale={1.9}>
        <icosahedronGeometry args={[1, 1]} />
        <meshBasicMaterial
          color={GOLD}
          wireframe
          transparent
          opacity={0.07}
        />
      </mesh>
    </group>
  );
}

/* -------------------------------------------------------------------------- */

/** One division, orbiting the group core on its own inclined ring. */
function DivisionNode({
  index,
  total,
  color,
  dimmed,
}: {
  index: number;
  total: number;
  color: string;
  dimmed: boolean;
}) {
  const pivot = useRef<THREE.Group>(null);
  const node = useRef<THREE.Mesh>(null);

  const { radius, speed, tilt, phase } = useMemo(
    () => ({
      radius: 2.5 + index * 0.42,
      speed: 0.34 - index * 0.045,
      tilt: (index / total) * Math.PI * 0.55 - 0.3,
      phase: (index / total) * Math.PI * 2,
    }),
    [index, total],
  );

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (pivot.current) pivot.current.rotation.y = t * speed + phase;
    if (node.current) {
      node.current.position.y = Math.sin(t * 0.9 + phase) * 0.12;
    }
  });

  return (
    <group rotation={[tilt, 0, tilt * 0.5]}>
      {/* Orbit path */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[radius - 0.005, radius + 0.005, 128]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={dimmed ? 0.05 : 0.13}
          side={THREE.DoubleSide}
        />
      </mesh>

      <group ref={pivot}>
        <mesh ref={node} position={[radius, 0, 0]}>
          <sphereGeometry args={[dimmed ? 0.055 : 0.085, 20, 20]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={dimmed ? 1.2 : 3.5}
            roughness={0.2}
          />
        </mesh>
      </group>
    </group>
  );
}

/* -------------------------------------------------------------------------- */

/** Cursor parallax + a slow pull-back as the hero scrolls away. */
function CameraRig({ reducedMotion }: { reducedMotion: boolean }) {
  const target = useMemo(() => new THREE.Vector3(), []);

  useFrame(({ camera, pointer }, delta) => {
    const scrolled = clamp(
      window.scrollY / Math.max(window.innerHeight, 1),
      0,
      1,
    );

    if (reducedMotion) {
      camera.position.set(0, 0, 6.4);
      camera.lookAt(0, 0, 0);
      return;
    }

    target.set(
      pointer.x * 1.15,
      pointer.y * 0.7 + scrolled * 1.2,
      6.4 + scrolled * 2.6,
    );

    // Frame-rate independent damping.
    camera.position.lerp(target, 1 - Math.pow(0.0015, delta));
    camera.lookAt(0, scrolled * 0.4, 0);
  });

  return null;
}

/* -------------------------------------------------------------------------- */

export default function GroupCore() {
  const { tier, reducedMotion } = useDeviceTier();

  return (
    <>
      <CameraRig reducedMotion={reducedMotion} />

      <ambientLight intensity={0.35} />
      <directionalLight position={[5, 6, 4]} intensity={1.6} color={GOLD_SOFT} />
      <pointLight position={[-4, -2, -3]} intensity={22} color="#4a6bd8" />
      <pointLight position={[3, -3, 2]} intensity={14} color={GOLD} />

      {/* Studio lighting built from lightformers — no external HDRI to fetch,
          so the scene is fully self-contained and offline-safe. */}
      <Environment resolution={tier === "high" ? 256 : 128} frames={1}>
        <Lightformer
          intensity={2.4}
          position={[0, 5, -6]}
          scale={[10, 6, 1]}
          color={GOLD_SOFT}
        />
        <Lightformer
          intensity={1.6}
          position={[-6, 1, -2]}
          scale={[3, 8, 1]}
          color="#6b8cff"
        />
        <Lightformer
          intensity={1.2}
          position={[6, -2, 2]}
          scale={[4, 6, 1]}
          color={GOLD}
        />
      </Environment>

      <HeroFrame>
        <CrystalCore tier={tier} />

        {divisions.map((division, index) => (
          <DivisionNode
            key={division.slug}
            index={index}
            total={divisions.length}
            color={division.accent}
            dimmed={division.status !== "operating"}
          />
        ))}
      </HeroFrame>

      {tier !== "low" ? (
        <Sparkles
          count={tier === "high" ? 90 : 45}
          scale={11}
          size={1.6}
          speed={0.28}
          opacity={0.5}
          color={GOLD_SOFT}
        />
      ) : null}

      {tier !== "low" ? (
        <EffectComposer enableNormalPass={false}>
          <Bloom
            intensity={tier === "high" ? 0.85 : 0.5}
            luminanceThreshold={0.35}
            luminanceSmoothing={0.85}
            mipmapBlur
          />
          <ChromaticAberration
            offset={new THREE.Vector2(0.0006, 0.0009)}
            blendFunction={BlendFunction.NORMAL}
            radialModulation={false}
            modulationOffset={0}
          />
          <Vignette eskil={false} offset={0.25} darkness={0.85} />
        </EffectComposer>
      ) : null}
    </>
  );
}
