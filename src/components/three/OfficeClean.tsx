"use client";

import { useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
import * as THREE from "three";
import { useDeviceTier } from "@/hooks/useDeviceTier";
import { dotTexture } from "@/lib/dot-texture";
import {
  clamp01,
  smoothstep,
  MOP,
  SHINE,
  VACUUM,
  WIPE,
} from "@/lib/clean-sequence";

/* -------------------------------------------------------------------------- */
/* Timeline                                                                    */
/* -------------------------------------------------------------------------- */

/* Windows live in lib/clean-sequence so the copy beside the canvas and the
   scene itself are driven by exactly the same numbers. */


/** Deterministic pseudo-random — same layout every load, no hydration drift. */
function rand(i: number, salt = 1) {
  return Math.abs(Math.sin(i * 127.1 * salt + salt * 311.7) * 43758.5453) % 1;
}

/* -------------------------------------------------------------------------- */
/* Palette                                                                     */
/* -------------------------------------------------------------------------- */

const AQUA = "#2fd4c4";
const AQUA_SOFT = "#7df3e4";

const DESK_DIRTY = new THREE.Color("#6d675b");
const DESK_CLEAN = new THREE.Color("#e7ebf3");
const FLOOR_DIRTY = new THREE.Color("#34322d");
const FLOOR_CLEAN = new THREE.Color("#2c344a");
const WALL_DIRTY = new THREE.Color("#2a2a28");
const WALL_CLEAN = new THREE.Color("#39415a");

/* -------------------------------------------------------------------------- */
/* Camera                                                                      */
/* -------------------------------------------------------------------------- */

type Key = { at: number; pos: [number, number, number]; look: [number, number, number] };

/** Each pass gets the framing that actually shows it: the desk for the wipe,
 *  the floor for the vacuum, a low raking angle for the mop's gloss. */
const KEYS: Key[] = [
  // Establish
  { at: 0.0, pos: [8.2, 5.2, 9.6], look: [0, 1.1, -1] },
  { at: 0.05, pos: [6.4, 4.1, 7.6], look: [-0.4, 1.1, -1] },
  // Pass 1 — push in on the desk, then drift along it
  { at: 0.14, pos: [2.2, 2.6, 3.8], look: [-1.35, 1.0, -1.1] },
  { at: 0.23, pos: [1.2, 2.2, 3.0], look: [-1.5, 0.95, -1.15] },
  { at: 0.29, pos: [3.0, 2.6, 4.4], look: [-0.6, 0.6, -0.6] },
  // Pass 2 — drop to the floor
  { at: 0.38, pos: [4.4, 2.0, 5.0], look: [0.2, 0.15, 0.3] },
  { at: 0.47, pos: [3.6, 1.7, 4.6], look: [-0.1, 0.1, 0.4] },
  { at: 0.53, pos: [3.2, 1.6, 4.4], look: [-0.2, 0.1, 0.3] },
  // Pass 3 — rake low across the wet floor
  { at: 0.62, pos: [2.9, 1.3, 4.2], look: [-0.3, 0.1, 0.1] },
  { at: 0.71, pos: [3.4, 1.15, 4.6], look: [0.1, 0.12, 0.2] },
  // Pass 4 — lift away and resolve the room
  { at: 0.83, pos: [4.6, 2.3, 6.4], look: [0, 0.9, -0.9] },
  { at: 0.95, pos: [6.0, 3.1, 8.2], look: [0, 1.5, -1.5] },
  { at: 1.0, pos: [6.6, 3.35, 8.9], look: [0, 1.6, -1.7] },
];

function CameraRig({
  progress,
  reducedMotion,
}: {
  progress: RefObject<number>;
  reducedMotion: boolean;
}) {
  // Mutated every frame, so these are refs rather than memos.
  const posTarget = useRef(new THREE.Vector3()).current;
  const lookTarget = useRef(new THREE.Vector3()).current;
  const lookCurrent = useRef(new THREE.Vector3(0, 1.1, -1)).current;
  const a = useRef(new THREE.Vector3()).current;
  const b = useRef(new THREE.Vector3()).current;

  useFrame(({ camera, pointer }, delta) => {
    const p = clamp01(progress.current ?? 0);

    let i = 0;
    while (i < KEYS.length - 2 && p > KEYS[i + 1].at) i++;
    const from = KEYS[i];
    const to = KEYS[i + 1];
    const span = Math.max(0.0001, to.at - from.at);
    const raw = clamp01((p - from.at) / span);
    // Cubic in/out — gentler at each keyframe boundary than smoothstep, so
    // a long chain of beats reads as one continuous move.
    const t = raw < 0.5 ? 4 * raw * raw * raw : 1 - Math.pow(-2 * raw + 2, 3) / 2;

    a.set(...from.pos);
    b.set(...to.pos);
    posTarget.copy(a).lerp(b, t);

    a.set(...from.look);
    b.set(...to.look);
    lookTarget.copy(a).lerp(b, t);

    if (!reducedMotion) {
      // A little parallax so the frame never feels locked off.
      posTarget.x += pointer.x * 0.45;
      posTarget.y += pointer.y * 0.28;
    }

    const damp = 1 - Math.pow(0.004, delta);
    camera.position.lerp(posTarget, damp);
    lookCurrent.lerp(lookTarget, damp);
    camera.lookAt(lookCurrent);
  });

  return null;
}

/* -------------------------------------------------------------------------- */
/* Room                                                                        */
/* -------------------------------------------------------------------------- */

function Room({ progress }: { progress: RefObject<number> }) {
  const floor = useRef<THREE.MeshPhysicalMaterial>(null);
  const wallBack = useRef<THREE.MeshStandardMaterial>(null);
  const wallLeft = useRef<THREE.MeshStandardMaterial>(null);
  const window = useRef<THREE.MeshBasicMaterial>(null);
  const scratch = useRef(new THREE.Color()).current;

  useFrame(() => {
    const p = clamp01(progress.current ?? 0);
    const vacuumed = smoothstep(VACUUM, p);
    const mopped = smoothstep(MOP, p);
    const shine = smoothstep(SHINE, p);

    if (floor.current) {
      // Vacuuming lifts the grime colour; mopping is what brings the gloss.
      const clean = Math.max(vacuumed * 0.55, mopped);
      floor.current.color.copy(FLOOR_DIRTY).lerp(FLOOR_CLEAN, clean);
      floor.current.roughness = 0.94 - mopped * 0.86;
      floor.current.clearcoat = mopped;
      floor.current.clearcoatRoughness = 0.35 - mopped * 0.3;
      floor.current.metalness = 0.05 + mopped * 0.16;
      floor.current.envMapIntensity = 0.4 + mopped * 1.9 + shine * 0.6;
    }

    const wallClean = Math.max(smoothstep(WIPE, p) * 0.5, shine);
    if (wallBack.current) {
      wallBack.current.color.copy(WALL_DIRTY).lerp(WALL_CLEAN, wallClean);
    }
    if (wallLeft.current) {
      wallLeft.current.color.copy(WALL_DIRTY).lerp(WALL_CLEAN, wallClean * 0.8);
    }
    if (window.current) {
      // Daylight strengthens as the room resolves.
      scratch.set("#9fd8ff");
      window.current.color.copy(scratch).multiplyScalar(0.55 + shine * 0.85);
    }
  });

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[20, 15]} />
        <meshPhysicalMaterial ref={floor} color={FLOOR_DIRTY} roughness={0.94} />
      </mesh>

      <mesh position={[0, 3, -5.4]}>
        <planeGeometry args={[20, 8]} />
        <meshStandardMaterial ref={wallBack} color={WALL_DIRTY} roughness={0.95} />
      </mesh>

      <mesh position={[-7.6, 3, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[15, 8]} />
        <meshStandardMaterial ref={wallLeft} color={WALL_DIRTY} roughness={0.95} />
      </mesh>

      {/* Window — the room's key light source and its horizon line */}
      <mesh position={[2.6, 2.5, -5.35]}>
        <planeGeometry args={[5.4, 3]} />
        <meshBasicMaterial ref={window} color="#9fd8ff" toneMapped={false} />
      </mesh>
      <mesh position={[2.6, 2.5, -5.3]}>
        <planeGeometry args={[5.6, 3.2]} />
        <meshBasicMaterial color="#0a1420" wireframe />
      </mesh>
    </group>
  );
}

