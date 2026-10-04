"use client";

import { useEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer } from "@react-three/drei";
import {
  Bloom,
  EffectComposer,
  SMAA,
  Vignette,
} from "@react-three/postprocessing";
import * as THREE from "three";
import { useDeviceTier } from "@/hooks/useDeviceTier";
import { dotTexture } from "@/lib/dot-texture";
import {
  clamp01,
  linear,
  pulse,
  smoothstep,
  MOP,
  SHINE,
  VACUUM,
  WIPE,
} from "@/lib/clean-sequence";

/*
 * One idea carries every pass: a clean edge travels across the surface being
 * worked, and everything behind it is finished. The desk is wiped end to end,
 * the floor is vacuumed then mopped front to back, the window is polished
 * corner to corner. The same motif four times reads as a method rather than
 * four unrelated effects.
 */

/** Deterministic pseudo-random — same layout every load, no hydration drift. */
function rand(i: number, salt = 1) {
  return Math.abs(Math.sin(i * 127.1 * salt + salt * 311.7) * 43758.5453) % 1;
}

/* -------------------------------------------------------------------------- */
/* Palette                                                                     */
/* -------------------------------------------------------------------------- */

const AQUA = "#2fd4c4";
const AQUA_SOFT = "#8af5e8";

const WALL_DIRTY = new THREE.Color("#2a2c31");
const WALL_CLEAN = new THREE.Color("#3e4865");

/* -------------------------------------------------------------------------- */
/* Shared progress                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Scroll arrives in steps — wheel notches, touch flicks. Everything in the
 * scene reads this damped copy instead, so a jump in scroll becomes a glide.
 */
function Driver({
  targetRef,
  smoothedRef,
}: {
  targetRef: RefObject<number>;
  smoothedRef: RefObject<number>;
}) {
  const primed = useRef(false);
  useFrame((_, delta) => {
    const goal = clamp01(targetRef.current ?? 0);
    // Snap on the first frame and after a long stall (tab switch), glide
    // otherwise.
    if (!primed.current || delta > 0.25) smoothedRef.current = goal;
    else smoothedRef.current = THREE.MathUtils.damp(smoothedRef.current, goal, 7, delta);
    primed.current = true;
  }, -1);
  return null;
}

/* -------------------------------------------------------------------------- */
/* Reveal material                                                             */
/* -------------------------------------------------------------------------- */

type RevealUniforms = {
  uDir: { value: THREE.Vector2 };
  /** Where the grime ends. Behind it the colour is clean. */
  uEdgeA: { value: number };
  /** Where the gloss ends. Behind it the surface is polished. */
  uEdgeB: { value: number };
  uSoft: { value: number };
  uDirty: { value: THREE.Color };
  uGrime: { value: number };
  uDirtyRough: { value: number };
  uGlowColor: { value: THREE.Color };
  uGlowA: { value: number };
  uGlowB: { value: number };
  uGlowWidth: { value: number };
  /** Strength of the darker, glassier band just behind the gloss edge. */
  uWet: { value: number };
  uNoiseScale: { value: number };
};

/**
 * Patches a standard/physical material so a straight edge, moving along
 * `dir` in world XZ, separates dirty from clean. The edge carries a fine line
 * of light so the eye can follow the work as it happens.
 */
