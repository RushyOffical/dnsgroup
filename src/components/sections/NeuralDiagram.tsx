import { graphBounds, neuralGraph, nodesById } from "@/lib/neural";

/**
 * A flat projection of the same graph the 3D scene draws.
 *
 * This is what sits behind the canvas: it is what you see while WebGL boots,
 * and the whole picture if WebGL never arrives. Same nodes, same edges, same
 * source data — just dropped to two dimensions.
 */
export default function NeuralDiagram() {
  const pad = 0.9;
  const minX = graphBounds.minX - pad;
  const minY = graphBounds.minY - pad;
  const width = graphBounds.maxX - graphBounds.minX + pad * 2;
  const height = graphBounds.maxY - graphBounds.minY + pad * 2;

  // SVG y grows downward; the graph's does not.
  const flip = (y: number) => graphBounds.maxY + graphBounds.minY - y;

  return (
    <svg
      viewBox={`${minX} ${minY} ${width} ${height}`}
      className="size-full"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden
    >
      <g stroke="var(--color-mist)" strokeWidth="0.012" opacity="0.28">
        {neuralGraph.edges.map((edge) => {
          const a = nodesById.get(edge.from);
          const b = nodesById.get(edge.to);
          if (!a || !b) return null;
          return (
            <line
              key={edge.id}
              x1={a.position[0]}
              y1={flip(a.position[1])}
              x2={b.position[0]}
              y2={flip(b.position[1])}
            />
          );
        })}
      </g>

      {neuralGraph.nodes.map((node) => (
        <circle
          key={node.id}
          cx={node.position[0]}
          cy={flip(node.position[1])}
          r={node.size}
          fill={node.accent}
          opacity="0.85"
        />
      ))}
    </svg>
  );
}
