"use client";

import dynamic from "next/dynamic";
import {
  motion,
  useMotionTemplate,
  useMotionValueEvent,
  useScroll,
  useTransform,
  type MotionValue,
} from "motion/react";
import { useRef, useState, type ReactNode } from "react";
import { cleaning } from "@/content/site";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import {
  activeStage,
  copyStops,
  INTRO_OUT,
  WINDOWS,
} from "@/lib/clean-sequence";
import { cn } from "@/lib/utils";

const Stage = dynamic(() => import("@/components/three/Stage"), { ssr: false });
const OfficeClean = dynamic(() => import("@/components/three/OfficeClean"), {
  ssr: false,
});

const method = cleaning.method;

/**
 * One block of copy whose visibility is scrubbed by scroll rather than
 * triggered at a threshold — it arrives and leaves at exactly the pace the
 * visitor scrolls, and reverses cleanly when they scroll back.
 */
function Beat({
  progress,
  stops,
  reduced,
  children,
}: {
  progress: MotionValue<number>;
  /** [in start, fully in, out start, fully out]. `null` for "already in at
   *  the start" or "never leaves". Kept inside 0–1: scroll-linked animations
   *  are hardware accelerated and reject offsets outside the timeline. */
  stops: [number | null, number | null, number | null, number | null];
  reduced: boolean;
  children: ReactNode;
}) {
  const [inA, inB, outA, outB] = stops;
  const input: number[] = [];
  const shown: number[] = [];
  const offset: number[] = [];
  if (inA !== null && inB !== null) {
    input.push(inA, inB);
    shown.push(0, 1);
    offset.push(26, 0);
  }
  if (outA !== null && outB !== null) {
    input.push(outA, outB);
    shown.push(1, 0);
    offset.push(0, -26);
  }
  // Pin both ends of the timeline. Accelerated scroll animations fall back to
  // the element's base style outside the keyframes, which would bring a
  // faded block back at full opacity once the visitor scrolls past it.
  if (input[0] > 0) {
    input.unshift(0);
    shown.unshift(shown[0]);
    offset.unshift(offset[0]);
  }
  if (input[input.length - 1] < 1) {
    input.push(1);
    shown.push(shown[shown.length - 1]);
    offset.push(offset[offset.length - 1]);
  }
  const opacity = useTransform(progress, input, shown);
  const y = useTransform(progress, input, reduced ? offset.map(() => 0) : offset);
  const blurPx = useTransform(progress, input, reduced ? shown.map(() => 0) : shown.map((v) => (1 - v) * 6));
  const filter = useMotionTemplate`blur(${blurPx}px)`;

  return (
    <motion.div
      style={{ opacity, y, filter }}
      className="col-start-1 row-start-1 self-end will-change-transform lg:self-center"
    >
      {children}
    </motion.div>
  );
}

function RailSegment({
  progress,
  index,
  stage,
  label,
}: {
  progress: MotionValue<number>;
  index: number;
  stage: number;
  label: string;
}) {
  const [start, end] = WINDOWS[index];
  const fill = useTransform(progress, [0, start, end, 1], [0, 0, 1, 1]);
  return (
    <div className="flex flex-1 flex-col gap-2.5">
      <span className="relative h-px w-full overflow-hidden bg-white/15">
        <motion.span
          className="absolute inset-0 origin-left bg-accent"
          style={{ scaleX: fill }}
        />
      </span>
      <span
        className={cn(
          "text-[10px] uppercase tracking-[0.18em] transition-colors duration-700",
          index === stage ? "text-bone" : index < stage ? "text-mist" : "text-mist/40",
        )}
      >
        {label}
      </span>
    </div>
  );
}

