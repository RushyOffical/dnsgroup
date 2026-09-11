"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import NeuralDiagram from "./NeuralDiagram";
import { ButtonLink, Arrow } from "@/components/ui/Button";
import { neuralLink } from "@/content/site";
import { nodesByLayer, nodesById, neuralGraph } from "@/lib/neural";
import { scrollToElement } from "@/lib/smooth-scroll";
import { cn } from "@/lib/utils";

// The 3D stack is client-only and heavy; keep it out of the server bundle.
const Stage = dynamic(() => import("@/components/three/Stage"), { ssr: false });
const NeuralField = dynamic(
  () => import("@/components/three/NeuralField"),
  { ssr: false },
);

/* -------------------------------------------------------------------------- */

/** One entry in the index rail. Doubles as the keyboard route into the graph. */
function IndexButton({
  id,
  label,
  accent,
  selected,
  onSelect,
  onHover,
}: {
  id: string;
  label: string;
  accent: string;
  selected: boolean;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={() => onSelect(id)}
      onPointerEnter={() => onHover(id)}
      onPointerLeave={() => onHover(null)}
      onFocus={() => onHover(id)}
      onBlur={() => onHover(null)}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] leading-snug transition-colors duration-300",
        selected
          ? "bg-accent/10 text-bone"
          : "text-mist hover:bg-white/4 hover:text-bone",
      )}
    >
      <span
        aria-hidden
        className="size-1.5 shrink-0 rounded-full transition-opacity duration-300"
        style={{ backgroundColor: accent, opacity: selected ? 1 : 0.45 }}
      />
      <span className="min-w-0 flex-1 truncate">{label}</span>
    </button>
  );
}

/* -------------------------------------------------------------------------- */