/* -------------------------------------------------------------------------- */
/* Desk                                                                        */
/* -------------------------------------------------------------------------- */

function Desk({ progress }: { progress: RefObject<number> }) {
  const top = useRef<THREE.MeshPhysicalMaterial>(null);
  const screen = useRef<THREE.MeshBasicMaterial>(null);
  const band = useRef<THREE.Mesh>(null);
  const bandMat = useRef<THREE.MeshBasicMaterial>(null);
  const scratch = useRef(new THREE.Color()).current;

  useFrame(() => {
    const p = clamp01(progress.current ?? 0);
    const wiped = smoothstep(WIPE, p);
    const shine = smoothstep(SHINE, p);

    if (top.current) {
      top.current.color.copy(DESK_DIRTY).lerp(DESK_CLEAN, wiped);
      top.current.roughness = 0.92 - wiped * 0.72;
      top.current.clearcoat = wiped * 0.8 + shine * 0.2;
      top.current.envMapIntensity = 0.5 + wiped * 1.2 + shine * 0.8;
    }

    if (screen.current) {
      scratch.set(AQUA);
      screen.current.color.copy(scratch).multiplyScalar(0.08 + wiped * 0.7 + shine * 0.5);
    }

    // The cloth pass itself: a bright band travelling the length of the desk.
    if (band.current && bandMat.current) {
      const active = p > WIPE[0] && p < WIPE[1] + 0.04;
      band.current.visible = active;
      if (active) {
        band.current.position.x = -1.5 + wiped * 3.1;
        // Fades in and out so it reads as a stroke, not a permanent object.
        bandMat.current.opacity = Math.sin(wiped * Math.PI) * 0.85;
      }
    }
  });

  return (
    <group position={[-1.5, 0, -1.2]}>
      <mesh position={[0, 0.76, 0]} castShadow>
        <boxGeometry args={[3.4, 0.09, 1.5]} />
        <meshPhysicalMaterial ref={top} color={DESK_DIRTY} roughness={0.92} />
      </mesh>

      {/* Wipe stroke */}
      <mesh ref={band} position={[0, 0.815, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.34, 1.5]} />
        <meshBasicMaterial
          ref={bandMat}
          color={AQUA_SOFT}
          transparent
          opacity={0}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      {[-1.55, 1.55].map((x) => (
        <mesh key={x} position={[x, 0.37, 0]}>
          <boxGeometry args={[0.09, 0.74, 1.3]} />
          <meshStandardMaterial color="#1b1f2b" roughness={0.6} metalness={0.5} />
        </mesh>
      ))}

      {/* Monitor */}
      <group position={[0.15, 0.8, -0.35]}>
        <mesh position={[0, 0.09, 0]}>
          <boxGeometry args={[0.45, 0.05, 0.3]} />
          <meshStandardMaterial color="#161a24" roughness={0.5} metalness={0.6} />
        </mesh>
        <mesh position={[0, 0.34, 0]}>
          <boxGeometry args={[0.07, 0.44, 0.07]} />
          <meshStandardMaterial color="#161a24" roughness={0.5} metalness={0.6} />
        </mesh>
        <mesh position={[0, 0.82, 0]}>
          <boxGeometry args={[1.55, 0.92, 0.05]} />
          <meshStandardMaterial color="#12151d" roughness={0.45} metalness={0.4} />
        </mesh>
        <mesh position={[0, 0.82, 0.031]}>
          <planeGeometry args={[1.42, 0.8]} />
          <meshBasicMaterial ref={screen} color={AQUA} toneMapped={false} />
        </mesh>
      </group>

      {/* Keyboard and mug — small props that sell the scale */}
      <mesh position={[0.1, 0.82, 0.35]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.1, 0.36]} />
        <meshStandardMaterial color="#20242f" roughness={0.7} />
      </mesh>
      <mesh position={[-1.05, 0.88, 0.3]}>
        <cylinderGeometry args={[0.11, 0.09, 0.19, 20]} />
        <meshStandardMaterial color="#c9d2e4" roughness={0.4} />
      </mesh>
    </group>
  );
}

