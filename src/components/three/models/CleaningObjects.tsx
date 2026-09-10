"use client";

import * as THREE from "three";

/**
 * Cleaning equipment, built from primitives.
 *
 * Every service on the site is represented by the thing you'd actually turn
 * up with, rather than an abstract solid. All of it is generated in code —
 * no external model files to fetch, so the scenes stay offline-safe and add
 * nothing to the bundle.
 *
 * Convention: each object is centred on the origin and roughly 2 units tall,
 * so they are interchangeable in the same camera framing.
 */

const AQUA = "#2fd4c4";
const AQUA_SOFT = "#7df3e4";

/* -- Shared materials ------------------------------------------------------ */

function Plastic({ color, ...rest }: { color: string } & Record<string, unknown>) {
  return (
    <meshPhysicalMaterial
      color={color}
      roughness={0.32}
      metalness={0.05}
      clearcoat={0.9}
      clearcoatRoughness={0.18}
      {...rest}
    />
  );
}

function Metal({ color = "#c2cbdb" }: { color?: string }) {
  return <meshStandardMaterial color={color} roughness={0.22} metalness={0.95} />;
}

function Liquid() {
  return (
    <meshPhysicalMaterial
      color={AQUA_SOFT}
      transmission={0.92}
      thickness={0.7}
      roughness={0.06}
      ior={1.33}
      transparent
      opacity={0.9}
    />
  );
}

/* -------------------------------------------------------------------------- */
/* Spray bottle — commercial & office                                          */
/* -------------------------------------------------------------------------- */

export function SprayBottle() {
  return (
    <group position={[0, -0.15, 0]}>
      {/* Body, slightly tapered like a real trigger bottle */}
      <mesh position={[0, 0.05, 0]}>
        <cylinderGeometry args={[0.42, 0.48, 1.15, 32]} />
        <Plastic color="#eef2f9" transparent opacity={0.4} transmission={0.85} thickness={0.25} />
      </mesh>

      {/* Fluid level, sitting below the shoulder */}
      <mesh position={[0, -0.08, 0]}>
        <cylinderGeometry args={[0.38, 0.44, 0.78, 32]} />
        <Liquid />
      </mesh>

      {/* Shoulder into the neck */}
      <mesh position={[0, 0.72, 0]}>
        <cylinderGeometry args={[0.19, 0.42, 0.28, 32]} />
        <Plastic color="#eef2f9" transparent opacity={0.45} transmission={0.7} thickness={0.2} />
      </mesh>
      <mesh position={[0, 0.92, 0]}>
        <cylinderGeometry args={[0.17, 0.17, 0.16, 24]} />
        <Plastic color={AQUA} />
      </mesh>

      {/* Trigger head */}
      <group position={[0, 1.08, 0]}>
        <mesh position={[0.02, 0.06, 0]}>
          <boxGeometry args={[0.5, 0.22, 0.26]} />
          <Plastic color={AQUA} />
        </mesh>
        {/* Nozzle */}
        <mesh position={[0.3, 0.08, 0]} rotation={[0, 0, -Math.PI / 2]}>
          <cylinderGeometry args={[0.06, 0.08, 0.24, 16]} />
          <Plastic color="#1d2430" />
        </mesh>
        {/* Trigger, angled back under the head */}
        <mesh position={[-0.13, -0.11, 0]} rotation={[0, 0, 0.5]}>
          <boxGeometry args={[0.1, 0.3, 0.16]} />
          <Plastic color="#1d2430" />
        </mesh>
      </group>

      {/* Dip tube */}
      <mesh position={[0, 0.1, 0]}>
        <cylinderGeometry args={[0.022, 0.022, 1.1, 10]} />
        <meshStandardMaterial color="#dfe6f2" roughness={0.4} />
      </mesh>
    </group>
  );
}

/* -------------------------------------------------------------------------- */
/* Mop and bucket — deep clean                                                 */
/* -------------------------------------------------------------------------- */