function withReveal(
  material: THREE.MeshPhysicalMaterial,
  init: { dir: [number, number]; dirty: string; grime: number; dirtyRough: number; noise: number },
): RevealUniforms {
  const uniforms: RevealUniforms = {
    uDir: { value: new THREE.Vector2(...init.dir).normalize() },
    uEdgeA: { value: -100 },
    uEdgeB: { value: -100 },
    uSoft: { value: 0.06 },
    uDirty: { value: new THREE.Color(init.dirty) },
    uGrime: { value: init.grime },
    uDirtyRough: { value: init.dirtyRough },
    uGlowColor: { value: new THREE.Color(AQUA_SOFT) },
    uGlowA: { value: 0 },
    uGlowB: { value: 0 },
    uGlowWidth: { value: 0.05 },
    uWet: { value: 0 },
    uNoiseScale: { value: init.noise },
  };

  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);

    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vRevealPos;")
      .replace(
        "#include <worldpos_vertex>",
        "#include <worldpos_vertex>\nvRevealPos = (modelMatrix * vec4(transformed, 1.0)).xyz;",
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        /* glsl */ `#include <common>
varying vec3 vRevealPos;
uniform vec2 uDir;
uniform float uEdgeA;
uniform float uEdgeB;
uniform float uSoft;
uniform vec3 uDirty;
uniform float uGrime;
uniform float uDirtyRough;
uniform vec3 uGlowColor;
uniform float uGlowA;
uniform float uGlowB;
uniform float uGlowWidth;
uniform float uWet;
uniform float uNoiseScale;
float rvHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float rvNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(rvHash(i), rvHash(i + vec2(1.0, 0.0)), f.x),
    mix(rvHash(i + vec2(0.0, 1.0)), rvHash(i + vec2(1.0, 1.0)), f.x),
    f.y
  );
}
float rvFbm(vec2 p) {
  return 0.55 * rvNoise(p) + 0.3 * rvNoise(p * 2.3 + 7.1) + 0.15 * rvNoise(p * 5.7 + 3.3);
}
float rvLine(float d, float w) {
  // A crisp core with a soft halo either side.
  return (1.0 - smoothstep(0.0, w, d)) + 0.3 * (1.0 - smoothstep(0.0, w * 9.0, d));
}`,
      )
      .replace(
        "#include <color_fragment>",
        /* glsl */ `#include <color_fragment>
float rv = dot(vRevealPos.xz, uDir);
float aheadA = smoothstep(uEdgeA - uSoft, uEdgeA + uSoft, rv);
float aheadB = smoothstep(uEdgeB - uSoft, uEdgeB + uSoft, rv);
float grime = aheadA * uGrime * (0.4 + 0.6 * rvFbm(vRevealPos.xz * uNoiseScale));
diffuseColor.rgb = mix(diffuseColor.rgb, uDirty, grime);
float wet = (1.0 - aheadB) * (1.0 - smoothstep(0.0, 1.6, uEdgeB - rv)) * uWet;
diffuseColor.rgb *= 1.0 - wet * 0.3;`,
      )
      .replace(
        "#include <roughnessmap_fragment>",
        /* glsl */ `#include <roughnessmap_fragment>
roughnessFactor = mix(roughnessFactor, uDirtyRough, aheadB);
roughnessFactor = mix(roughnessFactor, 0.12, wet);`,
      )
      .replace(
        "#include <emissivemap_fragment>",
        /* glsl */ `#include <emissivemap_fragment>
totalEmissiveRadiance += uGlowColor * (
  rvLine(abs(rv - uEdgeA), uGlowWidth) * uGlowA +
  rvLine(abs(rv - uEdgeB), uGlowWidth) * uGlowB
);`,
      );
  };
  // Every reveal material shares one compiled program.
  material.customProgramCacheKey = () => "clean-reveal";
  material.userData.reveal = uniforms;

  return uniforms;
}

/** The reveal uniforms of a mesh's material, reached through the mesh ref so
 *  per-frame writes go to the live object rather than a render-time value. */
function revealOf(mesh: THREE.Mesh | null) {
  const material = mesh?.material as THREE.MeshPhysicalMaterial | undefined;
  const uniforms = material?.userData.reveal as RevealUniforms | undefined;
  return material && uniforms ? { material, uniforms } : null;
}

/** Edge position for a pass: starts just before the surface, ends past it. */
function edgeAt(window: [number, number], p: number, from: number, to: number) {
  const t = linear(window, p);
  // Ease the ends so the line accelerates away and settles, rather than
  // starting and stopping dead.
  const e = t * t * (3 - 2 * t);
  return from + (to - from) * e;
}

/* -------------------------------------------------------------------------- */
/* Camera                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Evenly spaced keys through one spline, so the camera never stops at a key:
 * it flows through each beat and keeps moving. Every frame keeps the desk,
 * floor and window in view — there is no shot of empty floor.
 */
const CAMERA_POS: [number, number, number][] = [
  [8.2, 4.9, 9.4], //   0.0 establish
  [4.6, 3.1, 5.6], //   0.1 approach the desk
  [2.6, 2.5, 4.1], //   0.2 along the desk with the wipe
  [3.7, 2.4, 5.4], //   0.3 ease back as the wipe finishes
  [4.9, 2.2, 5.9], //   0.4 floor, vacuum crossing
  [4.8, 1.6, 5.9], //   0.5 settle lower
  [4.3, 1.1, 5.6], //   0.6 raking across the wet floor
  [3.1, 1.05, 5.4], //  0.7 drift with the mop
  [4.1, 1.8, 6.8], //   0.8 rise towards the window
  [6.0, 2.8, 8.3], //   0.9 pull back
  [7.6, 3.6, 9.6], //   1.0 the finished room
];

const CAMERA_LOOK: [number, number, number][] = [
  [-0.2, 0.9, -1.5],
  [-1.2, 0.85, -1.3],
  [-1.6, 0.8, -1.2],
  [-0.9, 0.45, -0.8],
  [-0.3, 0.25, -0.6],
  [0.0, 0.3, -1.5],
  [0.6, 0.5, -3.0],
  [0.8, 0.6, -3.2],
  [0.9, 1.35, -3.1],
  [0.4, 1.35, -2.3],
  [0.0, 1.2, -1.7],
];

