"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
import * as THREE from "three";
import {
  graphBounds,
  neuralGraph,
  nodesById,
  type NeuralNode,
} from "@/lib/neural";
import { useDeviceTier, type DeviceTier } from "@/hooks/useDeviceTier";
import { dotTexture } from "@/lib/dot-texture";

const IDLE = "#8d97b0";

/** How far a focused node is pulled toward the middle, as a share of its offset. */
const FOCUS_PULL_X = 0.2;
const FOCUS_PULL_Y = 0.2;

/** Largest node radius on the graph — the group core. */
const MAX_RADIUS = Math.max(...neuralGraph.nodes.map((n) => n.size));

const REACH_X = Math.max(
  Math.abs(graphBounds.minX),
  Math.abs(graphBounds.maxX),
);
const REACH_Y = Math.max(
  Math.abs(graphBounds.minY),
  Math.abs(graphBounds.maxY),
);

/**
 * The box the network needs, in world units. Sized from the graph itself: how
 * far a node sits from the middle, how far the focus shift can push it further
 * out, its own radius, and a margin so nothing sits hard against the frame.
 *
 * The rig scales to this rather than to a table of breakpoints, so the graph
 * fills whatever box it is handed — a desktop column or a phone — and the far
 * end of the network stays in frame even while something is focused.
 */
const SPAN_X = 2 * (REACH_X * (1 + FOCUS_PULL_X) + MAX_RADIUS) + 0.8;
const SPAN_Y = 2 * (REACH_Y * (1 + FOCUS_PULL_Y) + MAX_RADIUS) + 0.8;

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

/** Endpoints of every edge, flattened. The graph is static, so this is a
 *  module-level constant rather than anything a component recomputes. */
function edgeEndpoints() {
  const { edges } = neuralGraph;
  const from = new Float32Array(edges.length * 3);
  const to = new Float32Array(edges.length * 3);

  edges.forEach((edge, i) => {
    const a = nodesById.get(edge.from);
    const b = nodesById.get(edge.to);
    if (!a || !b) return;
    from.set(a.position, i * 3);
    to.set(b.position, i * 3);
  });

  return { from, to };
}

const EDGES = edgeEndpoints();

/* -------------------------------------------------------------------------- */
/* Edges                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * All edges in one draw call. The highlight pass is a second, much smaller
 * LineSegments rebuilt only when the active node changes — cheaper and far
 * simpler than pushing per-vertex colours every frame.
 */
function Edges({ activeId }: { activeId: string | null }) {
  const base = useMemo(() => {
    const { edges } = neuralGraph;
    const positions = new Float32Array(edges.length * 6);
    edges.forEach((edge, i) => {
      const a = nodesById.get(edge.from);
      const b = nodesById.get(edge.to);
      if (!a || !b) return;
      positions.set(a.position, i * 6);
      positions.set(b.position, i * 6 + 3);
    });
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(positions, 3),
    );
    return geometry;
  }, []);

  const highlight = useMemo(() => {
    if (!activeId) return null;
    const live = neuralGraph.edges.filter(
      (edge) => edge.from === activeId || edge.to === activeId,
    );
    if (live.length === 0) return null;

    const positions = new Float32Array(live.length * 6);
    live.forEach((edge, i) => {
      const a = nodesById.get(edge.from);
      const b = nodesById.get(edge.to);
      if (!a || !b) return;
      positions.set(a.position, i * 6);
      positions.set(b.position, i * 6 + 3);
    });
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(positions, 3),
    );
    return geometry;
  }, [activeId]);

  useEffect(() => () => base.dispose(), [base]);
  useEffect(() => () => highlight?.dispose(), [highlight]);

  const accent = activeId
    ? (nodesById.get(activeId)?.accent ?? IDLE)
    : IDLE;

  return (
    <>
      <lineSegments geometry={base}>
        <lineBasicMaterial
          color={IDLE}
          transparent
          opacity={activeId ? 0.06 : 0.14}
          depthWrite={false}
        />
      </lineSegments>

      {highlight ? (
        <lineSegments geometry={highlight}>
          <lineBasicMaterial
            color={accent}
            transparent
            opacity={0.75}
            depthWrite={false}
          />
        </lineSegments>
      ) : null}
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Signals                                                                     */
/* -------------------------------------------------------------------------- */

const SIGNAL_COUNT: Record<DeviceTier, number> = {
  high: 130,
  mid: 70,
  low: 34,
};

type Simulation = {
  positions: Float32Array;
  edgeIndex: Uint16Array;
  progress: Float32Array;
  speed: Float32Array;
};

/** Scatters `count` charges across the network at random points on random edges. */
function seedSimulation(count: number, edgeCount: number): Simulation {
  const positions = new Float32Array(count * 3);
  const edgeIndex = new Uint16Array(count);
  const progress = new Float32Array(count);
  const speed = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    edgeIndex[i] = Math.floor(Math.random() * edgeCount);
    progress[i] = Math.random();
    speed[i] = 0.18 + Math.random() * 0.32;
  }

  return { positions, edgeIndex, progress, speed };
}