export function MopBucket() {
  return (
    <group position={[0, -0.5, 0]}>
      {/* Bucket wall, open topped */}
      <mesh position={[0, 0.4, 0]}>
        <cylinderGeometry args={[0.62, 0.48, 0.8, 32, 1, true]} />
        <meshPhysicalMaterial
          color="#39445c"
          roughness={0.34}
          metalness={0.1}
          clearcoat={0.8}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh position={[0, 0.02, 0]}>
        <cylinderGeometry args={[0.48, 0.48, 0.05, 32]} />
        <Plastic color="#2e3850" />
      </mesh>
      {/* Rim */}
      <mesh position={[0, 0.8, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.62, 0.035, 12, 40]} />
        <Plastic color="#2e3850" />
      </mesh>

      {/* Water, with suds on top */}
      <mesh position={[0, 0.55, 0]}>
        <cylinderGeometry args={[0.575, 0.5, 0.42, 32]} />
        <Liquid />
      </mesh>
      {[...Array(9)].map((_, i) => {
        const a = (i / 9) * Math.PI * 2;
        const r = 0.16 + (i % 3) * 0.15;
        return (
          <mesh
            key={i}
            position={[Math.cos(a) * r, 0.78 + (i % 2) * 0.05, Math.sin(a) * r]}
          >
            <sphereGeometry args={[0.07 + (i % 3) * 0.026, 16, 16]} />
            <meshPhysicalMaterial
              color="#ffffff"
              transmission={1}
              thickness={0.12}
              roughness={0.04}
              ior={1.3}
              iridescence={1}
              iridescenceIOR={1.7}
              transparent
              opacity={0.75}
            />
          </mesh>
        );
      })}

      {/* Carry handle */}
      <mesh position={[0, 0.86, 0]} rotation={[0, 0, 0]}>
        <torusGeometry args={[0.6, 0.022, 10, 32, Math.PI]} />
        <Metal />
      </mesh>

      {/* Mop resting in the bucket */}
      <group position={[0.26, 0.9, -0.1]} rotation={[0, 0, -0.34]}>
        <mesh position={[0, 0.72, 0]}>
          <cylinderGeometry args={[0.045, 0.045, 1.9, 16]} />
          <Metal color="#9aa6bb" />
        </mesh>
        <mesh position={[0, 1.72, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 0.22, 12]} />
          <Plastic color={AQUA} />
        </mesh>
        {/* Head strands */}
        <mesh position={[0, -0.28, 0]}>
          <cylinderGeometry args={[0.12, 0.2, 0.18, 16]} />
          <Plastic color="#2e3850" />
        </mesh>
        {[...Array(11)].map((_, i) => {
          const a = (i / 11) * Math.PI * 2;
          const r = 0.055 + (i % 3) * 0.045;
          return (
            <mesh
              key={i}
              position={[Math.cos(a) * r, -0.52, Math.sin(a) * r]}
              rotation={[Math.sin(a) * 0.24, 0, Math.cos(a) * 0.24]}
            >
              <capsuleGeometry args={[0.032, 0.34, 4, 8]} />
              <meshStandardMaterial color="#dfe6f2" roughness={0.85} />
            </mesh>
          );
        })}
      </group>
    </group>
  );
}

/* -------------------------------------------------------------------------- */
/* Vacuum — homes & regular domestic                                           */
/* -------------------------------------------------------------------------- */