export default function NeuralConsole() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const reduced = useReducedMotion();

  const selected = selectedId ? (nodesById.get(selectedId) ?? null) : null;

  // The console wears the brand of whatever is selected, so picking a cleaning
  // node retints every accent on the page through the existing [data-brand]
  // blocks rather than through a second set of colours.
  const brand = selected?.brand ?? "group";

  const connections = useMemo(() => {
    if (!selectedId) return [];
    return (neuralGraph.neighbours[selectedId] ?? [])
      .map((id) => nodesById.get(id))
      .filter((n): n is NonNullable<typeof n> => Boolean(n));
  }, [selectedId]);

  const select = useCallback((id: string | null) => setSelectedId(id), []);

  const panel = useRef<HTMLElement>(null);

  // Stacked layouts run network, then detail, then index — so a pick from the
  // index leaves the answer off-screen above you. Bring the panel back when
  // its top has gone past the top of the viewport, which is that case and not
  // a tap on the network, where the panel is already waiting just below.
  useEffect(() => {
    if (!selectedId) return;
    const node = panel.current;
    if (!node || node.getBoundingClientRect().top >= 0) return;
    scrollToElement(node);
  }, [selectedId]);

  // Pointer feedback for the 3D nodes, which cannot set a cursor themselves.
  useEffect(() => {
    if (!hoveredId) return;
    document.body.style.cursor = "pointer";
    return () => {
      document.body.style.cursor = "";
    };
  }, [hoveredId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div
      data-brand={brand}
      className="flex flex-col transition-colors duration-700 lg:h-[100svh] lg:overflow-hidden"
    >
      <main
        id="main"
        className={cn(
          "flex flex-1 flex-col gap-8 px-5 pt-28 pb-20 sm:px-8",
          "lg:grid lg:min-h-0 lg:grid-cols-[minmax(0,15rem)_minmax(0,1fr)_minmax(0,23rem)] lg:gap-6 lg:pt-26 lg:pb-6",
        )}
      >
        {/* --- Index rail ------------------------------------------------- */}
        <aside
          aria-label={neuralLink.indexLabel}
          className="order-3 lg:order-1 lg:min-h-0 lg:overflow-y-auto lg:pr-1"
        >
          <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-mist">
            {neuralLink.indexLabel}
          </p>

          <div className="mt-5 grid gap-7 sm:grid-cols-2 lg:grid-cols-1">
            {nodesByLayer.map((layer) => (
              <div key={layer.layer}>
                <div className="flex items-baseline justify-between gap-3 px-2.5">
                  <h2 className="font-display text-sm font-medium tracking-tight text-bone">
                    {layer.label}
                  </h2>
                  <span className="text-[11px] tabular-nums text-mist/60">
                    {layer.nodes.length}
                  </span>
                </div>
                <p className="mt-1 px-2.5 text-[11px] leading-relaxed text-mist/70">
                  {layer.caption}
                </p>

                <div className="mt-2 flex flex-col gap-0.5">
                  {layer.nodes.map((node) => (
                    <IndexButton
                      key={node.id}
                      id={node.id}
                      label={node.label}
                      accent={node.accent}
                      selected={node.id === selectedId}
                      onSelect={select}
                      onHover={setHoveredId}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* --- The network ------------------------------------------------ */}
        <section
          aria-label={neuralLink.name}
          className="order-1 flex flex-col lg:order-2 lg:min-h-0"
        >
          <div className="shrink-0">
            <span className="inline-flex items-center gap-2.5 text-[11px] font-medium uppercase tracking-[0.28em] text-accent">
              <span className="h-px w-8 bg-accent/50" aria-hidden />
              {neuralLink.eyebrow}
            </span>
            <h1 className="mt-4 font-display text-3xl font-semibold leading-[1.06] tracking-[-0.03em] text-balance sm:text-4xl">
              {neuralLink.title}{" "}
              <span className="text-gradient">{neuralLink.titleAccent}</span>
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-mist text-pretty">
              {neuralLink.body}
            </p>
          </div>

          <div className="relative mt-6 h-[50svh] min-h-[20rem] shrink-0 lg:h-auto lg:min-h-0 lg:flex-1">
            <Stage
              className="absolute inset-0"
              camera={{ position: [0, 0, 11.5], fov: 40 }}
              fallback={
                <div className="grid size-full place-items-center opacity-40">
                  <NeuralDiagram />
                </div>
              }
              // The fallback draws the same network, so it has to clear once
              // the scene is live or it ghosts through as a second copy.
              fallbackMode="until-ready"
              onPointerMissed={() => setSelectedId(null)}
            >
              <NeuralField
                selectedId={selectedId}
                hoveredId={hoveredId}
                onHover={setHoveredId}
                onSelect={select}
              />
            </Stage>

            {/* Sits above the canvas, but must never eat a click meant for a node. */}
            <p className="pointer-events-none absolute inset-x-0 bottom-0 z-20 px-2 text-center text-[11px] text-mist/60">
              {neuralLink.hint}
            </p>
          </div>
        </section>

        {/* --- Detail panel ----------------------------------------------- */}
        <aside
          ref={panel}
          aria-live="polite"
          className="order-2 scroll-mt-24 lg:order-3 lg:min-h-0 lg:overflow-y-auto"
        >
          <div className="glass rounded-card p-6">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={selected?.id ?? "empty"}
                initial={reduced ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduced ? undefined : { opacity: 0, y: -6 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              >
                {selected ? (
                  <>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-medium uppercase tracking-[0.24em] text-accent">
                        {neuralLink.layers[selected.layer].label}
                      </span>
                      {selected.status ? (
                        <span className="rounded-full border border-white/12 px-2.5 py-0.5 text-[10px] uppercase tracking-[0.14em] text-mist">
                          {neuralLink.statusLabels[selected.status]}
                        </span>
                      ) : null}
                    </div>

                    <h2 className="mt-3 font-display text-2xl font-semibold leading-tight tracking-[-0.02em] text-balance">
                      {selected.label}
                    </h2>
                    <p className="mt-1.5 text-[13px] text-mist">
                      {selected.detail}
                    </p>

                    <p className="mt-5 text-sm leading-relaxed text-bone/90 text-pretty">
                      {selected.body}
                    </p>

                    {selected.points.length > 0 ? (
                      <div className="mt-6">
                        <p className="text-[10px] font-medium uppercase tracking-[0.24em] text-mist">
                          {neuralLink.detailsLabel}
                        </p>
                        <ul className="mt-3 flex flex-col gap-2">
                          {selected.points.map((point) => (
                            <li
                              key={point}
                              className="flex gap-2.5 text-[13px] leading-relaxed text-mist"
                            >
                              <span
                                aria-hidden
                                className="mt-2 size-1 shrink-0 rounded-full bg-accent"
                              />
                              {point}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    {connections.length > 0 ? (
                      <div className="mt-6">
                        <p className="text-[10px] font-medium uppercase tracking-[0.24em] text-mist">
                          {neuralLink.connectionsLabel}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {connections.map((node) => (
                            <button
                              key={node.id}
                              type="button"
                              onClick={() => select(node.id)}
                              onPointerEnter={() => setHoveredId(node.id)}
                              onPointerLeave={() => setHoveredId(null)}
                              className="rounded-full border border-white/10 px-3 py-1.5 text-[12px] text-mist transition-colors duration-300 hover:border-accent/40 hover:text-bone"
                            >
                              {node.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    <div className="mt-7 flex flex-wrap items-center gap-3">
                      {selected.href ? (
                        <Link
                          href={selected.href}
                          className="inline-flex items-center gap-1.5 text-[13px] text-accent transition-colors hover:text-accent-soft"
                        >
                          {neuralLink.viewLabel}
                          <span aria-hidden>&rarr;</span>
                        </Link>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => setSelectedId(null)}
                        className="text-[13px] text-mist transition-colors hover:text-bone"
                      >
                        {neuralLink.clearLabel}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <span className="text-[10px] font-medium uppercase tracking-[0.24em] text-mist">
                      {neuralLink.emptyTitle}
                    </span>
                    <p className="mt-4 text-sm leading-relaxed text-mist text-pretty">
                      {neuralLink.emptyBody}
                    </p>
                  </>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="mt-4 rounded-card border border-white/8 p-6">
            <h2 className="font-display text-base font-medium tracking-tight">
              {neuralLink.cta.title}
            </h2>
            <p className="mt-2 text-[13px] leading-relaxed text-mist text-pretty">
              {neuralLink.cta.body}
            </p>
            <ButtonLink
              href={neuralLink.cta.href}
              className="mt-5 w-full px-5 py-3 text-[13px]"
            >
              {neuralLink.cta.label}
              <Arrow />
            </ButtonLink>
          </div>
        </aside>
      </main>
    </div>
  );
}