/* -------------------------------------------------------------------------- */
/* Chair and plant — silhouette, not detail                                    */
/* -------------------------------------------------------------------------- */

function Props() {
  return (
    <group>
      <group position={[-1.3, 0, 0.75]} rotation={[0, -0.45, 0]}>
        <mesh position={[0, 0.47, 0]}>
          <boxGeometry args={[0.62, 0.1, 0.6]} />
          <meshStandardMaterial color="#1e232f" roughness={0.75} />
        </mesh>
        <mesh position={[0, 0.82, -0.27]} rotation={[0.16, 0, 0]}>
          <boxGeometry args={[0.6, 0.66, 0.09]} />
          <meshStandardMaterial color="#1e232f" roughness={0.75} />
        </mesh>
        <mesh position={[0, 0.24, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 0.46, 12]} />
          <meshStandardMaterial color="#141821" roughness={0.5} metalness={0.6} />
        </mesh>
        <mesh position={[0, 0.03, 0]}>
          <cylinderGeometry args={[0.34, 0.34, 0.05, 20]} />
          <meshStandardMaterial color="#141821" roughness={0.5} metalness={0.6} />
        </mesh>
      </group>

      <group position={[3.4, 0, -3.5]}>
        <mesh position={[0, 0.26, 0]}>
          <cylinderGeometry args={[0.28, 0.22, 0.52, 16]} />
          <meshStandardMaterial color="#2b3040" roughness={0.85} />
        </mesh>
        {[0, 1, 2, 3, 4].map((i) => (
          <mesh
            key={i}
            position={[
              Math.cos((i / 5) * Math.PI * 2) * 0.2,
              0.72 + rand(i, 3) * 0.35,
              Math.sin((i / 5) * Math.PI * 2) * 0.2,
            ]}
            rotation={[rand(i, 5) * 0.7 - 0.35, i, rand(i, 7) * 0.7 - 0.35]}
          >
            <coneGeometry args={[0.14, 0.62, 6]} />
            <meshStandardMaterial color="#2f6d55" roughness={0.8} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/* -------------------------------------------------------------------------- */
/* Pass 1 — dust lifted by the wipe                                            */
/* -------------------------------------------------------------------------- */

function DustMotes({
  progress,
  count,
}: {
  progress: RefObject<number>;
  count: number;
}) {
  const points = useRef<THREE.Points>(null);
  const material = useRef<THREE.PointsMaterial>(null);
  const dot = useMemo(() => dotTexture(), []);

  const { positions, base } = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = -3.2 + rand(i, 1) * 3.6;
      arr[i * 3 + 1] = 0.9 + rand(i, 2) * 1.3;
      arr[i * 3 + 2] = -2.2 + rand(i, 3) * 2.2;
    }
    return { positions: arr, base: arr.slice() };
  }, [count]);

  useFrame(({ clock }) => {
    const p = clamp01(progress.current ?? 0);
    const wiped = smoothstep(WIPE, p);
    const t = clock.getElapsedTime();

    if (material.current) {
      // Present before the wipe, gone after it.
      material.current.opacity = (1 - wiped) * 0.5;
    }

    const geo = points.current?.geometry;
    if (!geo) return;
    const attr = geo.getAttribute("position") as THREE.BufferAttribute;
    for (let i = 0; i < attr.count; i++) {
      const drift = Math.sin(t * 0.4 + i) * 0.06;
      attr.setY(i, base[i * 3 + 1] + drift + wiped * (0.6 + rand(i, 9) * 1.4));
      attr.setX(i, base[i * 3] + Math.sin(t * 0.3 + i * 2) * 0.05);
    }
    attr.needsUpdate = true;
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        ref={material}
        size={0.06}
        map={dot}
        alphaMap={dot}
        color="#cbbfa4"
        transparent
        opacity={0.5}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

/* -------------------------------------------------------------------------- */
/* Pass 2 — floor debris drawn into the vacuum                                 */
/* -------------------------------------------------------------------------- */

function Debris({
  progress,
  count,
}: {
  progress: RefObject<number>;
  count: number;
}) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const dummy = useRef(new THREE.Object3D()).current;
  const nozzle = useRef(new THREE.Vector3()).current;

  const spots = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        x: -6 + rand(i, 1) * 11,
        z: -4.2 + rand(i, 2) * 7.5,
        s: 0.035 + rand(i, 4) * 0.055,
        // Staggered so the floor clears as a sweep rather than all at once.
        threshold: rand(i, 6) * 0.82,
      })),
    [count],
  );

  useFrame(() => {
    if (!mesh.current) return;
    const p = clamp01(progress.current ?? 0);
    const vac = smoothstep(VACUUM, p);

    // The vacuum head tracks back and forth across the room.
    nozzle.set(-5.2 + vac * 10.4, 0.06, Math.sin(vac * Math.PI * 2.6) * 2.4);

    for (let i = 0; i < spots.length; i++) {
      const spot = spots[i];
      const local = clamp01((vac - spot.threshold) / 0.16);
      const eased = local * local;

      dummy.position.set(
        spot.x + (nozzle.x - spot.x) * eased,
        0.03 + eased * 0.28,
        spot.z + (nozzle.z - spot.z) * eased,
      );
      const scale = spot.s * (1 - eased);
      dummy.scale.setScalar(Math.max(scale, 0.0001));
      dummy.rotation.set(i, i * 2, i * 3);
      dummy.updateMatrix();
      mesh.current.setMatrixAt(i, dummy.matrix);
    }
    mesh.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]}>
      <dodecahedronGeometry args={[1, 0]} />
      <meshStandardMaterial color="#8a7c63" roughness={0.95} />
    </instancedMesh>
  );
}