export function Vacuum() {
  /* An upright rather than a canister-and-hose. The canister version read as
     a set of disconnected blobs; an upright has one clear silhouette —
     wide head at the floor, body leaning back, handle at the top. */
  return (
    <group position={[0, -1.05, 0]} rotation={[0, 0, 0]}>
      {/* Floor head */}
      <mesh position={[0, 0.1, 0.12]}>
        <boxGeometry args={[0.86, 0.16, 0.42]} />
        <Plastic color={AQUA} />
      </mesh>
      <mesh position={[0, 0.02, 0.12]}>
        <boxGeometry args={[0.8, 0.05, 0.36]} />
        <meshStandardMaterial color="#161b26" roughness={0.9} />
      </mesh>
      {/* Brush strip */}
      <mesh position={[0, 0.04, 0.31]}>
        <boxGeometry args={[0.74, 0.05, 0.04]} />
        <meshStandardMaterial color="#dfe6f2" roughness={0.9} />
      </mesh>
      {[-0.4, 0.4].map((x) => (
        <mesh key={x} position={[x, 0.09, -0.04]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.09, 0.09, 0.06, 18]} />
          <Plastic color="#161b26" />
        </mesh>
      ))}

      {/* Body, leaning back off the head */}
      <group rotation={[-0.2, 0, 0]}>
        <mesh position={[0, 0.52, 0]}>
          <boxGeometry args={[0.5, 0.72, 0.32]} />
          <Plastic color={AQUA} />
        </mesh>
        {/* Motor vent */}
        <mesh position={[0, 0.52, 0.163]}>
          <boxGeometry args={[0.34, 0.3, 0.02]} />
          <meshStandardMaterial color="#161b26" roughness={0.75} />
        </mesh>

        {/* Clear dust cup on the front, with debris settled in it */}
        <mesh position={[0, 0.95, 0.16]}>
          <cylinderGeometry args={[0.21, 0.21, 0.5, 26]} />
          <meshPhysicalMaterial
            color="#eef2f9"
            transmission={0.9}
            thickness={0.3}
            roughness={0.08}
            ior={1.42}
            transparent
            opacity={0.5}
          />
        </mesh>
        <mesh position={[0, 0.78, 0.16]}>
          <cylinderGeometry args={[0.2, 0.2, 0.14, 26]} />
          <meshStandardMaterial color="#8a7c63" roughness={0.95} />
        </mesh>
        <mesh position={[0, 1.21, 0.16]}>
          <cylinderGeometry args={[0.22, 0.22, 0.07, 26]} />
          <Plastic color="#1d2430" />
        </mesh>

        {/* Shaft and handle */}
        <mesh position={[0, 1.34, -0.04]}>
          <cylinderGeometry args={[0.055, 0.055, 1.0, 16]} />
          <Metal color="#aab5c8" />
        </mesh>
        <mesh position={[0, 1.86, -0.04]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.17, 0.05, 12, 28, Math.PI]} />
          <Plastic color="#1d2430" />
        </mesh>
        {/* Cable hooks */}
        {[0.95, 1.55].map((y) => (
          <mesh key={y} position={[0, y, -0.13]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.07, 0.018, 8, 18, Math.PI]} />
            <Plastic color="#1d2430" />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/* -------------------------------------------------------------------------- */
/* Keys — end of lease & bond                                                  */
/* -------------------------------------------------------------------------- */

export function Keys() {
  return (
    /* Tilted so the turntable never catches the set perfectly edge-on. */
    <group position={[0, 0.02, 0]} scale={1.25} rotation={[0.12, 0, 0]}>
      {/* Split ring, facing the viewer — a torus is already in the XY plane,
          so it must NOT be laid flat or the set reads as a flying saucer. */}
      <mesh position={[0, 0.78, 0]}>
        <torusGeometry args={[0.32, 0.032, 14, 44]} />
        <Metal />
      </mesh>

      {/* Agent's tag — the detail that makes this read as a handover */}
      <group position={[0.44, 0.6, 0.03]} rotation={[0, 0, -0.42]}>
        <mesh>
          <boxGeometry args={[0.34, 0.46, 0.03]} />
          <meshPhysicalMaterial color={AQUA} roughness={0.4} clearcoat={0.8} />
        </mesh>
        <mesh position={[0, 0.17, 0.021]}>
          <cylinderGeometry args={[0.035, 0.035, 0.01, 14]} />
          <meshBasicMaterial color="#0a0e1a" />
        </mesh>
        {[0, 1, 2].map((i) => (
          <mesh key={i} position={[0, 0.02 - i * 0.1, 0.02]}>
            <planeGeometry args={[0.2, 0.028]} />
            <meshBasicMaterial color="#0a0e1a" opacity={0.55} transparent />
          </mesh>
        ))}
      </group>

      {/* Three keys hanging off the ring, splayed like a real bunch */}
      {[-0.34, -0.02, 0.3].map((tilt, i) => (
        <group
          key={tilt}
          position={[0, 0.5, (i - 1) * 0.045]}
          rotation={[0, 0, tilt]}
        >
          {/* Bow */}
          <mesh position={[0, -0.06, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.15, 0.15, 0.038, 26]} />
            <Metal color={i === 1 ? "#d8c187" : "#c2cbdb"} />
          </mesh>
          {/* Shaft */}
          <mesh position={[0, -0.46, 0]}>
            <boxGeometry args={[0.1, 0.66, 0.03]} />
            <Metal color={i === 1 ? "#d8c187" : "#c2cbdb"} />
          </mesh>
          {/* Teeth cut into one edge */}
          {[0, 1, 2, 3].map((t) => (
            <mesh key={t} position={[0.068, -0.54 - t * 0.1, 0]}>
              <boxGeometry args={[0.045, 0.05, 0.03]} />
              <Metal color={i === 1 ? "#d8c187" : "#c2cbdb"} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

/* -------------------------------------------------------------------------- */
/* Apartment block — strata & common areas                                     */
/* -------------------------------------------------------------------------- */

export function Building() {
  const floors = 5;

  /* Windows wrap all four elevations. With only two faces glazed the
     turntable showed a blank slab for half of every rotation. */
  const faces = [
    { rot: [0, 0, 0], normal: [0, 0, 0.462], cols: 4, span: 0.28 },
    { rot: [0, Math.PI, 0], normal: [0, 0, -0.462], cols: 4, span: 0.28 },
    { rot: [0, Math.PI / 2, 0], normal: [0.582, 0, 0], cols: 3, span: 0.28 },
    { rot: [0, -Math.PI / 2, 0], normal: [-0.582, 0, 0], cols: 3, span: 0.28 },
  ] as const;

  return (
    <group position={[0, -0.95, 0]}>
      <mesh position={[0, 1.0, 0]}>
        <boxGeometry args={[1.15, 2.0, 0.9]} />
        <meshPhysicalMaterial color="#39445c" roughness={0.55} clearcoat={0.35} />
      </mesh>
      {/* Setback top storey and parapet */}
      <mesh position={[0, 2.16, 0]}>
        <boxGeometry args={[0.92, 0.36, 0.72]} />
        <meshPhysicalMaterial color="#2e3850" roughness={0.55} />
      </mesh>
      <mesh position={[0, 2.36, 0]}>
        <boxGeometry args={[1.0, 0.05, 0.8]} />
        <meshPhysicalMaterial color="#232b3b" roughness={0.6} />
      </mesh>

      {faces.map((face, fi) =>
        Array.from({ length: floors * face.cols }, (_, i) => {
          const row = Math.floor(i / face.cols);
          const col = i % face.cols;
          const lit = (i * 7 + fi * 3) % 4 !== 0;
          const offset = ((face.cols - 1) * face.span) / 2;
          return (
            <group
              key={`${fi}-${i}`}
              position={[face.normal[0], 0, face.normal[2]]}
              rotation={[face.rot[0], face.rot[1], face.rot[2]]}
            >
              <mesh position={[-offset + col * face.span, 0.38 + row * 0.34, 0]}>
                <planeGeometry args={[0.18, 0.22]} />
                <meshBasicMaterial
                  color={lit ? (i % 3 ? AQUA_SOFT : AQUA) : "#141a28"}
                  toneMapped={false}
                />
              </mesh>
              {/* Balcony rail on alternate floors */}
              {row % 2 === 1 && col === 0 ? (
                <mesh position={[-offset + col * face.span, 0.24 + row * 0.34, 0.05]}>
                  <boxGeometry args={[0.24, 0.02, 0.1]} />
                  <meshStandardMaterial color="#5b6885" roughness={0.5} metalness={0.6} />
                </mesh>
              ) : null}
            </group>
          );
        }),
      )}

      {/* Lit lobby at street level — the common area we would be cleaning */}
      <mesh position={[0, 0.14, 0.462]}>
        <planeGeometry args={[0.66, 0.32]} />
        <meshBasicMaterial color={AQUA_SOFT} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.03, 0]}>
        <boxGeometry args={[1.4, 0.07, 1.15]} />
        <Plastic color="#232b3b" />
      </mesh>
    </group>
  );
}

/* -------------------------------------------------------------------------- */
/* Hard hat — post-construction                                                */
/* -------------------------------------------------------------------------- */

export function HardHat() {
  return (
    <group position={[0, -0.2, 0]} rotation={[0.16, 0, 0]}>
      {/* Dome */}
      <mesh position={[0, 0.32, 0]}>
        <sphereGeometry args={[0.62, 40, 24, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshPhysicalMaterial
          color="#e0a53f"
          roughness={0.28}
          clearcoat={1}
          clearcoatRoughness={0.12}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Reinforcing ridge along the crown */}
      <mesh position={[0, 0.62, 0]} rotation={[0, 0, 0]}>
        <boxGeometry args={[0.09, 0.3, 1.02]} />
        <meshPhysicalMaterial color="#c98f2f" roughness={0.3} clearcoat={1} />
      </mesh>
      {/* Brim, wider at the front */}
      <mesh position={[0, 0.3, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.58, 0.82, 40]} />
        <meshPhysicalMaterial
          color="#e0a53f"
          roughness={0.28}
          clearcoat={1}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh position={[0, 0.3, 0.6]} rotation={[Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.34, 24, 0, Math.PI]} />
        <meshPhysicalMaterial
          color="#e0a53f"
          roughness={0.28}
          clearcoat={1}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Inner harness, visible under the brim */}
      <mesh position={[0, 0.26, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.4, 0.56, 28]} />
        <meshStandardMaterial color="#2e3850" roughness={0.8} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

/* -------------------------------------------------------------------------- */

export const MODELS = {
  spray: SprayBottle,
  bucket: MopBucket,
  vacuum: Vacuum,
  keys: Keys,
  building: Building,
  hardhat: HardHat,
} as const;

export type ModelKey = keyof typeof MODELS;