/**
 * Charges running along the edges. One Points object for the lot — giving each
 * signal its own mesh is exactly the kind of thing that melts a phone.
 *
 * The buffers are seeded in an effect rather than in render: the scatter is
 * random and the frame loop writes into it every frame, and neither belongs in
 * a render pass that React is free to run more than once.
 */
function Signals({ tier }: { tier: DeviceTier }) {
  const points = useRef<THREE.Points>(null);
  const simulation = useRef<Simulation | null>(null);
  const count = SIGNAL_COUNT[tier];
  const edgeCount = neuralGraph.edges.length;

  useEffect(() => {
    const node = points.current;
    if (!node) return;

    const state = seedSimulation(count, edgeCount);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(state.positions, 3),
    );

    const previous = node.geometry;
    node.geometry = geometry;
    simulation.current = state;

    return () => {
      simulation.current = null;
      node.geometry = previous;
      geometry.dispose();
    };
  }, [count, edgeCount]);

  useFrame((_, delta) => {
    const state = simulation.current;
    const node = points.current;
    if (!state || !node) return;

    // A backgrounded tab hands back a huge delta; clamp so signals do not
    // teleport to the far end of the network on the first frame back.
    const step = Math.min(delta, 0.05);
    const { positions, edgeIndex, progress, speed } = state;

    for (let i = 0; i < count; i++) {
      progress[i] += speed[i] * step;
      if (progress[i] > 1) {
        progress[i] -= 1;
        // Respawn on a different edge, so the same paths do not pulse forever.
        edgeIndex[i] = Math.floor(Math.random() * edgeCount);
      }

      const e = edgeIndex[i] * 3;
      const t = progress[i];
      positions[i * 3] = EDGES.from[e] + (EDGES.to[e] - EDGES.from[e]) * t;
      positions[i * 3 + 1] =
        EDGES.from[e + 1] + (EDGES.to[e + 1] - EDGES.from[e + 1]) * t;
      positions[i * 3 + 2] =
        EDGES.from[e + 2] + (EDGES.to[e + 2] - EDGES.from[e + 2]) * t;
    }

    const attribute = node.geometry.attributes.position;
    if (attribute) attribute.needsUpdate = true;
  });

  return (
    <points ref={points}>
      <pointsMaterial
        size={0.13}
        map={dotTexture()}
        color="#e8d5a3"
        transparent
        opacity={0.85}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        sizeAttenuation
      />
    </points>
  );
}

/* -------------------------------------------------------------------------- */
/* Nodes                                                                       */
/* -------------------------------------------------------------------------- */