/* -------------------------------------------------------------------------- */
/* Pass 3 — the wet edge the mop leaves behind                                 */
/* -------------------------------------------------------------------------- */

function MopPass({ progress }: { progress: RefObject<number> }) {
  const band = useRef<THREE.Mesh>(null);
  const mat = useRef<THREE.MeshBasicMaterial>(null);

  useFrame(({ clock }) => {
    const p = clamp01(progress.current ?? 0);
    const mopped = smoothstep(MOP, p);
    const active = p > MOP[0] - 0.02 && p < MOP[1] + 0.05;

    if (band.current) {
      band.current.visible = active;
      // Swept across the floor the camera can actually see, and kept in front
      // of the desk so it is never hidden behind it.
      band.current.position.x = -3.6 + mopped * 8.8;
      band.current.position.z = 0.6 + Math.sin(mopped * Math.PI * 1.6) * 0.8;
    }
    if (mat.current && active) {
      mat.current.opacity =
        Math.sin(mopped * Math.PI) * (0.85 + Math.sin(clock.getElapsedTime() * 4) * 0.1);
    }
  });

  return (
    <mesh ref={band} position={[0, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
      <planeGeometry args={[2.1, 9]} />
      <meshBasicMaterial
        ref={mat}
        color={AQUA}
        transparent
        opacity={0}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}

/* -------------------------------------------------------------------------- */
/* Pass 4 — glints on the finished room                                        */
/* -------------------------------------------------------------------------- */

function Glints({
  progress,
  count,
}: {
  progress: RefObject<number>;
  count: number;
}) {
  const points = useRef<THREE.Points>(null);
  const material = useRef<THREE.PointsMaterial>(null);
  const dot = useMemo(() => dotTexture(), []);

  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = -6 + rand(i, 11) * 11;
      arr[i * 3 + 1] = 0.1 + rand(i, 12) * 3.2;
      arr[i * 3 + 2] = -4.5 + rand(i, 13) * 7;
    }
    return arr;
  }, [count]);

  useFrame(({ clock }) => {
    const p = clamp01(progress.current ?? 0);
    const shine = smoothstep(SHINE, p);
    if (material.current) {
      const twinkle = 0.6 + Math.sin(clock.getElapsedTime() * 3) * 0.25;
      material.current.opacity = shine * twinkle;
      material.current.size = 0.07 + shine * 0.08;
    }
    if (points.current) points.current.rotation.y = clock.getElapsedTime() * 0.03;
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        ref={material}
        size={0.05}
        map={dot}
        alphaMap={dot}
        color={AQUA_SOFT}
        transparent
        opacity={0}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </points>
  );
}

/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */

/** Ramps the room's light with the final pass, so the payoff reads as a
 *  brighter room rather than the same room with glitter on it. */
function LightRig({ progress }: { progress: RefObject<number> }) {
  const ambient = useRef<THREE.AmbientLight>(null);
  const key = useRef<THREE.DirectionalLight>(null);
  const fill = useRef<THREE.PointLight>(null);

  useFrame(() => {
    const p = clamp01(progress.current ?? 0);
    const shine = smoothstep(SHINE, p);
    const mopped = smoothstep(MOP, p);
    const lift = Math.max(shine, mopped * 0.4);

    if (ambient.current) ambient.current.intensity = 0.3 + lift * 0.4;
    if (key.current) key.current.intensity = 1.05 + lift * 0.85;
    if (fill.current) fill.current.intensity = 7 + shine * 7;
  });

  return (
    <>
      <ambientLight ref={ambient} intensity={0.3} />
      <directionalLight
        ref={key}
        position={[4, 7, 3]}
        intensity={1.05}
        color="#dceaff"
      />
      <pointLight
        position={[2.6, 3.4, -4.6]}
        intensity={9}
        distance={16}
        decay={2}
        color="#9fd8ff"
      />
      <pointLight
        ref={fill}
        position={[-3, 2.4, 2]}
        intensity={7}
        distance={14}
        decay={2}
        color={AQUA}
      />
    </>
  );
}

/* -------------------------------------------------------------------------- */

export default function OfficeClean({ progress }: { progress: RefObject<number> }) {
  const { tier, reducedMotion } = useDeviceTier();

  const debrisCount = tier === "high" ? 150 : tier === "mid" ? 90 : 45;
  const dustCount = tier === "high" ? 130 : tier === "mid" ? 70 : 35;
  const glintCount = tier === "high" ? 110 : tier === "mid" ? 60 : 30;

  return (
    <>
      <CameraRig progress={progress} reducedMotion={reducedMotion} />

      <LightRig progress={progress} />

      <Environment resolution={tier === "high" ? 256 : 128} frames={1}>
        <Lightformer intensity={2.2} position={[3, 4, -5]} scale={[7, 4, 1]} color="#cfe6ff" />
        <Lightformer intensity={1.3} position={[-6, 3, 3]} scale={[3, 6, 1]} color={AQUA_SOFT} />
        <Lightformer intensity={0.9} position={[5, 1, 5]} scale={[4, 3, 1]} color="#ffffff" />
      </Environment>

      <Room progress={progress} />
      <Desk progress={progress} />
      <Props />

      <DustMotes progress={progress} count={dustCount} />
      <Debris progress={progress} count={debrisCount} />
      <MopPass progress={progress} />
      <Glints progress={progress} count={glintCount} />

      {tier !== "low" ? (
        <EffectComposer enableNormalPass={false}>
          <Bloom
            intensity={tier === "high" ? 0.7 : 0.42}
            luminanceThreshold={0.5}
            luminanceSmoothing={0.9}
            mipmapBlur
          />
          <Vignette eskil={false} offset={0.24} darkness={0.82} />
        </EffectComposer>
      ) : null}
    </>
  );
}