function CameraRig({
  progress,
  reducedMotion,
}: {
  progress: RefObject<number>;
  reducedMotion: boolean;
}) {
  const size = useThree((state) => state.size);
  const get = useThree((state) => state.get);

  const curves = useMemo(
    () => ({
      pos: new THREE.CatmullRomCurve3(
        CAMERA_POS.map((v) => new THREE.Vector3(...v)),
        false,
        "centripetal",
      ),
      look: new THREE.CatmullRomCurve3(
        CAMERA_LOOK.map((v) => new THREE.Vector3(...v)),
        false,
        "centripetal",
      ),
    }),
    [],
  );

  const posTarget = useRef(new THREE.Vector3()).current;
  const lookTarget = useRef(new THREE.Vector3()).current;
  const lookCurrent = useRef(new THREE.Vector3(...CAMERA_LOOK[0])).current;
  const pointerSmooth = useRef(new THREE.Vector2()).current;
  const primed = useRef(false);

  /*
   * Frame the subject away from the copy. On wide screens the copy sits in
   * the left column, so the render is shifted right; on narrow screens it
   * sits along the bottom, so the render is shifted up and widened.
   */
  useEffect(() => {
    const cam = get().camera as THREE.PerspectiveCamera;
    const { width, height } = size;
    const wide = width >= 1024;
    const portrait = width / height < 0.8;
    cam.fov = portrait ? 50 : 38;
    if (wide) cam.setViewOffset(width, height, -width * 0.16, 0, width, height);
    else if (width < 768) cam.setViewOffset(width, height, 0, height * 0.14, width, height);
    else cam.clearViewOffset();
    cam.updateProjectionMatrix();
  }, [get, size]);

  useFrame(({ camera, pointer, size: frame }, delta) => {
    const p = clamp01(progress.current ?? 0);
    curves.pos.getPoint(p, posTarget);
    curves.look.getPoint(p, lookTarget);

    if (frame.width / frame.height < 0.8) {
      // Portrait has little width to work with: aim nearer the desk so it
      // stays in frame while the camera looks toward the window, and stand a
      // little further back.
      lookTarget.x = lookTarget.x * 0.45 - 0.55;
      posTarget.sub(lookTarget).multiplyScalar(1.12).add(lookTarget);
    }

    if (!reducedMotion) {
      // A little parallax so the frame never feels locked off — damped so a
      // flick of the mouse doesn't jolt it.
      pointerSmooth.set(
        THREE.MathUtils.damp(pointerSmooth.x, pointer.x, 2.5, delta),
        THREE.MathUtils.damp(pointerSmooth.y, pointer.y, 2.5, delta),
      );
      posTarget.x += pointerSmooth.x * 0.35;
      posTarget.y += pointerSmooth.y * 0.2;
    }

    if (!primed.current) {
      camera.position.copy(posTarget);
      lookCurrent.copy(lookTarget);
      primed.current = true;
    } else {
      // Frame-rate independent easing toward the spline point.
      const k = 1 - Math.exp(-5 * delta);
      camera.position.lerp(posTarget, k);
      lookCurrent.lerp(lookTarget, k);
    }
    camera.lookAt(lookCurrent);
  });

  return null;
}

/* -------------------------------------------------------------------------- */
/* Room — floor, walls, window                                                 */
/* -------------------------------------------------------------------------- */

const FLOOR_DIR: [number, number] = [0.3, 1];

/** Vacuum and mop both sweep the floor back to front, toward the viewer. */
const FLOOR_FROM = -7;
const FLOOR_TO = 8.5;

function Floor({ progress }: { progress: RefObject<number> }) {
  const mesh = useRef<THREE.Mesh>(null);
  const material = useMemo(() => {
    const material = new THREE.MeshPhysicalMaterial({
      color: "#34405e",
      roughness: 0.2,
      metalness: 0.08,
      clearcoat: 0.15,
      clearcoatRoughness: 0.3,
      envMapIntensity: 0.3,
    });
    const uniforms = withReveal(material, {
      dir: FLOOR_DIR,
      dirty: "#4a4438",
      grime: 0.92,
      dirtyRough: 0.9,
      noise: 0.9,
    });
    uniforms.uGlowWidth.value = 0.035;
    return material;
  }, []);

  useEffect(() => () => material.dispose(), [material]);

  useFrame(() => {
    const live = revealOf(mesh.current);
    if (!live) return;
    const { material, uniforms } = live;
    const p = progress.current ?? 0;
    uniforms.uEdgeA.value = edgeAt(VACUUM, p, FLOOR_FROM, FLOOR_TO);
    uniforms.uEdgeB.value = edgeAt(MOP, p, FLOOR_FROM, FLOOR_TO);
    uniforms.uGlowA.value = pulse(VACUUM, p) * 0.9;
    uniforms.uGlowB.value = pulse(MOP, p) * 1.4;
    uniforms.uWet.value = pulse(MOP, p) + smoothstep(MOP, p) * (1 - smoothstep(SHINE, p)) * 0.4;
    // Kept low on purpose: the environment is effectively at infinity, so a
    // strong reflection of the window lands near the camera rather than
    // under the window, and reads as a stray bright patch.
    material.envMapIntensity = 0.3 + smoothstep(SHINE, p) * 0.2;
  });

  return (
    <mesh ref={mesh} rotation={[-Math.PI / 2, 0, 0]} material={material}>
      <planeGeometry args={[22, 16]} />
    </mesh>
  );
}

