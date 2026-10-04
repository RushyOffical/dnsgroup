"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  Environment,
  Lightformer,
  MeshTransmissionMaterial,
  Sparkles,
} from "@react-three/drei";
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
import * as THREE from "three";
import HeroFrame from "./HeroFrame";
import { useDeviceTier, type DeviceTier } from "@/hooks/useDeviceTier";
import { clamp } from "@/lib/utils";

const AQUA = "#2fd4c4";
const AQUA_SOFT = "#7df3e4";

/* -------------------------------------------------------------------------- */

/**
 * A soap bubble. Iridescence does the heavy lifting — it's what separates a
 * bubble from a glass ball, and it's cheap compared to real transmission.
 */
function Bubble({
  seed,
  radius,
  origin,
  speed,
}: {
  seed: number;
  radius: number;
  origin: [number, number, number];
  speed: number;
}) {
  const mesh = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!mesh.current) return;
    const t = clock.getElapsedTime();

    // Rise, then wrap back to the bottom — an endless column of bubbles
    // without ever allocating a new object.
    const travel = ((t * speed + seed * 3.1) % 9) - 4.5;
    mesh.current.position.set(
      origin[0] + Math.sin(t * 0.5 + seed * 2.4) * 0.45,
      travel,
      origin[2] + Math.cos(t * 0.38 + seed) * 0.35,
    );

    // Bubbles wobble; they don't spin like solids.
    const wobble = 1 + Math.sin(t * 1.6 + seed * 5) * 0.045;
    mesh.current.scale.set(wobble, 2 - wobble, wobble);
    mesh.current.rotation.y = t * 0.2 + seed;
  });

  return (
    <mesh ref={mesh} position={origin}>
      <sphereGeometry args={[radius, 32, 32]} />
      <meshPhysicalMaterial
        transmission={1}
        thickness={0.25}
        roughness={0.04}
        ior={1.32}
        iridescence={1}
        iridescenceIOR={1.8}
        iridescenceThicknessRange={[100, 780]}
        transparent
        opacity={0.85}
        color={AQUA_SOFT}
        metalness={0}
        clearcoat={1}
      />
    </mesh>
  );
}

/* -------------------------------------------------------------------------- */

/** The centrepiece droplet — clean water, given weight. */
function Droplet({ tier }: { tier: DeviceTier }) {
  const mesh = useRef<THREE.Mesh>(null);
  const ring = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (mesh.current) {
      mesh.current.rotation.y = t * 0.24;
      mesh.current.position.y = Math.sin(t * 0.6) * 0.09;
      const squash = 1 + Math.sin(t * 1.1) * 0.03;
      mesh.current.scale.set(squash, 2 - squash, squash);
    }
    if (ring.current) {
      ring.current.rotation.z = t * 0.4;
      ring.current.rotation.x = Math.PI / 2 + Math.sin(t * 0.5) * 0.25;
    }
  });

  return (
    <group>
      <mesh ref={mesh}>
        <sphereGeometry args={[1.3, 64, 64]} />
        {tier === "high" ? (
          <MeshTransmissionMaterial
            samples={6}
            resolution={512}
            thickness={2.2}
            roughness={0.02}
            chromaticAberration={0.4}
            anisotropy={0.25}
            distortion={0.18}
            distortionScale={0.5}
            temporalDistortion={0.12}
            ior={1.42}
            color={AQUA_SOFT}
            background={new THREE.Color("#04060c")}
          />
        ) : (
          <meshPhysicalMaterial
            color={AQUA_SOFT}
            transmission={0.9}
            thickness={1.4}
            roughness={0.08}
            ior={1.4}
            iridescence={0.6}
            clearcoat={1}
          />
        )}
      </mesh>

      {/* Surface-tension ring */}
      <mesh ref={ring} scale={1.85}>
        <torusGeometry args={[1, 0.006, 8, 160]} />
        <meshBasicMaterial color={AQUA} transparent opacity={0.35} />
      </mesh>
    </group>
  );
}

/* -------------------------------------------------------------------------- */

function CameraRig({ reducedMotion }: { reducedMotion: boolean }) {
  const target = useMemo(() => new THREE.Vector3(), []);

  useFrame(({ camera, pointer }, delta) => {
    if (reducedMotion) {
      camera.position.set(0, 0, 6.2);
      camera.lookAt(0, 0, 0);
      return;
    }
    const scrolled = clamp(
      window.scrollY / Math.max(window.innerHeight, 1),
      0,
      1,
    );
    target.set(
      pointer.x * 0.9,
      pointer.y * 0.55 + scrolled * 1.4,
      6.2 + scrolled * 2.2,
    );
    camera.position.lerp(target, 1 - Math.pow(0.0018, delta));
    camera.lookAt(0, scrolled * 0.3, 0);
  });

  return null;
}

/* -------------------------------------------------------------------------- */

export default function CleaningField() {
  const { tier, reducedMotion } = useDeviceTier();

  const bubbleCount = tier === "high" ? 10 : tier === "mid" ? 6 : 3;

  const bubbles = useMemo(
    () =>
      Array.from({ length: bubbleCount }, (_, i) => {
        // Deterministic pseudo-random: same layout every render, no hydration
        // mismatch, no Math.random() in a component body.
        const seed = (Math.sin(i * 127.1) * 43758.5453) % 1;
        const abs = Math.abs(seed);
        return {
          seed: abs,
          radius: 0.16 + abs * 0.3,
          origin: [
            (abs - 0.5) * 8.5,
            0,
            -1.5 - abs * 3,
          ] as [number, number, number],
          speed: 0.35 + abs * 0.5,
        };
      }),
    [bubbleCount],
  );

  return (
    <>
      <CameraRig reducedMotion={reducedMotion} />

      <ambientLight intensity={0.4} />
      <directionalLight position={[4, 6, 5]} intensity={1.5} color="#ffffff" />
      <pointLight position={[-5, 2, -2]} intensity={26} color={AQUA} />
      <pointLight position={[4, -3, 3]} intensity={16} color="#4aa8ff" />

      <Environment resolution={tier === "high" ? 256 : 128} frames={1}>
        <Lightformer
          intensity={3}
          position={[0, 5, -5]}
          scale={[10, 5, 1]}
          color={AQUA_SOFT}
        />
        <Lightformer
          intensity={2}
          position={[-6, 0, 2]}
          scale={[3, 8, 1]}
          color="#ffffff"
        />
        <Lightformer
          intensity={1.4}
          position={[6, -2, 1]}
          scale={[4, 5, 1]}
          color={AQUA}
        />
      </Environment>

      <HeroFrame>
        <Droplet tier={tier} />
      </HeroFrame>

      {/* Bubbles stay in world space — they drift across the whole frame. */}
      {bubbles.map((bubble, i) => (
        <Bubble key={i} {...bubble} />
      ))}

      {tier !== "low" ? (
        <Sparkles
          count={tier === "high" ? 110 : 50}
          scale={12}
          size={1.4}
          speed={0.35}
          opacity={0.45}
          color={AQUA_SOFT}
        />
      ) : null}

      {tier !== "low" ? (
        <EffectComposer enableNormalPass={false}>
          <Bloom
            intensity={tier === "high" ? 0.95 : 0.55}
            luminanceThreshold={0.3}
            luminanceSmoothing={0.9}
            mipmapBlur
          />
          <Vignette eskil={false} offset={0.28} darkness={0.8} />
        </EffectComposer>
      ) : null}
    </>
  );
}
