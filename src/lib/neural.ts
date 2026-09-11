import { cleaning, divisions, group, neuralLink } from "@/content/site";

/**
 * ============================================================================
 * NEURAL LINK — graph model
 * ============================================================================
 * Builds the network the /neural console renders. Nothing here is authored:
 * every node comes from `content/site.ts`, so adding a division or a service
 * adds a node and its edges without anyone editing a map.
 *
 * The layers run input -> output, the way a job actually travels:
 *
 *   area  ->  service  ->  division  ->  group
 *   where it     what the      who carries    the standard
 *   comes from   work is       it out         behind it
 *
 * Positions are deterministic so the layout is identical on the server and
 * the client, and so the SVG fallback can project the same graph.
 * ============================================================================
 */

export type NeuralLayer = "area" | "service" | "division" | "group";

/** Layer order, input to output. Drives x placement and the index rail. */
export const LAYER_ORDER: NeuralLayer[] = [
  "area",
  "service",
  "division",
  "group",
];

export type NeuralNode = {
  id: string;
  layer: NeuralLayer;
  label: string;
  /** One line under the label — discipline, blurb opener, layer caption. */
  detail: string;
  body: string;
  /** Bullet detail, when the source content has any. */
  points: readonly string[];
  /** Where this node lives on the site, if it has a page. */
  href: string | null;
  /** Retint the whole console via `[data-brand]` while this node is active. */
  brand: "group" | "cleaning";
  /** Hex, for the 3D scene and the SVG fallback — CSS vars are not available there. */
  accent: string;
  status: "operating" | "in-development" | null;
  position: [number, number, number];
  /** Node radius in world units. Bigger the further down the network you go. */
  size: number;
};

export type NeuralEdge = {
  id: string;
  from: string;
  to: string;
};

export type NeuralGraph = {
  nodes: NeuralNode[];
  edges: NeuralEdge[];
  /** Node ids either side of a given node, for the "Connects to" list. */
  neighbours: Record<string, string[]>;
};

const GROUP_ACCENT = "#c8a45c";

/** x position per layer. The network reads left to right, input to output. */
const LAYER_X: Record<NeuralLayer, number> = {
  area: -4.2,
  service: -1.4,
  division: 1.2,
  group: 3.4,
};

const LAYER_SIZE: Record<NeuralLayer, number> = {
  area: 0.13,
  service: 0.21,
  division: 0.32,
  group: 0.46,
};

/** Vertical extent a layer's nodes are spread over. */
const LAYER_SPREAD: Record<NeuralLayer, number> = {
  area: 6.4,
  service: 4.8,
  division: 2.6,
  group: 0,
};

/**
 * Fans `count` nodes evenly over the layer's spread, centred on zero. A layer
 * holding a single node (the group, and cleaning until division two lands)
 * sits dead centre rather than off at one end.
 */
function layerPosition(
  layer: NeuralLayer,
  index: number,
  count: number,
): [number, number, number] {
  const spread = LAYER_SPREAD[layer];
  const offset = count > 1 ? index / (count - 1) - 0.5 : 0;
  const y = offset * spread;
  // A shallow z wave stops each layer reading as a flat picket fence.
  const z = count > 1 ? Math.sin(offset * Math.PI * 2) * 0.75 : 0;
  return [LAYER_X[layer], y, z];
}

/** The cleaning division's accent, used by its services and their areas. */
const cleaningAccent =
  divisions.find((d) => d.slug === "cleaning")?.accent ?? GROUP_ACCENT;

export function buildNeuralGraph(): NeuralGraph {
  const nodes: NeuralNode[] = [];
  const edges: NeuralEdge[] = [];

  /* -- Coverage: every service area the cleaning division lists ------------ */
  const areas = cleaning.serviceAreas;
  areas.forEach((area, i) => {
    nodes.push({
      id: `area:${area}`,
      layer: "area",
      label: area,
      detail: neuralLink.layers.area.caption,
      body: neuralLink.areaBody(area),
      points: [],
      href: "/cleaning#areas",
      brand: "cleaning",
      accent: cleaningAccent,
      status: null,
      position: layerPosition("area", i, areas.length),
      size: LAYER_SIZE.area,
    });
  });

  /* -- Services: what the division actually does --------------------------- */
  const services = cleaning.services;
  services.forEach((service, i) => {
    nodes.push({
      id: `service:${service.slug}`,
      layer: "service",
      label: service.title,
      detail: neuralLink.layers.service.caption,
      body: service.blurb,
      points: service.points,
      href: "/cleaning#services",
      brand: "cleaning",
      accent: cleaningAccent,
      status: null,
      position: layerPosition("service", i, services.length),
      size: LAYER_SIZE.service,
    });
  });

  /* -- Divisions: the companies inside the group --------------------------- */
  divisions.forEach((division, i) => {
    nodes.push({
      id: `division:${division.slug}`,
      layer: "division",
      label: division.name,
      detail: division.discipline,
      body: division.summary,
      points: [],
      href: division.href,
      brand: division.brand,
      accent: division.accent,
      status: division.status,
      position: layerPosition("division", i, divisions.length),
      size: LAYER_SIZE.division,
    });
  });

  /* -- The group itself ---------------------------------------------------- */
  nodes.push({
    id: "group",
    layer: "group",
    label: group.name,
    detail: group.tagline,
    body: group.mission,
    points: group.principles.map((p) => p.title),
    href: "/",
    brand: "group",
    accent: GROUP_ACCENT,
    status: null,
    position: layerPosition("group", 0, 1),
    size: LAYER_SIZE.group,
  });

  /* -- Edges --------------------------------------------------------------- */

  // Every service is offered in every area, so this layer is fully connected —
  // that density is the point, it is what makes the thing read as a network.
  areas.forEach((area) => {
    services.forEach((service) => {
      edges.push({
        id: `area:${area}->service:${service.slug}`,
        from: `area:${area}`,
        to: `service:${service.slug}`,
      });
    });
  });

  // Services belong to the division that declares them.
  services.forEach((service) => {
    edges.push({
      id: `service:${service.slug}->division:cleaning`,
      from: `service:${service.slug}`,
      to: "division:cleaning",
    });
  });

  // Every division answers to the group.
  divisions.forEach((division) => {
    edges.push({
      id: `division:${division.slug}->group`,
      from: `division:${division.slug}`,
      to: "group",
    });
  });

  const neighbours: Record<string, string[]> = {};
  for (const node of nodes) neighbours[node.id] = [];
  for (const edge of edges) {
    neighbours[edge.from]?.push(edge.to);
    neighbours[edge.to]?.push(edge.from);
  }

  return { nodes, edges, neighbours };
}

/** Built once — the graph is pure and derived from static content. */
export const neuralGraph = buildNeuralGraph();

export const nodesById = new Map(neuralGraph.nodes.map((n) => [n.id, n]));

export const nodesByLayer = LAYER_ORDER.map((layer) => ({
  layer,
  ...neuralLink.layers[layer],
  nodes: neuralGraph.nodes.filter((n) => n.layer === layer),
}));

/** World-space bounds, so the scene and the SVG fallback frame it the same. */
export const graphBounds = neuralGraph.nodes.reduce(
  (acc, n) => ({
    minX: Math.min(acc.minX, n.position[0]),
    maxX: Math.max(acc.maxX, n.position[0]),
    minY: Math.min(acc.minY, n.position[1]),
    maxY: Math.max(acc.maxY, n.position[1]),
  }),
  { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity },
);