function Walls({ progress }: { progress: RefObject<number> }) {
  const back = useRef<THREE.MeshStandardMaterial>(null);
  const left = useRef<THREE.MeshStandardMaterial>(null);

  useFrame(() => {
    const p = progress.current ?? 0;
    // Walls lift a little with the wipe and fully with the final pass.
    const clean = Math.max(smoothstep(WIPE, p) * 0.35, smoothstep(SHINE, p));
    back.current?.color.copy(WALL_DIRTY).lerp(WALL_CLEAN, clean);
    left.current?.color.copy(WALL_DIRTY).lerp(WALL_CLEAN, clean * 0.85);
  });

  return (
    <group>
      <mesh position={[0, 3.5, -5.4]}>
        <planeGeometry args={[22, 7]} />
        <meshStandardMaterial ref={back} color={WALL_DIRTY} roughness={0.92} />
      </mesh>
      <mesh position={[-7.6, 3.5, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[16, 7]} />
        <meshStandardMaterial ref={left} color={WALL_DIRTY} roughness={0.92} />
      </mesh>
      {/* Skirting — a thin line that reads the floor/wall junction */}
      <mesh position={[0, 0.06, -5.37]}>
        <boxGeometry args={[22, 0.12, 0.04]} />
        <meshStandardMaterial color="#141924" roughness={0.6} />
      </mesh>
      <mesh position={[-7.57, 0.06, 0]}>
        <boxGeometry args={[0.04, 0.12, 16]} />
        <meshStandardMaterial color="#141924" roughness={0.6} />
      </mesh>
    </group>
  );
}

const windowVertex = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const windowFragment = /* glsl */ `
varying vec2 vUv;
uniform float uEdge;
uniform float uStreak;
uniform float uBright;
float wHash(vec2 p) { return fract(sin(dot(p, vec2(41.3, 289.1))) * 15731.743); }
float wNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(wHash(i), wHash(i + vec2(1.0, 0.0)), f.x), mix(wHash(i + vec2(0.0, 1.0)), wHash(i + vec2(1.0, 1.0)), f.x), f.y);
}
void main() {
  vec3 sky = mix(vec3(0.42, 0.62, 0.86), vec3(0.8, 0.9, 1.0), smoothstep(0.0, 1.0, vUv.y));
  // Diagonal coordinate: the polish travels corner to corner.
  float d = (vUv.x + vUv.y * 0.55) / 1.55;
  float polished = 1.0 - smoothstep(uEdge - 0.04, uEdge + 0.04, d);
  // Before the polish: flat and milky, with a faint film toward the bottom.
  float film = 0.94 + 0.06 * wNoise(vUv * vec2(4.0, 3.0));
  vec3 hazy = mix(sky, vec3(0.52, 0.55, 0.58), 0.55 + 0.15 * (1.0 - vUv.y)) * film * 0.8;
  vec3 col = mix(hazy, sky, polished) * uBright;
  float streak = exp(-pow((d - uEdge) * 22.0, 2.0)) * uStreak;
  col += vec3(1.0) * streak * 1.2;
  gl_FragColor = vec4(col, 1.0);
}`;

function Window({ progress }: { progress: RefObject<number> }) {
  const glass = useRef<THREE.ShaderMaterial>(null);
  const initial = useMemo(
    () => ({
      uEdge: { value: -0.2 },
      uStreak: { value: 0 },
      uBright: { value: 0.7 },
    }),
    [],
  );

  useFrame(() => {
    const uniforms = glass.current?.uniforms;
    if (!uniforms) return;
    const p = progress.current ?? 0;
    uniforms.uEdge.value = edgeAt(SHINE, p, -0.15, 1.15);
    uniforms.uStreak.value = pulse(SHINE, p);
    uniforms.uBright.value = 0.62 + smoothstep(SHINE, p) * 0.5;
  });

  const frame = "#0e131c";
  const W = 5.4;
  const H = 3;

  return (
    <group position={[2.6, 2.6, -5.36]}>
      <mesh>
        <planeGeometry args={[W, H]} />
        <shaderMaterial
          ref={glass}
          vertexShader={windowVertex}
          fragmentShader={windowFragment}
          uniforms={initial}
          toneMapped={false}
        />
      </mesh>
      {/* Frame and a single mullion */}
      {[
        { p: [0, H / 2, 0.03], s: [W + 0.16, 0.08, 0.08] },
        { p: [0, -H / 2, 0.03], s: [W + 0.16, 0.1, 0.12] },
        { p: [-W / 2, 0, 0.03], s: [0.08, H, 0.08] },
        { p: [W / 2, 0, 0.03], s: [0.08, H, 0.08] },
        { p: [0, 0, 0.03], s: [0.05, H, 0.05] },
      ].map(({ p, s }, i) => (
        <mesh key={i} position={p as [number, number, number]}>
          <boxGeometry args={s as [number, number, number]} />
          <meshStandardMaterial color={frame} roughness={0.35} metalness={0.7} />
        </mesh>
      ))}
    </group>
  );
}

/* -------------------------------------------------------------------------- */
/* Desk                                                                        */
/* -------------------------------------------------------------------------- */

const DESK_X = -1.5;
const DESK_Z = -1.2;
const DESK_FROM = DESK_X - 2.0;
const DESK_TO = DESK_X + 2.0;

function Desk({ progress }: { progress: RefObject<number> }) {
  const screen = useRef<THREE.MeshBasicMaterial>(null);
  const scratch = useRef(new THREE.Color()).current;
  const top = useRef<THREE.Mesh>(null);

  const material = useMemo(() => {
    const material = new THREE.MeshPhysicalMaterial({
      color: "#e8ecf3",
      roughness: 0.16,
      clearcoat: 0.7,
      clearcoatRoughness: 0.1,
      envMapIntensity: 1.3,
    });
    const uniforms = withReveal(material, {
      dir: [1, 0],
      dirty: "#776f60",
      grime: 0.95,
      dirtyRough: 0.92,
      noise: 3.2,
    });
    uniforms.uSoft.value = 0.04;
    uniforms.uGlowWidth.value = 0.012;
    return material;
  }, []);

  useEffect(() => () => material.dispose(), [material]);

  useFrame(() => {
    const p = progress.current ?? 0;
    const edge = edgeAt(WIPE, p, DESK_FROM, DESK_TO);
    const live = revealOf(top.current);
    if (!live) return;
    const { uniforms } = live;
    uniforms.uEdgeA.value = edge;
    uniforms.uEdgeB.value = edge;
    uniforms.uGlowA.value = pulse(WIPE, p) * 1.6;

    if (screen.current) {
      // The screen sits mid-desk; it comes up as the edge passes it.
      const lit = clamp01((edge - (DESK_X + 0.15)) / 0.5);
      scratch.set(AQUA);
      screen.current.color
        .copy(scratch)
        .multiplyScalar(0.12 + lit * 0.55 + smoothstep(SHINE, p) * 0.35);
    }
  });

  const metal = (
    <meshStandardMaterial color="#1a1f2b" roughness={0.3} metalness={0.8} />
  );

  return (
    <group position={[DESK_X, 0, DESK_Z]}>
      <mesh ref={top} position={[0, 0.76, 0]} material={material}>
        <boxGeometry args={[3.4, 0.07, 1.5]} />
      </mesh>

      {/* Legs — a pair of slim frames rather than solid slabs */}
      {[-1.5, 1.5].map((x) => (
        <group key={x} position={[x, 0, 0]}>
          {[-0.62, 0.62].map((z) => (
            <mesh key={z} position={[0, 0.37, z]}>
              <boxGeometry args={[0.05, 0.74, 0.05]} />
              {metal}
            </mesh>
          ))}
          <mesh position={[0, 0.03, 0]}>
            <boxGeometry args={[0.05, 0.05, 1.3]} />
            {metal}
          </mesh>
        </group>
      ))}

      {/* Monitor */}
      <group position={[0.15, 0.8, -0.38]}>
        <mesh position={[0, 0.02, 0]}>
          <boxGeometry args={[0.42, 0.025, 0.26]} />
          {metal}
        </mesh>
        <mesh position={[0, 0.3, -0.04]}>
          <boxGeometry args={[0.05, 0.52, 0.04]} />
          {metal}
        </mesh>
        <mesh position={[0, 0.8, 0]}>
          <boxGeometry args={[1.56, 0.9, 0.035]} />
          <meshStandardMaterial color="#0d1018" roughness={0.3} metalness={0.5} />
        </mesh>
        <mesh position={[0, 0.81, 0.019]}>
          <planeGeometry args={[1.48, 0.82]} />
          <meshBasicMaterial ref={screen} color={AQUA} toneMapped={false} />
        </mesh>
      </group>

      {/* Keyboard, mouse and mug — small props that sell the scale */}
      <mesh position={[0.1, 0.8, 0.32]}>
        <boxGeometry args={[1.05, 0.018, 0.32]} />
        <meshStandardMaterial color="#1c202b" roughness={0.55} />
      </mesh>
      <mesh position={[0.85, 0.8, 0.34]}>
        <boxGeometry args={[0.1, 0.025, 0.16]} />
        <meshStandardMaterial color="#1c202b" roughness={0.55} />
      </mesh>
      <mesh position={[-1.1, 0.88, 0.25]}>
        <cylinderGeometry args={[0.1, 0.085, 0.19, 28]} />
        <meshStandardMaterial color="#d9dfeb" roughness={0.25} />
      </mesh>
    </group>
  );
}

/* -------------------------------------------------------------------------- */
/* Chair and plant — silhouette, not detail                                    */
/* -------------------------------------------------------------------------- */

function Props() {
  const dark = <meshStandardMaterial color="#1c212d" roughness={0.7} />;
  const chrome = <meshStandardMaterial color="#9aa6bb" roughness={0.18} metalness={1} />;
  return (
    <group>
      <group position={[-1.2, 0, 0.7]} rotation={[0, -0.5, 0]}>
        <mesh position={[0, 0.48, 0]}>
          <boxGeometry args={[0.58, 0.08, 0.56]} />
          {dark}
        </mesh>
        <mesh position={[0, 0.86, -0.26]} rotation={[0.14, 0, 0]}>
          <boxGeometry args={[0.56, 0.62, 0.07]} />
          {dark}
        </mesh>
        <mesh position={[0, 0.25, 0]}>
          <cylinderGeometry args={[0.03, 0.03, 0.44, 16]} />
          {chrome}
        </mesh>
        {[0, 1, 2, 3, 4].map((i) => (
          <mesh
            key={i}
            position={[Math.cos((i / 5) * Math.PI * 2) * 0.16, 0.035, Math.sin((i / 5) * Math.PI * 2) * 0.16]}
            rotation={[0, -(i / 5) * Math.PI * 2, 0]}
          >
            <boxGeometry args={[0.32, 0.03, 0.04]} />
            {chrome}
          </mesh>
        ))}
      </group>

      <group position={[-0.4, 0, -4.6]}>
        <mesh position={[0, 0.3, 0]}>
          <cylinderGeometry args={[0.3, 0.24, 0.6, 28]} />
          <meshStandardMaterial color="#d6dbe5" roughness={0.35} />
        </mesh>
        {Array.from({ length: 9 }, (_, i) => {
          const a = (i / 9) * Math.PI * 2 + rand(i, 4);
          const lean = 0.25 + rand(i, 5) * 0.35;
          return (
            <mesh
              key={i}
              position={[Math.cos(a) * 0.12, 0.95 + rand(i, 3) * 0.3, Math.sin(a) * 0.12]}
              rotation={[Math.sin(a) * lean, 0, -Math.cos(a) * lean]}
            >
              <coneGeometry args={[0.07, 0.8 + rand(i, 6) * 0.35, 5]} />
              <meshStandardMaterial color="#2d7259" roughness={0.75} />
            </mesh>
          );
        })}
      </group>
    </group>
  );
}

/* -------------------------------------------------------------------------- */
/* Pass 1 — dust lifted off the desk as the wipe passes                        */
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
      arr[i * 3] = DESK_X - 1.7 + rand(i, 1) * 3.4;
      arr[i * 3 + 1] = 0.84 + rand(i, 2) * 0.5;
      arr[i * 3 + 2] = DESK_Z - 0.7 + rand(i, 3) * 1.4;
    }
    return { positions: arr, base: arr.slice() };
  }, [count]);

  useFrame(({ clock }) => {
    const p = progress.current ?? 0;
    const edge = edgeAt(WIPE, p, DESK_FROM, DESK_TO);
    const t = clock.getElapsedTime();

    if (material.current) {
      material.current.opacity = 0.55 * (1 - smoothstep([WIPE[1] - 0.04, WIPE[1] + 0.02], p));
    }

    const geo = points.current?.geometry;
    if (!geo) return;
    const attr = geo.getAttribute("position") as THREE.BufferAttribute;
    for (let i = 0; i < attr.count; i++) {
      const x = base[i * 3];
      // Each mote is lifted the moment the edge reaches it, and keeps rising.
      const lifted = clamp01((edge - x) / 0.9);
      const rise = lifted * lifted * (0.9 + rand(i, 9) * 1.3);
      attr.setXYZ(
        i,
        x + Math.sin(t * 0.3 + i * 2) * 0.04 + lifted * 0.25,
        base[i * 3 + 1] + Math.sin(t * 0.45 + i) * 0.04 + rise,
        base[i * 3 + 2] + Math.cos(t * 0.35 + i) * 0.03,
      );
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
        size={0.045}
        map={dot}
        alphaMap={dot}
        color="#d8ccb0"
        transparent
        opacity={0.55}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

/* -------------------------------------------------------------------------- */
/* Pass 2 — grit that disappears as the vacuum line crosses it                 */
/* -------------------------------------------------------------------------- */

function Grit({
  progress,
  count,
}: {
  progress: RefObject<number>;
  count: number;
}) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const dummy = useRef(new THREE.Object3D()).current;
  const dir = useMemo(() => new THREE.Vector2(...FLOOR_DIR).normalize(), []);

  const spots = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const x = -5 + rand(i, 1) * 10.5;
        const z = -4.6 + rand(i, 2) * 8.6;
        return {
          x,
          z,
          s: 0.025 + rand(i, 4) * 0.04,
          along: x * dir.x + z * dir.y,
        };
      }),
    [count, dir],
  );

  useFrame(() => {
    if (!mesh.current) return;
    const p = progress.current ?? 0;
    const edge = edgeAt(VACUUM, p, FLOOR_FROM, FLOOR_TO);

    for (let i = 0; i < spots.length; i++) {
      const spot = spots[i];
      // 0 untouched, 1 gone — a short lift-and-shrink right at the line.
      const taken = clamp01((edge - spot.along) / 0.35);
      const eased = taken * taken;
      dummy.position.set(
        spot.x + dir.x * eased * 0.3,
        0.02 + eased * 0.18,
        spot.z + dir.y * eased * 0.3,
      );
      dummy.scale.setScalar(Math.max(spot.s * (1 - eased), 0.0001));
      dummy.rotation.set(i, i * 2, i * 3);
      dummy.updateMatrix();
      mesh.current.setMatrixAt(i, dummy.matrix);
    }
    mesh.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]}>
      <dodecahedronGeometry args={[1, 0]} />
      <meshStandardMaterial color="#8d806a" roughness={0.95} />
    </instancedMesh>
  );
}