export default function CleanSequence() {
  const container = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();

  /** Scroll position, held in a ref so the 3D scene reads it every frame
   *  without React re-rendering. */
  const progress = useRef(0);
  const [stage, setStage] = useState(0);

  const { scrollYProgress } = useScroll({
    target: container,
    offset: ["start start", "end end"],
  });

  /** 0 → 1 while the section scrolls up into view, before it pins. */
  const { scrollYProgress: arrival } = useScroll({
    target: container,
    offset: ["start end", "start start"],
  });
  const sceneOpacity = useTransform(arrival, [0.25, 0.95], [0, 1]);
  const sceneScale = useTransform(arrival, [0.25, 1], reduced ? [1, 1] : [1.06, 1]);
  const railOpacity = useTransform(
    scrollYProgress,
    [0, INTRO_OUT[0], INTRO_OUT[1] + 0.02, 1],
    [0, 0, 1, 1],
  );

  useMotionValueEvent(scrollYProgress, "change", (value) => {
    progress.current = value;
    // The only React state: which rail label is lit. Changes four times.
    const next = activeStage(value);
    setStage((prev) => (prev === next ? prev : next));
  });

  return (
    <section
      id="method"
      ref={container}
      className="relative scroll-mt-24"
      /* The scroll distance is the timeline: roughly a screen per pass plus
         room for the intro and the finished room to breathe. */
      style={{ height: "600vh" }}
    >
      <div className="sticky top-0 h-svh w-full overflow-hidden bg-ink">
        <motion.div
          className="absolute inset-0"
          style={{ opacity: sceneOpacity, scale: sceneScale }}
        >
          <Stage
            className="absolute inset-0"
            camera={{ position: [5.3, 2.45, 5.6], fov: 46 }}
            shadows
            fallback={
              <div className="size-full bg-[radial-gradient(ellipse_at_60%_50%,color-mix(in_oklab,var(--color-accent)_14%,transparent),transparent_65%)]" />
            }
          >
            <OfficeClean progress={progress} />
          </Stage>
        </motion.div>

        {/* Legibility: a column of ink behind the copy (left on desktop,
            bottom on mobile), plus soft top and bottom edges so the pinned
            scene melts into the sections either side instead of butting up
            against them. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-20 bg-[linear-gradient(to_bottom,transparent_0%,transparent_42%,color-mix(in_oklab,var(--color-ink)_88%,transparent)_70%,var(--color-ink)_100%)] lg:bg-[linear-gradient(to_right,var(--color-ink)_0%,color-mix(in_oklab,var(--color-ink)_92%,transparent)_24%,color-mix(in_oklab,var(--color-ink)_55%,transparent)_40%,transparent_58%)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 z-20 h-40 bg-gradient-to-b from-ink to-transparent"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-32 bg-gradient-to-t from-ink to-transparent"
        />

        <div className="relative z-30 mx-auto flex h-full max-w-7xl flex-col justify-end px-5 pb-14 pt-28 sm:px-8 sm:pb-16 lg:justify-center lg:pb-0">
          <div className="lg:max-w-[26rem] xl:max-w-md">
            {/* Every block shares one grid cell, so the column is as tall as
                its tallest block and nothing jumps as they hand over. */}
            <div className="grid">
              <Beat
                progress={scrollYProgress}
                stops={[null, null, INTRO_OUT[0], INTRO_OUT[1]]}
                reduced={reduced}
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
              </Beat>

              {method.steps.map((step, i) => (
                <Beat
                  key={step.key}
                  progress={scrollYProgress}
                  stops={copyStops(i)}
                  reduced={reduced}
                >
                  <span className="flex items-baseline gap-3 font-display text-xs font-medium tabular-nums text-accent">
                    {step.index}
                    <span className="text-mist/50">/ 0{method.steps.length}</span>
                    <span className="h-px w-6 self-center bg-accent/40" aria-hidden />
                    <span className="uppercase tracking-[0.2em]">{step.label}</span>
                  </span>
                  <h3 className="mt-4 font-display text-3xl font-semibold leading-[1.08] tracking-[-0.03em] sm:text-4xl">
                    {step.title}
                  </h3>
                  <p className="mt-4 max-w-md text-sm leading-relaxed text-mist sm:text-base">
                    {step.body}
                  </p>
                </Beat>
              ))}
            </div>

            <motion.div
              className="mt-10 flex items-start gap-3"
              style={{ opacity: railOpacity }}
            >
              {method.steps.map((step, i) => (
                <RailSegment
                  key={step.key}
                  progress={scrollYProgress}
                  index={i}
                  stage={stage}
                  label={step.label}
                />
              ))}
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
