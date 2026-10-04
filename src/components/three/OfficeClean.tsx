"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
  ContactShadows,
  Environment,
  Lightformer,
  MeshReflectorMaterial,
  PerformanceMonitor,
  RoundedBox,
} from "@react-three/drei";
import {
  Bloom,
  DepthOfField,
  EffectComposer,
  N8AO,
  SMAA,
  ToneMapping,
  Vignette,
} from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import * as THREE from "three";
import { useDeviceTier, type DeviceTier } from "@/hooks/useDeviceTier";
import { dotTexture } from "@/lib/dot-texture";
import {
  artTexture,
  concreteTextures,
  keyboardTexture,
  laminateTexture,
  plasterTexture,
  screenTexture,
  skylineTexture,
} from "@/lib/procedural-textures";
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
 * A real-scale office (metres, 3 m ceiling) lit by morning sun through the
 * window. One idea carries every pass: a clean edge travels across the
 * surface being worked, and everything behind it is finished — the desk is
 * wiped end to end, the floor vacuumed then mopped toward the viewer, the
 * window polished corner to corner.
 */

/** Deterministic pseudo-random — same layout every load, no hydration drift. */
function rand(i: number, salt = 1) {
  return Math.abs(Math.sin(i * 127.1 * salt + salt * 311.7) * 43758.5453) % 1;
}

/* -------------------------------------------------------------------------- */
/* Layout                                                                      */
/* -------------------------------------------------------------------------- */

const ROOM = { xMin: -6, xMax: 6, zBack: -5.4, zFront: 6, ceiling: 3 };
const WIN = { x0: 1.2, x1: 5.2, y0: 0.85, y1: 2.65 };
const WIN_W = WIN.x1 - WIN.x0;
const WIN_H = WIN.y1 - WIN.y0;
const WIN_CX = (WIN.x0 + WIN.x1) / 2;
const WIN_CY = (WIN.y0 + WIN.y1) / 2;

const DESK = { x: -1, z: -2.2, length: 3, depth: 1.4, top: 0.74 };
const DESK_FROM = DESK.x - DESK.length / 2 - 0.2;
const DESK_TO = DESK.x + DESK.length / 2 + 0.2;

/** Vacuum and mop both sweep the floor back to front, toward the viewer. */
const FLOOR_DIR: [number, number] = [0.3, 1];
const FLOOR_FROM = -7.4;
const FLOOR_TO = 7.8;

const AQUA_SOFT = "#8af5e8";

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
  /** Roughness of that wet band. */
  uWetRough: { value: number };
  uNoiseScale: { value: number };
};

type RevealInit = {
  dir: [number, number];
  dirty: string;
  grime: number;
  dirtyRough: number;
  noise: number;
  glowWidth: number;
  soft?: number;
  wetRough?: number;
};

const FLOOR_REVEAL: RevealInit = {
  dir: FLOOR_DIR,
  dirty: "#5e5547",
  grime: 0.9,
  dirtyRough: 0.95,
  noise: 0.8,
  glowWidth: 0.03,
};

/**
 * Patches a standard/physical material so a straight edge, moving along
 * `dir` in world XZ, separates dirty from clean. The edge carries a fine line
 * of light so the eye can follow the work as it happens. Chains onto any
 * existing shader patch, and if the material is a planar reflector, limits
 * the reflection to the polished side of the gloss edge.
 */
