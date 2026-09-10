"use client";

import dynamic from "next/dynamic";
import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
} from "motion/react";
import { useRef, useState } from "react";
import { cleaning } from "@/content/site";
import { activeStage, WINDOWS, clamp01 } from "@/lib/clean-sequence";
import { cn } from "@/lib/utils";

const Stage = dynamic(() => import("@/components/three/Stage"), { ssr: false });
const OfficeClean = dynamic(() => import("@/components/three/OfficeClean"), {
  ssr: false,
});

const method = cleaning.method;

export default function CleanSequence() {
  const container = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  /** Scroll position, held in a ref so the 3D scene reads it every frame
   *  without React re-rendering. */
  const progress = useRef(0);
  const [stage, setStage] = useState(0);
  const [bar, setBar] = useState(0);

  const { scrollYProgress } = useScroll({
    target: container,
    offset: ["start start", "end end"],
  });

  useMotionValueEvent(scrollYProgress, "change", (value) => {
    progress.current = value;
    // Only these two ever trigger a render, and only when they actually change.
    const next = activeStage(value);
    setStage((prev) => (prev === next ? prev : next));
    const pct = Math.round(clamp01(value) * 100);
    setBar((prev) => (prev === pct ? prev : pct));
  });

  const step = method.steps[stage];

  return (
    <section
      id="method"
      ref={container}
      className="relative scroll-mt-24"
      /* The scroll distance is the timeline. Four passes need room to breathe;
         much shorter and the camera moves feel rushed. */
      style={{ height: "460vh" }}
    >
      <div className="sticky top-0 h-svh w-full overflow-hidden bg-ink">
        <Stage
          className="absolute inset-0"
          camera={{ position: [7.4, 4.8, 8.8], fov: 38 }}
          fallback={
            <div className="size-full bg-[radial-gradient(ellipse_at_60%_50%,color-mix(in_oklab,var(--color-accent)_14%,transparent),transparent_65%)]" />
          }
        >
          <OfficeClean progress={progress} />
        </Stage>

        {/* Keeps the copy readable over whatever the camera is looking at */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-20 bg-[linear-gradient(to_bottom,color-mix(in_oklab,var(--color-ink)_70%,transparent)_0%,transparent_28%,transparent_55%,var(--color-ink)_100%)] lg:bg-[linear-gradient(to_right,var(--color-ink)_0%,var(--color-ink)_30%,color-mix(in_oklab,var(--color-ink)_78%,transparent)_46%,transparent_68%)]"
        />

        <div className="relative z-30 mx-auto flex h-full max-w-7xl flex-col justify-between px-5 py-24 sm:px-8 lg:justify-center">
          {/* --- Heading, only while the sequence is starting -------------- */}
          <AnimatePresence>
            {stage === 0 && bar < 12 ? (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="absolute inset-x-5 top-28 sm:inset-x-8 lg:max-w-lg"
              >
                <span className="inline-flex items-center gap-2.5 text-[11px] font-medium uppercase tracking-[0.28em] text-accent">
                  <span className="h-px w-8 bg-accent/50" aria-hidden />
                  {method.eyebrow}
                </span>
                <h2 className="mt-5 font-display text-4xl font-semibold leading-[1.05] tracking-[-0.03em] sm:text-5xl">
                  {method.title}{" "}
                  <span className="text-gradient">{method.titleAccent}</span>
                </h2>
                <p className="mt-5 max-w-md text-sm leading-relaxed text-mist sm:text-base">
                  {method.body}
                </p>
              </motion.div>
            ) : null}
          </AnimatePresence>

          {/* --- The active pass ------------------------------------------- */}
          <div className="mt-auto lg:mt-0 lg:max-w-sm xl:max-w-md">
            <AnimatePresence mode="wait">
              <motion.div
                key={step.key}
                initial={reduced ? false : { opacity: 0, y: 22, filter: "blur(5px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={reduced ? undefined : { opacity: 0, y: -18, filter: "blur(5px)" }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              >
                <span className="font-display text-xs font-medium tabular-nums text-accent">
                  {step.index} — {step.label}
                </span>
                <h3 className="mt-3 font-display text-3xl font-semibold leading-[1.08] tracking-[-0.03em] sm:text-4xl">
                  {step.title}
                </h3>
                <p className="mt-4 max-w-md text-sm leading-relaxed text-mist sm:text-base">
                  {step.body}
                </p>
              </motion.div>
            </AnimatePresence>

            {/* --- Rail ---------------------------------------------------- */}
            <div className="mt-10 flex items-center gap-2.5">
              {method.steps.map((s, i) => {
                const [start, end] = WINDOWS[i];
                // Derived from state, never from the ref — reading a ref
                // during render is not safe.
                const local = clamp01((bar / 100 - start) / (end - start));
                const done = i < stage;
                const current = i === stage;
                return (
                  <div key={s.key} className="flex flex-1 flex-col gap-2">
                    <span className="relative h-0.5 w-full overflow-hidden rounded-full bg-white/12">
                      <motion.span
                        className="absolute inset-y-0 left-0 bg-accent"
                        initial={false}
                        animate={{
                          width: done ? "100%" : current ? `${local * 100}%` : "0%",
                        }}
                        transition={{ duration: 0.25, ease: "linear" }}
                      />
                    </span>
                    <span
                      className={cn(
                        "text-[10px] uppercase tracking-[0.16em] transition-colors duration-500",
                        current ? "text-bone" : done ? "text-mist" : "text-mist/40",
                      )}
                    >
                      {s.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