/* -------------------------------------------------------------------------- */
/* Pass 4 — sparkle on the chrome once the room is finished                    */
/* -------------------------------------------------------------------------- */

const sparkleVertex = /* glsl */ `
attribute float aPhase;
uniform float uTime;
uniform float uAmount;
uniform float uSize;
uniform float uPixelRatio;
varying float vAlpha;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  // Each point flares briefly on its own beat, like light catching an edge.
  float beat = pow(0.5 + 0.5 * sin(uTime * 1.3 + aPhase * 6.2831), 8.0);
  vAlpha = beat * uAmount;
  gl_PointSize = uSize * (0.35 + beat) * uPixelRatio * (8.0 / -mv.z);
}`;

const sparkleFragment = /* glsl */ `
uniform vec3 uColor;
varying float vAlpha;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float core = pow(max(0.0, 1.0 - length(c) * 2.0), 3.0);
  float cross = max(0.0, 1.0 - abs(c.x) * 16.0) * max(0.0, 1.0 - abs(c.y) * 2.0)
              + max(0.0, 1.0 - abs(c.y) * 16.0) * max(0.0, 1.0 - abs(c.x) * 2.0);
  gl_FragColor = vec4(uColor, (core + cross * 0.5) * vAlpha);
}`;

/** Points that sit on real edges — desk corners, monitor, chair, window. */
const SPARKLE_ANCHORS: [number, number, number][] = [
  [DESK_X - 1.7, 0.8, DESK_Z + 0.75],
  [DESK_X + 1.7, 0.8, DESK_Z + 0.75],
  [DESK_X + 0.9, 0.8, DESK_Z + 0.75],
  [DESK_X - 0.6, 1.6, DESK_Z - 0.36],
  [DESK_X + 0.93, 2.06, DESK_Z - 0.36],
  [DESK_X - 1.1, 0.98, DESK_Z + 0.25],
  [-1.2, 0.04, 0.86],
  [-1.05, 0.04, 0.55],
  [-0.1, 4.1, -5.3],
  [5.3, 4.1, -5.3],
  [2.6, 1.1, -5.3],
  [5.3, 1.1, -5.3],
  [-0.4, 0.62, -4.3],
];