function withReveal(material: THREE.MeshStandardMaterial, init: RevealInit): RevealUniforms {
  const uniforms: RevealUniforms = {
    uDir: { value: new THREE.Vector2(...init.dir).normalize() },
    uEdgeA: { value: -100 },
    uEdgeB: { value: -100 },
    uSoft: { value: init.soft ?? 0.06 },
    uDirty: { value: new THREE.Color(init.dirty) },
    uGrime: { value: init.grime },
    uDirtyRough: { value: init.dirtyRough },
    uGlowColor: { value: new THREE.Color(AQUA_SOFT) },
    uGlowA: { value: 0 },
    uGlowB: { value: 0 },
    uGlowWidth: { value: init.glowWidth },
    uWet: { value: 0 },
    uWetRough: { value: init.wetRough ?? 0.12 },
    uNoiseScale: { value: init.noise },
  };

  const previous = material.onBeforeCompile.bind(material);

  material.onBeforeCompile = (shader, renderer) => {
    previous(shader, renderer);
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
uniform float uWetRough;
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
float grime = aheadA * uGrime * (0.35 + 0.65 * rvFbm(vRevealPos.xz * uNoiseScale));
diffuseColor.rgb = mix(diffuseColor.rgb, uDirty, grime);
float wet = (1.0 - aheadB) * (1.0 - smoothstep(0.0, 1.4, uEdgeB - rv)) * uWet;
diffuseColor.rgb *= 1.0 - wet * 0.3;`,
      )
      .replace(
        "#include <roughnessmap_fragment>",
        /* glsl */ `#include <roughnessmap_fragment>
roughnessFactor = mix(roughnessFactor, uDirtyRough, aheadB);
roughnessFactor = mix(roughnessFactor, uWetRough, wet);`,
      )
      .replace(
        "#include <emissivemap_fragment>",
        /* glsl */ `#include <emissivemap_fragment>
totalEmissiveRadiance += uGlowColor * (
  rvLine(abs(rv - uEdgeA), uGlowWidth) * uGlowA +
  rvLine(abs(rv - uEdgeB), uGlowWidth) * uGlowB
);`,
      )
      // Planar reflector only: reflect on the mopped side of the line.
      .replace(
        "diffuseColor.rgb = diffuseColor.rgb * ((1.0 - min(1.0, mirror)) + newMerge.rgb * mixStrength);",
        /* glsl */ `float reflectMask = 1.0 - aheadB;
diffuseColor.rgb = diffuseColor.rgb * ((1.0 - min(1.0, mirror * reflectMask)) + newMerge.rgb * mixStrength * reflectMask);`,
      );
  };
  material.customProgramCacheKey = () => `clean-reveal-${material.type}`;
  material.userData.reveal = uniforms;
  material.needsUpdate = true;

  return uniforms;
}

/** The reveal uniforms of a mesh's material, reached through the mesh ref so
 *  per-frame writes go to the live object rather than a render-time value. */
function revealOf(mesh: THREE.Mesh | null) {
  const material = mesh?.material as THREE.MeshStandardMaterial | undefined;
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
 * Evenly spaced keys through one spline, so the camera never stops at a key.
 * The camera stays inside the room at a photographer's height — this is an
 * interior shot, not a dollhouse.
 */
const CAMERA_POS: [number, number, number][] = [
  [5.3, 2.45, 5.6], //  0.0 establish from the corner
  [2.6, 2.05, 2.0], //  0.1 approach the desk
  [0.95, 1.65, -0.35], // 0.2 along the desk with the wipe
  [2.1, 1.95, 2.4], //  0.3 ease back as the wipe finishes
  [3.9, 1.85, 4.5], //  0.4 the floor, vacuum crossing
  [4.2, 1.35, 4.9], //  0.5 settle lower
  [3.8, 0.9, 4.8], //   0.6 raking across the wet floor
  [2.6, 0.85, 4.5], //  0.7 drift with the mop
  [3.1, 1.45, 2.4], //  0.8 up to the window for the polish
  [4.6, 2.0, 4.6], //   0.9 pull back
  [5.4, 2.4, 5.7], //   1.0 the finished room
];

const CAMERA_LOOK: [number, number, number][] = [
  [-0.6, 0.95, -2.4],
  [-1.0, 0.8, -2.2],
  [-1.7, 0.76, -2.4],
  [-0.8, 0.45, -1.7],
  [-0.4, 0.2, -1.2],
  [0.2, 0.3, -2.0],
  [1.2, 0.5, -3.2],
  [1.7, 0.65, -3.6],
  [3.1, 1.6, -5.4],
  [1.1, 1.3, -3.4],
  [-0.4, 1.0, -2.4],
];

function CameraRig({
  progress,
  reducedMotion,
  focus,
}: {
  progress: RefObject<number>;
  reducedMotion: boolean;
  /** Updated every frame with where the camera is looking, for depth of field. */
  focus: THREE.Vector3;
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
    cam.fov = portrait ? 62 : 46;
    cam.near = 0.05;
    cam.far = 60;
    if (wide) cam.setViewOffset(width, height, -width * 0.14, 0, width, height);
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
      // stays in frame while the camera looks toward the window.
      lookTarget.x = THREE.MathUtils.lerp(lookTarget.x, -0.6, 0.4);
    }

    if (!reducedMotion) {
      // A little parallax so the frame never feels locked off — damped so a
      // flick of the mouse doesn't jolt it.
      pointerSmooth.set(
        THREE.MathUtils.damp(pointerSmooth.x, pointer.x, 2.5, delta),
        THREE.MathUtils.damp(pointerSmooth.y, pointer.y, 2.5, delta),
      );
      posTarget.x += pointerSmooth.x * 0.22;
      posTarget.y += pointerSmooth.y * 0.12;
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
    focus.copy(lookCurrent);
  });

  return null;
}

/* -------------------------------------------------------------------------- */
/* Light                                                                       */
/* -------------------------------------------------------------------------- */

/** Shadows are static, so they are drawn once (over the first few frames,
 *  while everything mounts) rather than every frame. */
function ShadowBake() {
  const get = useThree((state) => state.get);
  const frames = useRef(0);

  useEffect(() => {
    const { gl } = get();
    gl.shadowMap.autoUpdate = false;
    gl.shadowMap.needsUpdate = true;
    return () => {
      gl.shadowMap.autoUpdate = true;
    };
  }, [get]);

  useFrame(({ gl }) => {
    if (frames.current < 30) {
      gl.shadowMap.needsUpdate = true;
      frames.current++;
    }
  });
  return null;
}

/** Morning sun through the window, sky fill, and a low bounce. The room
 *  brightens as it is finished, so the payoff reads as a better room rather
 *  than the same room with glitter on it. */
function LightRig({ progress, tier }: { progress: RefObject<number>; tier: DeviceTier }) {
  const hemi = useRef<THREE.HemisphereLight>(null);
  const sun = useRef<THREE.DirectionalLight>(null);
  const fill = useRef<THREE.DirectionalLight>(null);

  const target = useMemo(() => {
    const object = new THREE.Object3D();
    object.position.copy(SUN_TO);
    return object;
  }, []);

  useFrame(() => {
    const p = progress.current ?? 0;
    const lift = Math.max(smoothstep(SHINE, p), smoothstep(MOP, p) * 0.3);
    if (hemi.current) hemi.current.intensity = (1.0 + lift * 0.5) * (tier === "low" ? 1.25 : 1);
    // Without shadows nothing stops the sun at the walls, so it would flood
    // the whole floor; on that tier it is only a gentle directional fill.
    if (sun.current) sun.current.intensity = (5.2 + lift * 2.2) * (tier === "low" ? 0.25 : 1);
    if (fill.current) fill.current.intensity = 0.8 + lift * 0.4;
  });

  const mapSize = tier === "high" ? 2048 : 1024;

  return (
    <>
      {/* Ground colour stands in for light bouncing off the floor: it is what
          keeps the ceiling and undersides from going black */}
      <hemisphereLight ref={hemi} args={["#e3ecf8", "#8c867b", 1.0]} />
      <primitive object={target} />
      <directionalLight
        ref={sun}
        position={SUN_FROM.toArray()}
        target={target}
        intensity={5.2}
        color="#ffe2bf"
        castShadow={tier !== "low"}
        shadow-mapSize={[mapSize, mapSize]}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
        shadow-camera-near={2}
        shadow-camera-far={34}
        shadow-bias={-0.0004}
        shadow-normalBias={0.025}
        shadow-radius={4}
      />
      {/* Light bouncing back off the room behind the camera */}
      <directionalLight ref={fill} position={[-3, 4, 8]} intensity={0.8} color="#cfdcf0" />
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Room shell                                                                  */
/* -------------------------------------------------------------------------- */

function Floor({ progress, tier }: { progress: RefObject<number>; tier: DeviceTier }) {
  const mesh = useRef<THREE.Mesh>(null);
  const reflector = useRef<THREE.MeshStandardMaterial>(null);
  const textures = useMemo(() => concreteTextures(512, 4), []);

  // Mid/low tiers: a physical material patched once at creation.
  const physical = useMemo(() => {
    if (tier === "high") return null;
    const material = new THREE.MeshPhysicalMaterial({
      color: "#9aa1ab",
      map: textures.map,
      // Matte on the low tier: with no shadows the sun reaches the floor in
      // front of the camera, and a glossy finish turns that into a glare.
      roughness: tier === "low" ? 0.85 : 0.42,
      roughnessMap: textures.roughnessMap,
      clearcoat: tier === "low" ? 0 : 0.2,
      clearcoatRoughness: 0.3,
      // Low on purpose: without a planar reflector the only reflection is
      // the environment, which sits at infinity — strong, it flares into a
      // bright patch near the camera rather than reading as gloss.
      envMapIntensity: 0.16,
    });
    // Without shadows the sun reaches every part of the floor, so a glassy
    // wet band would glint across the whole room.
    withReveal(material, { ...FLOOR_REVEAL, wetRough: tier === "low" ? 0.55 : 0.12 });
    return material;
  }, [tier, textures]);

  // High tier: a planar reflector, patched once it exists.
  useEffect(() => {
    const material = reflector.current;
    if (!material || material.userData.reveal) return;
    withReveal(material, FLOOR_REVEAL);
  }, [tier]);

  useEffect(
    () => () => {
      physical?.dispose();
    },
    [physical],
  );

  useFrame(() => {
    const live = revealOf(mesh.current);
    if (!live) return;
    const { uniforms } = live;
    const p = progress.current ?? 0;
    uniforms.uEdgeA.value = edgeAt(VACUUM, p, FLOOR_FROM, FLOOR_TO);
    uniforms.uEdgeB.value = edgeAt(MOP, p, FLOOR_FROM, FLOOR_TO);
    uniforms.uGlowA.value = pulse(VACUUM, p) * 0.9;
    uniforms.uGlowB.value = pulse(MOP, p) * 1.3;
    uniforms.uWet.value = pulse(MOP, p) + smoothstep(MOP, p) * (1 - smoothstep(SHINE, p)) * 0.35;
  });

  const width = ROOM.xMax - ROOM.xMin;
  const depth = ROOM.zFront - ROOM.zBack;

  return (
    <mesh
      ref={mesh}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0, (ROOM.zBack + ROOM.zFront) / 2]}
      receiveShadow
      material={physical ?? undefined}
    >
      <planeGeometry args={[width, depth]} />
      {tier === "high" ? (
        <MeshReflectorMaterial
          ref={reflector as unknown as RefObject<never>}
          color="#9aa1ab"
          map={textures.map}
          roughness={0.38}
          roughnessMap={textures.roughnessMap}
          envMapIntensity={0.3}
          resolution={1024}
          blur={[400, 140]}
          mixBlur={1.2}
          mixStrength={0.85}
          mirror={0.18}
          depthScale={1}
          minDepthThreshold={0.6}
          maxDepthThreshold={1.3}
        />
      ) : null}
    </mesh>
  );
}

function Walls({ progress }: { progress: RefObject<number> }) {
  const plaster = useMemo(() => plasterTexture(256, 3), []);
  const material = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#9a9ca1", map: plaster, roughness: 0.92 }),
    [plaster],
  );
  const holder = useRef<THREE.Mesh>(null);

  useEffect(() => () => material.dispose(), [material]);

  useFrame(() => {
    const live = holder.current?.material as THREE.MeshStandardMaterial | undefined;
    if (!live) return;
    const p = progress.current ?? 0;
    // Walls lift a little with the wipe and fully with the final pass.
    const clean = Math.max(smoothstep(WIPE, p) * 0.3, smoothstep(SHINE, p));
    live.color.setRGB(0.6 + clean * 0.14, 0.61 + clean * 0.14, 0.63 + clean * 0.15);
  });

  const t = 0.15;
  const h = ROOM.ceiling;
  const back = ROOM.zBack - t / 2;
  const midZ = (ROOM.zBack + ROOM.zFront) / 2;
  const spanZ = ROOM.zFront - ROOM.zBack;

  // The back wall is built around the window opening so sunlight comes
  // through it and nowhere else.
  const pieces: { p: [number, number, number]; s: [number, number, number] }[] = [
    { p: [(ROOM.xMin + WIN.x0) / 2, h / 2, back], s: [WIN.x0 - ROOM.xMin, h, t] },
    { p: [(WIN.x1 + ROOM.xMax) / 2, h / 2, back], s: [ROOM.xMax - WIN.x1, h, t] },
    { p: [WIN_CX, WIN.y0 / 2, back], s: [WIN_W, WIN.y0, t] },
    { p: [WIN_CX, (WIN.y1 + h) / 2, back], s: [WIN_W, h - WIN.y1, t] },
    { p: [ROOM.xMin - t / 2, h / 2, midZ], s: [t, h, spanZ] },
    { p: [ROOM.xMax + t / 2, h / 2, midZ], s: [t, h, spanZ] },
  ];

  return (
    <group>
      {pieces.map(({ p, s }, i) => (
        <mesh key={i} ref={i === 0 ? holder : undefined} position={p} material={material} castShadow receiveShadow>
          <boxGeometry args={s} />
        </mesh>
      ))}

      {/* Ceiling, with recessed light panels */}
      <mesh position={[0, ROOM.ceiling + 0.05, midZ]} castShadow>
        <boxGeometry args={[ROOM.xMax - ROOM.xMin + 0.3, 0.1, spanZ + 0.3]} />
        {/* A touch of emission stands in for the bounce light a real white
            ceiling gets from the whole room */}
        <meshStandardMaterial color="#e2e4e8" emissive="#4b4e54" roughness={0.95} />
      </mesh>
      {[
        [-1, -2.2],
        [2.6, -2.2],
        [-1, 1.6],
        [2.6, 1.6],
      ].map(([x, z]) => (
        <mesh key={`${x}${z}`} position={[x, ROOM.ceiling - 0.005, z]} rotation={[Math.PI / 2, 0, 0]}>
          <planeGeometry args={[1.2, 0.6]} />
          <meshBasicMaterial color={[2.2, 2.25, 2.35]} toneMapped={false} />
        </mesh>
      ))}

    </group>
  );
}

/* -------------------------------------------------------------------------- */
/* Contact shadows                                                             */
/* -------------------------------------------------------------------------- */

/** A soft radial falloff, drawn once and shared by every contact shadow. */
function useBlobTexture() {
  return useMemo(() => {
    const size = 128;
    const el = document.createElement("canvas");
    el.width = size;
    el.height = size;
    const ctx = el.getContext("2d");
    if (ctx) {
      const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
      g.addColorStop(0, "rgba(255,255,255,1)");
      g.addColorStop(0.45, "rgba(255,255,255,0.55)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, size, size);
    }
    const texture = new THREE.CanvasTexture(el);
    texture.needsUpdate = true;
    return texture;
  }, []);
}

/** Darkening right where furniture meets the floor — the cue that makes it
 *  sit on the floor instead of hovering over it. */
const CONTACTS: { x: number; z: number; w: number; d: number; o: number }[] = [
  { x: 0.55, z: -4.85, w: 0.75, d: 0.75, o: 0.55 }, // plant pot
  { x: DESK.x - 0.35, z: DESK.z + 0.88, w: 1.15, d: 1.15, o: 0.3 }, // chair
  { x: ROOM.xMin + 0.26, z: -1.6, w: 0.75, d: 2.4, o: 0.5 }, // credenza
  { x: DESK.x - DESK.length / 2 + 0.12, z: DESK.z, w: 0.22, d: 1.55, o: 0.4 }, // desk sled
  { x: DESK.x + DESK.length / 2 - 0.12, z: DESK.z, w: 0.22, d: 1.55, o: 0.4 },
  { x: DESK.x, z: DESK.z, w: 3.2, d: 1.7, o: 0.18 }, // the desk's broad shade
  { x: ROOM.xMin + 0.45, z: 0.1, w: 0.55, d: 0.55, o: 0.45 }, // floor lamp
];

function ContactBlobs() {
  const blob = useBlobTexture();
  return (
    <group>
      {CONTACTS.map((c, i) => (
        <mesh key={i} position={[c.x, 0.002 + i * 0.0004, c.z]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={1}>
          <planeGeometry args={[c.w, c.d]} />
          <meshBasicMaterial color="#000000" alphaMap={blob} transparent opacity={c.o} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

/* -------------------------------------------------------------------------- */
/* Window — glass, frame and the city beyond                                   */
/* -------------------------------------------------------------------------- */

const glassVertex = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const glassFragment = /* glsl */ `
varying vec2 vUv;
uniform float uEdge;
uniform float uStreak;
float gHash(vec2 p) { return fract(sin(dot(p, vec2(41.3, 289.1))) * 15731.743); }
float gNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(gHash(i), gHash(i + vec2(1.0, 0.0)), f.x), mix(gHash(i + vec2(0.0, 1.0)), gHash(i + vec2(1.0, 1.0)), f.x), f.y);
}
void main() {
  // Diagonal coordinate: the polish travels corner to corner.
  float d = (vUv.x + vUv.y * 0.55) / 1.55;
  float polished = 1.0 - smoothstep(uEdge - 0.03, uEdge + 0.03, d);
  // A milky film, heavier toward the bottom where hands and rain reach.
  float film = 0.5 + 0.25 * (1.0 - vUv.y) + 0.12 * gNoise(vUv * vec2(6.0, 4.0));
  float alpha = mix(film, 0.04, polished);
  vec3 col = vec3(0.86, 0.87, 0.86);
  float streak = exp(-pow((d - uEdge) * 26.0, 2.0)) * uStreak;
  col += vec3(1.0) * streak * 2.0;
  gl_FragColor = vec4(col, clamp(alpha + streak * 0.6, 0.0, 1.0));
}`;

function Window({ progress }: { progress: RefObject<number> }) {
  const glass = useRef<THREE.ShaderMaterial>(null);
  const skyline = useMemo(() => skylineTexture(), []);
  const initial = useMemo(
    () => ({
      uEdge: { value: -0.2 },
      uStreak: { value: 0 },
    }),
    [],
  );

  useFrame(() => {
    const uniforms = glass.current?.uniforms;
    if (!uniforms) return;
    const p = progress.current ?? 0;
    uniforms.uEdge.value = edgeAt(SHINE, p, -0.15, 1.15);
    uniforms.uStreak.value = pulse(SHINE, p);
  });

  const frame = <meshStandardMaterial color="#20252e" roughness={0.4} metalness={0.6} />;
  const z = ROOM.zBack;
  const f = 0.06;

  return (
    <group>
      {/* The city, far enough behind the glass to shift with the camera */}
      <mesh position={[WIN_CX, 1.6, -16]}>
        <planeGeometry args={[30, 11.25]} />
        <meshBasicMaterial map={skyline} color={[1.15, 1.15, 1.15]} />
      </mesh>

      <mesh position={[WIN_CX, WIN_CY, z - 0.1]}>
        <planeGeometry args={[WIN_W, WIN_H]} />
        <shaderMaterial
          ref={glass}
          vertexShader={glassVertex}
          fragmentShader={glassFragment}
          uniforms={initial}
          transparent
          depthWrite={false}
        />
      </mesh>

      {/* Frame, mullion and transom — they cast the sun's grid on the floor */}
      {[
        { p: [WIN_CX, WIN.y1 - f / 2, z - 0.08], s: [WIN_W, f, 0.1] },
        { p: [WIN_CX, WIN.y0 + f / 2, z - 0.08], s: [WIN_W, f, 0.1] },
        { p: [WIN.x0 + f / 2, WIN_CY, z - 0.08], s: [f, WIN_H, 0.1] },
        { p: [WIN.x1 - f / 2, WIN_CY, z - 0.08], s: [f, WIN_H, 0.1] },
        { p: [WIN_CX, WIN_CY, z - 0.08], s: [0.05, WIN_H, 0.08] },
        { p: [WIN_CX, WIN.y0 + WIN_H * 0.68, z - 0.08], s: [WIN_W, 0.04, 0.08] },
      ].map(({ p, s }, i) => (
        <mesh key={i} position={p as [number, number, number]} castShadow>
          <boxGeometry args={s as [number, number, number]} />
          {frame}
        </mesh>
      ))}

      {/* Roller blind, part-drawn: the cassette and a translucent fabric
          that softens the top of the sun patch */}
      <mesh position={[WIN_CX, WIN.y1 + 0.05, z + 0.05]} castShadow>
        <boxGeometry args={[WIN_W + 0.1, 0.1, 0.1]} />
        <meshStandardMaterial color="#e3e3e0" roughness={0.6} />
      </mesh>
      <mesh position={[WIN_CX, WIN.y1 - WIN_H * 0.11, z + 0.04]} castShadow>
        <planeGeometry args={[WIN_W - 0.02, WIN_H * 0.22]} />
        <meshStandardMaterial
          color="#f1efe9"
          roughness={0.95}
          transparent
          opacity={0.92}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh position={[WIN_CX, WIN.y1 - WIN_H * 0.22, z + 0.04]}>
        <boxGeometry args={[WIN_W - 0.02, 0.025, 0.02]} />
        <meshStandardMaterial color="#c8c8c4" roughness={0.4} metalness={0.4} />
      </mesh>

      {/* Sill */}
      <mesh position={[WIN_CX, WIN.y0 - 0.02, z + 0.06]} castShadow receiveShadow>
        <boxGeometry args={[WIN_W + 0.2, 0.04, 0.26]} />
        <meshStandardMaterial color="#e9e8e4" roughness={0.45} />
      </mesh>
    </group>
  );
}

/* -------------------------------------------------------------------------- */
/* Sunbeam — the shaft of light from the window, with dust drifting in it     */
/* -------------------------------------------------------------------------- */

/** Direction the sun travels (from the light toward its target), unnormalised. */
const SUN_FROM = new THREE.Vector3(6.6, 7.4, -14);
const SUN_TO = new THREE.Vector3(1.8, 0, -0.6);

const beamVertex = /* glsl */ `
attribute float aAlong;
varying float vAlong;
varying vec3 vNormalView;
varying vec3 vViewDir;
void main() {
  vAlong = aAlong;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vNormalView = normalize(normalMatrix * normal);
  vViewDir = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}`;

const beamFragment = /* glsl */ `
uniform float uStrength;
varying float vAlong;
varying vec3 vNormalView;
varying vec3 vViewDir;
void main() {
  // Faces seen edge-on are where the shaft looks thickest; fade faces seen
  // flat so the volume has no hard outline.
  float facing = abs(dot(vNormalView, vViewDir));
  float body = pow(1.0 - facing, 1.5);
  float fall = smoothstep(0.0, 0.15, vAlong) * (1.0 - smoothstep(0.55, 1.0, vAlong));
  gl_FragColor = vec4(vec3(1.0, 0.93, 0.82), body * fall * uStrength);
}`;

function Sunbeam({ progress, motes }: { progress: RefObject<number>; motes: number }) {
  const beam = useRef<THREE.ShaderMaterial>(null);
  const points = useRef<THREE.Points>(null);
  const dot = useMemo(() => dotTexture(), []);

  /** A box whose near face is the window opening and whose far face is
   *  where the light lands on the floor. */
  const geometry = useMemo(() => {
    const d = new THREE.Vector3().subVectors(SUN_TO, SUN_FROM);
    const corners = [
      [WIN.x0, WIN.y0],
      [WIN.x1, WIN.y0],
      [WIN.x1, WIN.y1],
      [WIN.x0, WIN.y1],
    ].map(([x, y]) => new THREE.Vector3(x, y, ROOM.zBack));
    const floor = corners.map((c) => c.clone().addScaledVector(d, c.y / -d.y));
    const faces: [number, number][] = [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 0],
    ];
    const positions: number[] = [];
    const along: number[] = [];
    for (const [a, b] of faces) {
      const quad = [corners[a], corners[b], floor[b], floor[a]];
      const weights = [0, 0, 1, 1];
      for (const i of [0, 1, 2, 0, 2, 3]) {
        positions.push(quad[i].x, quad[i].y, quad[i].z);
        along.push(weights[i]);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute("aAlong", new THREE.Float32BufferAttribute(along, 1));
    geo.computeVertexNormals();
    return geo;
  }, []);

  /** Motes scattered through the shaft. */
  const { positions, base } = useMemo(() => {
    const d = new THREE.Vector3().subVectors(SUN_TO, SUN_FROM);
    const arr = new Float32Array(motes * 3);
    const v = new THREE.Vector3();
    for (let i = 0; i < motes; i++) {
      const x = WIN.x0 + rand(i, 61) * WIN_W;
      const y = WIN.y0 + rand(i, 62) * WIN_H;
      const t = rand(i, 63) * 0.85 * (y / -d.y);
      v.set(x, y, ROOM.zBack).addScaledVector(d, t);
      arr[i * 3] = v.x;
      arr[i * 3 + 1] = v.y;
      arr[i * 3 + 2] = v.z;
    }
    return { positions: arr, base: arr.slice() };
  }, [motes]);

  const initial = useMemo(() => ({ uStrength: { value: 0.07 } }), []);
  const moteMaterial = useRef<THREE.PointsMaterial>(null);

  useFrame(({ clock }) => {
    const p = progress.current ?? 0;
    const t = clock.getElapsedTime();
    // The shaft strengthens a little as the room comes clean.
    const strength = 0.06 + smoothstep(SHINE, p) * 0.04;
    if (beam.current) beam.current.uniforms.uStrength.value = strength;
    if (moteMaterial.current) moteMaterial.current.opacity = 0.35 + smoothstep(SHINE, p) * 0.25;

    const geo = points.current?.geometry;
    if (!geo) return;
    const attr = geo.getAttribute("position") as THREE.BufferAttribute;
    for (let i = 0; i < attr.count; i++) {
      attr.setXYZ(
        i,
        base[i * 3] + Math.sin(t * 0.13 + i * 1.7) * 0.08,
        base[i * 3 + 1] + Math.sin(t * 0.09 + i * 2.3) * 0.06,
        base[i * 3 + 2] + Math.cos(t * 0.11 + i * 0.9) * 0.08,
      );
    }
    attr.needsUpdate = true;
  });

  return (
    <group>
      <mesh geometry={geometry} renderOrder={2}>
        <shaderMaterial
          ref={beam}
          vertexShader={beamVertex}
          fragmentShader={beamFragment}
          uniforms={initial}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
        />
      </mesh>
      <points ref={points}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          ref={moteMaterial}
          size={0.016}
          map={dot}
          alphaMap={dot}
          color="#fff3dd"
          transparent
          opacity={0.35}
          sizeAttenuation
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  );
}

/* -------------------------------------------------------------------------- */
/* Desk and what's on it                                                       */
/* -------------------------------------------------------------------------- */

function Metal({ color = "#1d2129", rough = 0.35 }: { color?: string; rough?: number }) {
  return <meshStandardMaterial color={color} roughness={rough} metalness={0.85} />;
}

function Desk({ progress }: { progress: RefObject<number> }) {
  const screen = useRef<THREE.MeshBasicMaterial>(null);
  const top = useRef<THREE.Mesh>(null);
  const textures = useMemo(
    () => ({ laminate: laminateTexture(), screen: screenTexture(), keys: keyboardTexture() }),
    [],
  );

  const material = useMemo(() => {
    const material = new THREE.MeshPhysicalMaterial({
      color: "#eef0f2",
      map: textures.laminate,
      roughness: 0.32,
      clearcoat: 0.4,
      clearcoatRoughness: 0.2,
      envMapIntensity: 0.8,
    });
    withReveal(material, {
      dir: [1, 0],
      dirty: "#8a8170",
      grime: 0.9,
      dirtyRough: 0.9,
      noise: 3.2,
      glowWidth: 0.01,
      soft: 0.03,
    });
    return material;
  }, [textures]);

  useEffect(() => () => material.dispose(), [material]);

  useFrame(() => {
    const p = progress.current ?? 0;
    const edge = edgeAt(WIPE, p, DESK_FROM, DESK_TO);
    const live = revealOf(top.current);
    if (live) {
      live.uniforms.uEdgeA.value = edge;
      live.uniforms.uEdgeB.value = edge;
      live.uniforms.uGlowA.value = pulse(WIPE, p) * 1.6;
    }
    if (screen.current) {
      // The screen sits mid-desk; it comes up as the edge passes it.
      const lit = clamp01((edge - (DESK.x + 0.1)) / 0.5);
      const level = 0.25 + lit * 0.9 + smoothstep(SHINE, p) * 0.3;
      screen.current.color.setScalar(level);
    }
  });

  const { length: L, depth: D, top: H } = DESK;

  return (
    <group position={[DESK.x, 0, DESK.z]}>
      <RoundedBox
        ref={top}
        args={[L, 0.035, D]}
        radius={0.012}
        smoothness={3}
        position={[0, H, 0]}
        material={material}
        castShadow
        receiveShadow
      />

      {/* Sled legs: two closed frames in powder-coated steel */}
      {[-L / 2 + 0.12, L / 2 - 0.12].map((x) => (
        <group key={x} position={[x, 0, 0]}>
          {[-D / 2 + 0.08, D / 2 - 0.08].map((z) => (
            <mesh key={z} position={[0, H / 2, z]} castShadow>
              <boxGeometry args={[0.04, H - 0.02, 0.04]} />
              <Metal />
            </mesh>
          ))}
          <mesh position={[0, 0.02, 0]} castShadow>
            <boxGeometry args={[0.04, 0.04, D - 0.12]} />
            <Metal />
          </mesh>
          <mesh position={[0, H - 0.04, 0]}>
            <boxGeometry args={[0.04, 0.04, D - 0.12]} />
            <Metal />
          </mesh>
        </group>
      ))}
      {/* Modesty panel */}
      <mesh position={[0, H - 0.22, -D / 2 + 0.1]} castShadow>
        <boxGeometry args={[L - 0.3, 0.36, 0.015]} />
        <Metal color="#2a2f38" rough={0.6} />
      </mesh>

      {/* Monitor */}
      <group position={[0.1, H + 0.0175, -0.35]}>
        <RoundedBox args={[0.32, 0.012, 0.22]} radius={0.005} smoothness={2} position={[0, 0.006, 0]} castShadow>
          <Metal color="#2b2f36" rough={0.3} />
        </RoundedBox>
        <mesh position={[0, 0.2, -0.05]} castShadow>
          <boxGeometry args={[0.05, 0.38, 0.025]} />
          <Metal color="#2b2f36" rough={0.3} />
        </mesh>
        <RoundedBox args={[1.08, 0.64, 0.03]} radius={0.01} smoothness={3} position={[0, 0.5, -0.03]} castShadow>
          <meshStandardMaterial color="#111318" roughness={0.35} metalness={0.4} />
        </RoundedBox>
        <mesh position={[0, 0.505, -0.0145]}>
          <planeGeometry args={[1.04, 0.585]} />
          <meshBasicMaterial ref={screen} map={textures.screen} />
        </mesh>
      </group>

      {/* Keyboard and mouse */}
      <group position={[0.05, H + 0.0175, 0.2]}>
        <RoundedBox args={[0.44, 0.016, 0.135]} radius={0.006} smoothness={2} position={[0, 0.008, 0]} castShadow>
          <meshStandardMaterial color="#1c1f26" roughness={0.6} />
        </RoundedBox>
        <mesh position={[0, 0.0165, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.42, 0.12]} />
          <meshStandardMaterial map={textures.keys} roughness={0.7} />
        </mesh>
        <mesh position={[0.36, 0.014, 0.01]} scale={[0.032, 0.016, 0.056]} castShadow>
          <sphereGeometry args={[1, 24, 16]} />
          <meshStandardMaterial color="#1c1f26" roughness={0.4} />
        </mesh>
      </group>

      {/* Mug */}
      <group position={[-1.05, H + 0.0175, 0.18]}>
        <mesh position={[0, 0.048, 0]} castShadow>
          <cylinderGeometry args={[0.042, 0.038, 0.096, 32, 1, true]} />
          <meshStandardMaterial color="#f2f1ee" roughness={0.25} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, 0.002, 0]}>
          <cylinderGeometry args={[0.038, 0.038, 0.004, 32]} />
          <meshStandardMaterial color="#f2f1ee" roughness={0.25} />
        </mesh>
        <mesh position={[0, 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.039, 32]} />
          <meshStandardMaterial color="#3b2416" roughness={0.15} />
        </mesh>
        <mesh position={[0.05, 0.05, 0]} castShadow>
          <torusGeometry args={[0.024, 0.006, 12, 24, Math.PI]} />
          <meshStandardMaterial color="#f2f1ee" roughness={0.25} />
        </mesh>
      </group>

      {/* Notebook and pen */}
      <group position={[-0.7, H + 0.0175, 0.05]} rotation={[0, 0.18, 0]}>
        <RoundedBox args={[0.21, 0.014, 0.29]} radius={0.004} smoothness={2} position={[0, 0.007, 0]} castShadow>
          <meshStandardMaterial color="#1f4a44" roughness={0.75} />
        </RoundedBox>
        <mesh position={[0.07, 0.018, 0]} rotation={[0, 0.3, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.0045, 0.0045, 0.14, 12]} />
          <meshStandardMaterial color="#c9a46a" roughness={0.3} metalness={0.7} />
        </mesh>
      </group>

      {/* A loose stack of paper */}
      {[0, 1, 2].map((i) => (
        <mesh
          key={i}
          position={[0.95 + i * 0.006, H + 0.019 + i * 0.002, -0.1 + i * 0.004]}
          rotation={[-Math.PI / 2, 0, 0.12 - i * 0.05]}
          receiveShadow
        >
          <planeGeometry args={[0.21, 0.297]} />
          <meshStandardMaterial color="#f4f4f1" roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

/* -------------------------------------------------------------------------- */
/* Chair                                                                       */
/* -------------------------------------------------------------------------- */

function Chair() {
  const fabric = <meshStandardMaterial color="#2c313b" roughness={0.95} />;
  const shell = <meshStandardMaterial color="#1a1d23" roughness={0.55} />;
  const chrome = <meshStandardMaterial color="#c4ccd6" roughness={0.15} metalness={1} />;

  return (
    <group position={[DESK.x - 0.35, 0, DESK.z + 0.88]} rotation={[0, Math.PI + 0.22, 0]}>
      <RoundedBox args={[0.5, 0.07, 0.48]} radius={0.03} smoothness={3} position={[0, 0.47, 0]} castShadow>
        {fabric}
      </RoundedBox>
      <RoundedBox args={[0.44, 0.03, 0.42]} radius={0.01} smoothness={2} position={[0, 0.42, 0]} castShadow>
        {shell}
      </RoundedBox>
      <RoundedBox
        args={[0.47, 0.56, 0.05]}
        radius={0.025}
        smoothness={3}
        position={[0, 0.86, 0.24]}
        rotation={[-0.12, 0, 0]}
        castShadow
      >
        {fabric}
      </RoundedBox>
      <mesh position={[0, 0.6, 0.27]} rotation={[-0.1, 0, 0]} castShadow>
        <boxGeometry args={[0.06, 0.28, 0.025]} />
        {shell}
      </mesh>
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 0.27, 0, 0]}>
          <mesh position={[0, 0.55, 0.04]} castShadow>
            <boxGeometry args={[0.03, 0.18, 0.03]} />
            {shell}
          </mesh>
          <RoundedBox args={[0.06, 0.025, 0.26]} radius={0.01} smoothness={2} position={[0, 0.65, 0.02]} castShadow>
            {shell}
          </RoundedBox>
        </group>
      ))}
      <mesh position={[0, 0.27, 0]} castShadow>
        <cylinderGeometry args={[0.025, 0.025, 0.28, 20]} />
        {chrome}
      </mesh>
      <mesh position={[0, 0.15, 0]}>
        <cylinderGeometry args={[0.035, 0.04, 0.1, 20]} />
        {shell}
      </mesh>
      {[0, 1, 2, 3, 4].map((i) => {
        const a = (i / 5) * Math.PI * 2;
        return (
          <group key={i} rotation={[0, a, 0]}>
            <mesh position={[0.16, 0.085, 0]} rotation={[0, 0, -0.08]} castShadow>
              <boxGeometry args={[0.32, 0.03, 0.045]} />
              {chrome}
            </mesh>
            <mesh position={[0.31, 0.03, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
              <cylinderGeometry args={[0.028, 0.028, 0.03, 16]} />
              <meshStandardMaterial color="#111" roughness={0.5} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

/* -------------------------------------------------------------------------- */
/* Plant, credenza, art, pendant                                               */
/* -------------------------------------------------------------------------- */

/** One leaf: a narrow plane bent into an arc, so it catches light like a
 *  real blade rather than a flat card. */
function useLeafGeometry() {
  return useMemo(() => {
    const geometry = new THREE.PlaneGeometry(0.06, 0.75, 1, 10);
    geometry.translate(0, 0.375, 0);
    const pos = geometry.getAttribute("position");
    for (let i = 0; i < pos.count; i++) {
      const t = pos.getY(i) / 0.75;
      // Taper to a point and arch outward
      pos.setX(i, pos.getX(i) * (1 - t * 0.85));
      pos.setZ(i, Math.pow(t, 2) * 0.28);
    }
    geometry.computeVertexNormals();
    return geometry;
  }, []);
}

function Plant({ position }: { position: [number, number, number] }) {
  const leaf = useLeafGeometry();
  const leaves = useMemo(
    () =>
      Array.from({ length: 16 }, (_, i) => ({
        yaw: (i / 16) * Math.PI * 2 + rand(i, 4) * 0.4,
        tilt: 0.12 + rand(i, 5) * 0.4,
        scale: 0.75 + rand(i, 6) * 0.5,
        colour: new THREE.Color("#2f6b45").multiplyScalar(0.85 + rand(i, 7) * 0.3),
      })),
    [],
  );

  return (
    <group position={position}>
      <mesh position={[0, 0.27, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.23, 0.18, 0.54, 40]} />
        <meshStandardMaterial color="#d9d6cf" roughness={0.55} />
      </mesh>
      <mesh position={[0, 0.53, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.215, 32]} />
        <meshStandardMaterial color="#2e241c" roughness={1} />
      </mesh>
      {leaves.map((l, i) => (
        <mesh key={i} geometry={leaf} position={[0, 0.52, 0]} rotation={[l.tilt, l.yaw, 0]} scale={l.scale} castShadow>
          <meshStandardMaterial color={l.colour} roughness={0.6} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}

function Credenza() {
  const art = useMemo(() => artTexture(), []);
  const x = ROOM.xMin + 0.26;
  return (
    <group>
      <RoundedBox args={[0.46, 0.62, 2.0]} radius={0.01} smoothness={2} position={[x, 0.35, -1.6]} castShadow receiveShadow>
        <meshStandardMaterial color="#6e5340" roughness={0.55} />
      </RoundedBox>
      {/* Door seams and plinth */}
      {[-0.5, 0, 0.5].map((dz) => (
        <mesh key={dz} position={[x + 0.232, 0.35, -1.6 + dz]}>
          <boxGeometry args={[0.002, 0.58, 0.004]} />
          <meshStandardMaterial color="#2b2018" />
        </mesh>
      ))}
      <mesh position={[x, 0.02, -1.6]}>
        <boxGeometry args={[0.4, 0.04, 1.94]} />
        <meshStandardMaterial color="#1b1d22" roughness={0.6} />
      </mesh>
      {/* Books and a vase on top */}
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} position={[x - 0.02, 0.68 + 0.012, -2.3 + i * 0.045]} castShadow>
          <boxGeometry args={[0.2, 0.024 + i * 0.002, 0.04]} />
          <meshStandardMaterial color={["#283245", "#9b6b46", "#d6d0c4", "#2f6f68"][i]} roughness={0.8} />
        </mesh>
      ))}
      <mesh position={[x, 0.79, -0.95]} castShadow>
        <cylinderGeometry args={[0.05, 0.07, 0.22, 28]} />
        <meshStandardMaterial color="#1e2c2b" roughness={0.3} />
      </mesh>
      {/* Framed print */}
      <group position={[ROOM.xMin + 0.03, 1.65, -1.6]} rotation={[0, Math.PI / 2, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.66, 0.86, 0.03]} />
          <meshStandardMaterial color="#15171c" roughness={0.5} />
        </mesh>
        <mesh position={[0, 0, 0.016]}>
          <planeGeometry args={[0.58, 0.78]} />
          <meshStandardMaterial map={art} roughness={0.8} />
        </mesh>
      </group>
    </group>
  );
}

function Pendant() {
  const drop = 2.05;
  return (
    <group position={[DESK.x, 0, DESK.z]}>
      <mesh position={[0, (ROOM.ceiling + drop) / 2, 0]}>
        <cylinderGeometry args={[0.004, 0.004, ROOM.ceiling - drop, 6]} />
        <meshStandardMaterial color="#111" />
      </mesh>
      <mesh position={[0, drop, 0]} castShadow>
        <sphereGeometry args={[0.2, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#20242c" roughness={0.4} metalness={0.5} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, drop - 0.03, 0]}>
        <sphereGeometry args={[0.05, 20, 12]} />
        <meshBasicMaterial color={[3, 2.6, 2]} toneMapped={false} />
      </mesh>
    </group>
  );
}

/** Floating shelves on the back wall behind the desk. */
function WallShelves() {
  const z = ROOM.zBack + 0.13;
  const books = useMemo(() => {
    const row: { x: number; w: number; h: number; colour: string; lean: number }[] = [];
    let cursor = -2.55;
    for (let i = 0; i < 11; i++) {
      const w = 0.03 + rand(i, 71) * 0.025;
      row.push({
        x: cursor + w / 2,
        w,
        h: 0.2 + rand(i, 72) * 0.08,
        colour: ["#283245", "#9b6b46", "#d6d0c4", "#2f6f68", "#4a3b31", "#c9b48f"][Math.floor(rand(i, 73) * 6)],
        // The last one leans on its neighbour
        lean: i === 10 ? 0.25 : 0,
      });
      cursor += w + 0.004;
    }
    return row;
  }, []);

  return (
    <group>
      {[1.35, 1.8].map((y) => (
        <RoundedBox key={y} args={[1.6, 0.03, 0.24]} radius={0.006} smoothness={2} position={[-1.85, y, z]} castShadow receiveShadow>
          <meshStandardMaterial color="#7a5c45" roughness={0.6} />
        </RoundedBox>
      ))}
      {books.map((b, i) => (
        <mesh key={i} position={[b.x + b.lean * 0.05, 1.365 + b.h / 2, z]} rotation={[0, 0, -b.lean]} castShadow>
          <boxGeometry args={[b.w, b.h, 0.17]} />
          <meshStandardMaterial color={b.colour} roughness={0.85} />
        </mesh>
      ))}
      {/* A small plant and a frame on the upper shelf */}
      <mesh position={[-2.3, 1.87, z]} castShadow>
        <cylinderGeometry args={[0.055, 0.045, 0.11, 24]} />
        <meshStandardMaterial color="#d9d6cf" roughness={0.5} />
      </mesh>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <mesh
          key={i}
          position={[-2.3 + Math.cos(i) * 0.02, 1.96, z + Math.sin(i) * 0.02]}
          rotation={[Math.sin(i * 2) * 0.5, i, Math.cos(i * 2) * 0.5]}
          castShadow
        >
          <sphereGeometry args={[0.035, 10, 8]} />
          <meshStandardMaterial color="#3d7a4f" roughness={0.7} />
        </mesh>
      ))}
      <group position={[-1.5, 1.95, z - 0.04]} rotation={[-0.08, 0, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.22, 0.28, 0.02]} />
          <meshStandardMaterial color="#15171c" roughness={0.5} />
        </mesh>
        <mesh position={[0, 0, 0.011]}>
          <planeGeometry args={[0.18, 0.24]} />
          <meshStandardMaterial color="#d8d3c8" roughness={0.9} />
        </mesh>
      </group>
    </group>
  );
}

/** Arc floor lamp beside the credenza. */
function FloorLamp() {
  const metal = <meshStandardMaterial color="#1b1d22" roughness={0.3} metalness={0.8} />;
  return (
    <group position={[ROOM.xMin + 0.45, 0, 0.1]}>
      <mesh position={[0, 0.015, 0]} castShadow>
        <cylinderGeometry args={[0.16, 0.17, 0.03, 32]} />
        {metal}
      </mesh>
      <mesh position={[0, 0.8, 0]} castShadow>
        <cylinderGeometry args={[0.012, 0.012, 1.6, 12]} />
        {metal}
      </mesh>
      <mesh position={[0.18, 1.58, 0]} rotation={[0, 0, -1.1]} castShadow>
        <cylinderGeometry args={[0.01, 0.01, 0.42, 10]} />
        {metal}
      </mesh>
      <mesh position={[0.36, 1.62, 0]} castShadow>
        <cylinderGeometry args={[0.1, 0.17, 0.2, 32, 1, true]} />
        <meshStandardMaterial color="#e9e4d8" roughness={0.9} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0.36, 1.6, 0]}>
        <sphereGeometry args={[0.04, 16, 10]} />
        <meshBasicMaterial color={[2.6, 2.2, 1.7]} toneMapped={false} />
      </mesh>
    </group>
  );
}

/** A plain wall clock on the left wall, reading ten past eight. */
function WallClock() {
  const hand = (angle: number, length: number, width: number, zOffset: number) => (
    <mesh
      position={[Math.sin(angle) * length * 0.4, Math.cos(angle) * length * 0.4, zOffset]}
      rotation={[0, 0, -angle]}
    >
      <planeGeometry args={[width, length]} />
      <meshBasicMaterial color="#1b1d22" />
    </mesh>
  );
  return (
    <group position={[ROOM.xMin + 0.02, 2.2, 0.9]} rotation={[0, Math.PI / 2, 0]}>
      <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.17, 0.17, 0.035, 48]} />
        <meshStandardMaterial color="#16181d" roughness={0.4} />
      </mesh>
      <mesh position={[0, 0, 0.018]}>
        <circleGeometry args={[0.155, 48]} />
        <meshStandardMaterial color="#f3f2ee" roughness={0.7} />
      </mesh>
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.sin(a) * 0.135, Math.cos(a) * 0.135, 0.02]} rotation={[0, 0, -a]}>
            <planeGeometry args={[0.006, i % 3 === 0 ? 0.03 : 0.015]} />
            <meshBasicMaterial color="#1b1d22" />
          </mesh>
        );
      })}
      {hand((8 / 12 + 10 / 720) * Math.PI * 2, 0.09, 0.009, 0.021)}
      {hand((10 / 60) * Math.PI * 2, 0.125, 0.006, 0.022)}
    </group>
  );
}

/* -------------------------------------------------------------------------- */
/* Pass 1 — dust lifted off the desk as the wipe passes                        */
/* -------------------------------------------------------------------------- */

function DustMotes({ progress, count }: { progress: RefObject<number>; count: number }) {
  const points = useRef<THREE.Points>(null);
  const material = useRef<THREE.PointsMaterial>(null);
  const dot = useMemo(() => dotTexture(), []);

  const { positions, base } = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = DESK.x - DESK.length / 2 + rand(i, 1) * DESK.length;
      arr[i * 3 + 1] = DESK.top + 0.04 + rand(i, 2) * 0.35;
      arr[i * 3 + 2] = DESK.z - DESK.depth / 2 + rand(i, 3) * DESK.depth;
    }
    return { positions: arr, base: arr.slice() };
  }, [count]);

  useFrame(({ clock }) => {
    const p = progress.current ?? 0;
    const edge = edgeAt(WIPE, p, DESK_FROM, DESK_TO);
    const t = clock.getElapsedTime();

    if (material.current) {
      material.current.opacity = 0.6 * (1 - smoothstep([WIPE[1] - 0.04, WIPE[1] + 0.02], p));
    }

    const geo = points.current?.geometry;
    if (!geo) return;
    const attr = geo.getAttribute("position") as THREE.BufferAttribute;
    for (let i = 0; i < attr.count; i++) {
      const x = base[i * 3];
      // Each mote is lifted the moment the edge reaches it, and keeps rising.
      const lifted = clamp01((edge - x) / 0.7);
      const rise = lifted * lifted * (0.5 + rand(i, 9) * 0.9);
      attr.setXYZ(
        i,
        x + Math.sin(t * 0.3 + i * 2) * 0.02 + lifted * 0.15,
        base[i * 3 + 1] + Math.sin(t * 0.45 + i) * 0.02 + rise,
        base[i * 3 + 2] + Math.cos(t * 0.35 + i) * 0.02,
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
        size={0.022}
        map={dot}
        alphaMap={dot}
        color="#e4d8bd"
        transparent
        opacity={0.6}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

/* -------------------------------------------------------------------------- */
/* Pass 2 — grit that disappears as the vacuum line crosses it                 */
/* -------------------------------------------------------------------------- */

function Grit({ progress, count }: { progress: RefObject<number>; count: number }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const dummy = useRef(new THREE.Object3D()).current;
  const dir = useMemo(() => new THREE.Vector2(...FLOOR_DIR).normalize(), []);

  const spots = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const x = -5.2 + rand(i, 1) * 10.4;
        const z = -4.8 + rand(i, 2) * 9.8;
        return {
          x,
          z,
          // Mostly crumbs of a few millimetres, the odd bigger piece
          s: 0.006 + Math.pow(rand(i, 4), 2.2) * 0.024,
          along: x * dir.x + z * dir.y,
          tone: rand(i, 8),
        };
      }),
    [count, dir],
  );

  // Crumbs, grit and the odd fleck of paper, in a natural spread of tones.
  useEffect(() => {
    const instanced = mesh.current;
    if (!instanced) return;
    const colour = new THREE.Color();
    spots.forEach((spot, i) => {
      if (spot.tone > 0.9) colour.set("#e9e6df");
      else if (spot.tone > 0.55) colour.set("#7a6750");
      else if (spot.tone > 0.25) colour.set("#a08a6a");
      else colour.set("#4b4339");
      instanced.setColorAt(i, colour);
    });
    if (instanced.instanceColor) instanced.instanceColor.needsUpdate = true;
  }, [spots]);

  useFrame(() => {
    if (!mesh.current) return;
    const p = progress.current ?? 0;
    const edge = edgeAt(VACUUM, p, FLOOR_FROM, FLOOR_TO);

    for (let i = 0; i < spots.length; i++) {
      const spot = spots[i];
      // 0 untouched, 1 gone — a short lift-and-shrink right at the line.
      const taken = clamp01((edge - spot.along) / 0.3);
      const eased = taken * taken;
      dummy.position.set(
        spot.x + dir.x * eased * 0.25,
        spot.s * 0.5 + eased * 0.12,
        spot.z + dir.y * eased * 0.25,
      );
      dummy.scale.set(spot.s, spot.s * 0.6, spot.s).multiplyScalar(Math.max(1 - eased, 0.0001));
      dummy.rotation.set(i, i * 2, i * 3);
      dummy.updateMatrix();
      mesh.current.setMatrixAt(i, dummy.matrix);
    }
    mesh.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]}>
      <dodecahedronGeometry args={[1, 0]} />
      <meshStandardMaterial roughness={0.95} />
    </instancedMesh>
  );
}

/* -------------------------------------------------------------------------- */
/* Pass 4 — light catching clean edges                                         */
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
  gl_PointSize = uSize * (0.35 + beat) * uPixelRatio * (6.0 / -mv.z);
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

/** Points on real edges — desk corners, monitor, chair base, window frame. */
const SPARKLE_ANCHORS: [number, number, number][] = [
  [DESK.x - DESK.length / 2, DESK.top + 0.02, DESK.z + DESK.depth / 2],
  [DESK.x + DESK.length / 2, DESK.top + 0.02, DESK.z + DESK.depth / 2],
  [DESK.x + 0.64, DESK.top + 0.84, DESK.z - 0.38],
  [DESK.x - 0.44, DESK.top + 0.2, DESK.z - 0.38],
  [DESK.x - 1.05, DESK.top + 0.115, DESK.z + 0.18],
  [DESK.x - 0.04, 0.03, DESK.z + 0.88],
  [WIN.x0, WIN.y1, ROOM.zBack - 0.03],
  [WIN.x1, WIN.y0, ROOM.zBack - 0.03],
  [WIN_CX, WIN.y0 + WIN_H * 0.68, ROOM.zBack - 0.03],
  [DESK.x + 0.2, 2.05, DESK.z],
  [ROOM.xMin + 0.5, 0.66, -0.6],
];

function Sparkles({ progress }: { progress: RefObject<number> }) {
  const sparkle = useRef<THREE.ShaderMaterial>(null);

  const { positions, phases } = useMemo(
    () => ({
      positions: new Float32Array(SPARKLE_ANCHORS.flat()),
      phases: new Float32Array(SPARKLE_ANCHORS.map((_, i) => rand(i, 31))),
    }),
    [],
  );

  const initial = useMemo(
    () => ({
      uTime: { value: 0 },
      uAmount: { value: 0 },
      uSize: { value: 22 },
      uPixelRatio: { value: 1 },
      uColor: { value: new THREE.Color("#f0fffd") },
    }),
    [],
  );

  useFrame(({ clock, gl }) => {
    const uniforms = sparkle.current?.uniforms;
    if (!uniforms) return;
    const p = progress.current ?? 0;
    uniforms.uTime.value = clock.getElapsedTime();
    uniforms.uAmount.value = smoothstep([SHINE[0] + 0.04, SHINE[1]], p) * 1.3;
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

/** Without a composer the renderer tone maps directly; with one, the
 *  ToneMapping effect does it. Either way it is Khronos PBR Neutral: it rolls
 *  off bright sunlight without the washed-out, desaturated look of a filmic
 *  curve, so materials keep their true colour. */
function RendererTone({ composited }: { composited: boolean }) {
  const get = useThree((state) => state.get);
  useEffect(() => {
    if (composited) return;
    const { gl } = get();
    gl.toneMapping = THREE.NeutralToneMapping;
    gl.toneMappingExposure = 1;
  }, [get, composited]);
  return null;
}

function Effects({ tier, focus }: { tier: DeviceTier; focus: THREE.Vector3 }): ReactNode {
  if (tier === "low") return null;
  return (
    <EffectComposer enableNormalPass={false} multisampling={0}>
      {/* A shallow, photographic depth of field that follows the subject of
          each beat. High tier only: it is the most expensive pass here. */}
      {tier === "high" ? (
        <DepthOfField target={focus} worldFocusRange={3.2} bokehScale={1.6} />
      ) : (
        <></>
      )}
      <N8AO
        aoRadius={0.7}
        distanceFalloff={0.8}
        intensity={tier === "high" ? 3.2 : 2.6}
        quality={tier === "high" ? "medium" : "low"}
        halfRes={tier !== "high"}
      />
      <Bloom
        intensity={tier === "high" ? 0.55 : 0.35}
        luminanceThreshold={0.9}
        luminanceSmoothing={0.3}
        mipmapBlur
      />
      <ToneMapping mode={ToneMappingMode.NEUTRAL} />
      <Vignette eskil={false} offset={0.3} darkness={0.45} />
      <SMAA />
    </EffectComposer>
  );
}

export default function OfficeClean({ progress }: { progress: RefObject<number> }) {
  const { tier: measured, reducedMotion } = useDeviceTier();
  const setDpr = useThree((state) => state.setDpr);

  /*
   * The device grade is a guess from core count and memory; the frame rate
   * is the truth. If frames drop, step down one tier (once) and render at
   * 1x — a smooth scroll matters more than the most expensive effects.
   */
  const [steppedDown, setSteppedDown] = useState(false);
  const tier: DeviceTier =
    steppedDown && measured === "high" ? "mid" : steppedDown && measured === "mid" ? "low" : measured;
  const smoothed = useRef(0);
  const focus = useMemo(() => new THREE.Vector3(...CAMERA_LOOK[0]), []);

  const gritCount = tier === "high" ? 260 : tier === "mid" ? 170 : 90;
  const dustCount = tier === "high" ? 140 : tier === "mid" ? 80 : 40;

  return (
    <>
      <PerformanceMonitor
        bounds={() => [40, 58]}
        flipflops={1}
        onDecline={() => {
          setSteppedDown(true);
          setDpr(1);
        }}
      />
      <Driver targetRef={progress} smoothedRef={smoothed} />
      <CameraRig progress={smoothed} reducedMotion={reducedMotion} focus={focus} />
      <LightRig progress={smoothed} tier={tier} />
      {tier !== "low" ? <ShadowBake /> : null}
      <RendererTone composited={tier !== "low"} />

      <Environment resolution={tier === "high" ? 256 : 128} frames={1}>
        {/* The window: broad and soft, so reflections of it are a gradient */}
        <Lightformer form="rect" intensity={2.2} position={[WIN_CX, WIN_CY, -7]} scale={[8, 4, 1]} color="#fff1df" />
        {/* Ceiling panels */}
        <Lightformer intensity={1} position={[0, 6, 0]} rotation-x={Math.PI / 2} scale={[8, 6, 1]} color="#f2f5fa" />
        {/* Pale walls either side */}
        <Lightformer intensity={0.35} position={[-8, 1.5, 0]} rotation-y={Math.PI / 2} scale={[12, 3, 1]} color="#d9dce2" />
        <Lightformer intensity={0.35} position={[8, 1.5, 0]} rotation-y={-Math.PI / 2} scale={[12, 3, 1]} color="#d9dce2" />
      </Environment>

      <Floor progress={smoothed} tier={tier} />
      <Walls progress={smoothed} />
      <Window progress={smoothed} />
      <Desk progress={smoothed} />
      <Chair />
      <Plant position={[0.55, 0, -4.85]} />
      <Credenza />
      <Pendant />
      <WallShelves />
      <FloorLamp />
      <WallClock />
      <ContactBlobs />

      {/* Ambient occlusion grounds furniture on the composited tiers; the
          low tier gets cheap baked contact shadows instead */}
      {tier === "low" ? (
        <ContactShadows
          position={[0, 0.003, (ROOM.zBack + ROOM.zFront) / 2]}
          scale={[ROOM.xMax - ROOM.xMin, ROOM.zFront - ROOM.zBack]}
          resolution={512}
          blur={2.2}
          opacity={0.45}
          far={0.6}
          frames={1}
          color="#14120f"
        />
      ) : null}

      <DustMotes progress={smoothed} count={dustCount} />
      <Grit progress={smoothed} count={gritCount} />
      <Sparkles progress={smoothed} />
      <Sunbeam progress={smoothed} motes={tier === "high" ? 160 : tier === "mid" ? 90 : 40} />

      <Effects tier={tier} focus={focus} />
    </>
  );
}