function Node({
  node,
  active,
  hovered,
  connected,
  reducedMotion,
  onHover,
  onSelect,
}: {
  node: NeuralNode;
  active: boolean;
  hovered: boolean;
  connected: boolean;
  reducedMotion: boolean;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
}) {
  const core = useRef<THREE.Mesh>(null);
  const halo = useRef<THREE.Mesh>(null);
  // Phase-shifts each node's idle breath so the layer doesn't pulse in unison.
  const phase = useMemo(() => node.position[1] * 1.7 + node.position[0], [node]);

  const lit = active || hovered;
  const dim = !lit && !connected;

  useFrame(({ clock }, delta) => {
    const damp = 1 - Math.pow(0.0008, Math.min(delta, 0.05));
    const target = lit ? 1.45 : connected ? 1.12 : 1;

    if (core.current) {
      const next = reducedMotion
        ? target
        : THREE.MathUtils.lerp(core.current.scale.x, target, damp);
      core.current.scale.setScalar(next);
    }

    if (halo.current) {
      const t = clock.getElapsedTime();
      const breath = reducedMotion ? 1 : 1 + Math.sin(t * 1.1 + phase) * 0.07;
      halo.current.scale.setScalar((lit ? 2.9 : 2.1) * breath);
    }
  });

  return (
    <group
      position={node.position}
      onPointerOver={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        onHover(node.id);
      }}
      onPointerOut={() => onHover(null)}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        onSelect(node.id);
      }}
    >
      {/* Generous hit area — the visible node is far too small to aim at,
          especially on a phone. Fully transparent rather than `visible={false}`
          so it still takes part in raycasting. */}
      <mesh>
        <sphereGeometry args={[Math.max(node.size * 3.4, 0.42), 12, 12]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      <mesh ref={core}>
        <sphereGeometry args={[node.size, 32, 32]} />
        <meshStandardMaterial
          color={node.accent}
          emissive={node.accent}
          emissiveIntensity={lit ? 5 : dim ? 1.1 : 2.6}
          roughness={0.25}
          metalness={0.4}
        />
      </mesh>

      <mesh ref={halo}>
        <sphereGeometry args={[node.size, 20, 20]} />
        <meshBasicMaterial
          color={node.accent}
          transparent
          opacity={lit ? 0.16 : dim ? 0.04 : 0.08}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

/* -------------------------------------------------------------------------- */
/* Rig                                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Frames the whole network and slides the active node toward the middle.
 *
 * The camera is left alone deliberately: rotating the graph rather than flying
 * the camera keeps the framing predictable at every viewport, which matters
 * when the thing has to fit a phone as well as a desktop.
 */
function Rig({
  activeId,
  reducedMotion,
  children,
}: {
  activeId: string | null;
  reducedMotion: boolean;
  children: React.ReactNode;
}) {
  const rig = useRef<THREE.Group>(null);
  const viewport = useThree((state) => state.viewport);
  const target = useMemo(() => new THREE.Vector3(), []);

  // The network is a wide, short shape. In a tall frame — a phone, or a narrow
  // column — it is turned on its side so the layers stack bottom to top:
  // coverage at the bottom, the group at the top. Same graph, better fit.
  const portrait = viewport.aspect < 0.95;

  const fit = useMemo(() => {
    const needX = portrait ? SPAN_Y : SPAN_X;
    const needY = portrait ? SPAN_X : SPAN_Y;
    return Math.min(viewport.width / needX, viewport.height / needY, 1.2);
  }, [portrait, viewport.width, viewport.height]);

  useFrame(({ pointer }, delta) => {
    const node = activeId ? nodesById.get(activeId) : null;
    // Pull the active node partway to centre — enough to say "this one",
    // not so far that the rest of the network leaves the frame.
    target.set(
      node ? -node.position[0] * FOCUS_PULL_X : 0,
      node ? -node.position[1] * FOCUS_PULL_Y : 0,
      0,
    );

    if (!rig.current) return;

    if (reducedMotion) {
      rig.current.position.copy(target);
      rig.current.rotation.set(0, -0.22, 0);
      return;
    }

    const damp = 1 - Math.pow(0.002, Math.min(delta, 0.05));
    rig.current.position.lerp(target, damp);
    rig.current.rotation.y = THREE.MathUtils.lerp(
      rig.current.rotation.y,
      -0.22 + pointer.x * 0.3,
      damp,
    );
    rig.current.rotation.x = THREE.MathUtils.lerp(
      rig.current.rotation.x,
      pointer.y * -0.16,
      damp,
    );
  });

  return (
    <group scale={fit} rotation={[0, 0, portrait ? Math.PI / 2 : 0]}>
      <group ref={rig}>{children}</group>
    </group>
  );
}

/* -------------------------------------------------------------------------- */

export default function NeuralField({
  selectedId,
  hoveredId,
  onHover,
  onSelect,
}: {
  selectedId: string | null;
  hoveredId: string | null;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
}) {
  const { tier, reducedMotion } = useDeviceTier();
  const activeId = hoveredId ?? selectedId;

  const connected = useMemo(() => {
    if (!activeId) return new Set<string>();
    return new Set(neuralGraph.neighbours[activeId] ?? []);
  }, [activeId]);

  return (
    <>
      <ambientLight intensity={0.4} />
      <pointLight position={[-6, 3, 5]} intensity={30} color="#6b8cff" />
      <pointLight position={[6, -2, 4]} intensity={22} color="#c8a45c" />

      <Rig activeId={activeId} reducedMotion={reducedMotion}>
        <Edges activeId={activeId} />

        {/* Signals are decoration, not content — reduced motion drops them
            rather than freezing a scatter of dots mid-edge. */}
        {reducedMotion ? null : <Signals tier={tier} />}

        {neuralGraph.nodes.map((node) => (
          <Node
            key={node.id}
            node={node}
            active={node.id === selectedId}
            hovered={node.id === hoveredId}
            connected={connected.has(node.id)}
            reducedMotion={reducedMotion}
            onHover={onHover}
            onSelect={onSelect}
          />
        ))}
      </Rig>

      {tier !== "low" ? (
        <EffectComposer enableNormalPass={false}>
          <Bloom
            intensity={tier === "high" ? 1.1 : 0.65}
            luminanceThreshold={0.3}
            luminanceSmoothing={0.85}
            mipmapBlur
          />
          <Vignette eskil={false} offset={0.2} darkness={0.8} />
        </EffectComposer>
      ) : null}
    </>
  );
}