function Sparkles({ progress }: { progress: RefObject<number> }) {
  const { gl } = useThree();

  const { positions, phases } = useMemo(
    () => ({
      positions: new Float32Array(SPARKLE_ANCHORS.flat()),
      phases: new Float32Array(SPARKLE_ANCHORS.map((_, i) => rand(i, 31))),
    }),
    [],
  );

  const sparkle = useRef<THREE.ShaderMaterial>(null);
  const initial = useMemo(
    () => ({
      uTime: { value: 0 },
      uAmount: { value: 0 },
      uSize: { value: 26 },
      uPixelRatio: { value: 1 },
      uColor: { value: new THREE.Color("#e6fffb") },
    }),
    [],
  );

  useFrame(({ clock }) => {
    const uniforms = sparkle.current?.uniforms;
    if (!uniforms) return;
    const p = progress.current ?? 0;
    uniforms.uTime.value = clock.getElapsedTime();
    uniforms.uAmount.value = smoothstep([SHINE[0] + 0.04, SHINE[1]], p) * 1.4;
    uniforms.uPixelRatio.value = gl.getPixelRatio();
  });

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-aPhase" args={[phases, 1]} />
      </bufferGeometry>
      <shaderMaterial
        ref={sparkle}
        vertexShader={sparkleVertex}
        fragmentShader={sparkleFragment}
        uniforms={initial}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

/* -------------------------------------------------------------------------- */
/* Light                                                                       */
/* -------------------------------------------------------------------------- */

/** The room brightens as it is finished, so the payoff reads as a better
 *  room rather than the same room with glitter on it. No point lights: on a
 *  polished floor they read as a hot spot rather than as light. */
function LightRig({ progress }: { progress: RefObject<number> }) {
  const hemi = useRef<THREE.HemisphereLight>(null);
  const key = useRef<THREE.DirectionalLight>(null);
  const rim = useRef<THREE.DirectionalLight>(null);

  useFrame(() => {
    const p = progress.current ?? 0;
    const lift = Math.max(smoothstep(SHINE, p), smoothstep(MOP, p) * 0.35);
    if (hemi.current) hemi.current.intensity = 0.95 + lift * 0.6;
    if (key.current) key.current.intensity = 1.7 + lift * 0.9;
    if (rim.current) rim.current.intensity = 0.9 + lift * 0.9;
  });

  return (
    <>
      <hemisphereLight ref={hemi} args={["#c7dcff", "#141a28", 0.95]} />
      <directionalLight ref={key} position={[-3, 9, 7]} intensity={1.7} color="#e6efff" />
      {/* From the window: separates the desk and chair from the back wall */}
      <directionalLight ref={rim} position={[2.6, 3, -8]} intensity={0.9} color="#a9d6ff" />
    </>
  );
}

/* -------------------------------------------------------------------------- */

export default function OfficeClean({ progress }: { progress: RefObject<number> }) {
  const { tier, reducedMotion } = useDeviceTier();
  const smoothed = useRef(0);

  const gritCount = tier === "high" ? 170 : tier === "mid" ? 110 : 60;
  const dustCount = tier === "high" ? 120 : tier === "mid" ? 70 : 35;

  return (
    <>
      <Driver targetRef={progress} smoothedRef={smoothed} />
      <CameraRig progress={smoothed} reducedMotion={reducedMotion} />
      <LightRig progress={smoothed} />

      <Environment resolution={tier === "high" ? 256 : 128} frames={1}>
        {/* Daylight from the window side: broad and soft, so reflections of
            it are a gradient rather than a hard-edged rectangle */}
        <Lightformer form="circle" intensity={1.3} position={[3, 3, -7]} scale={[14, 9, 1]} color="#cfe6ff" />
        <Lightformer intensity={1.1} position={[-6, 3, 3]} rotation-y={Math.PI / 2} scale={[4, 5, 1]} color={AQUA_SOFT} />
        {/* Soft ceiling panel; high and to the left so the floor never mirrors
            it into the corner of the frame */}
        <Lightformer intensity={1.1} position={[-3, 6, 1]} rotation-x={Math.PI / 2} scale={[6, 3, 1]} color="#ffffff" />
      </Environment>

      <Floor progress={smoothed} />
      <Walls progress={smoothed} />
      <Window progress={smoothed} />
      <Desk progress={smoothed} />
      <Props />

      <ContactShadows
        position={[0, 0.004, 0]}
        scale={18}
        resolution={tier === "high" ? 1024 : 512}
        blur={2.6}
        opacity={0.6}
        far={3}
        frames={1}
        color="#04060b"
      />

      <DustMotes progress={smoothed} count={dustCount} />
      <Grit progress={smoothed} count={gritCount} />
      <Sparkles progress={smoothed} />

      {tier !== "low" ? (
        <EffectComposer enableNormalPass={false} multisampling={0}>
          <SMAA />
          <Bloom
            intensity={tier === "high" ? 0.65 : 0.4}
            luminanceThreshold={0.62}
            luminanceSmoothing={0.85}
            mipmapBlur
          />
          <Vignette eskil={false} offset={0.3} darkness={0.6} />
        </EffectComposer>
      ) : null}
    </>
  );
}
