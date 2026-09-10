"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";
import SectionHeading from "@/components/ui/SectionHeading";
import { cleaning } from "@/content/site";

export default function ProcessTimeline() {
  const container = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  // The spine fills as the section scrolls past — a progress read, not decoration.
  const { scrollYProgress } = useScroll({
    target: container,
    offset: ["start 70%", "end 60%"],
  });
  const height = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);

  return (
    <section
      id="process"
      className="relative scroll-mt-24 border-y border-white/8 bg-void py-28 lg:py-40"
    >
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <SectionHeading
          eyebrow="Getting started"
          title={
            <>
              From enquiry to{" "}
              <span className="text-mist">your first clean.</span>
            </>
          }
        />

        <div ref={container} className="relative mt-16 lg:mt-24">
          {/* Spine */}
          <div
            aria-hidden
            className="absolute left-[15px] top-2 hidden h-[calc(100%-2rem)] w-px bg-white/8 sm:block"
          >
            <motion.div
              className="w-full bg-accent"
              style={{ height: reduced ? "100%" : height }}
            />
          </div>

          <ol className="flex flex-col gap-14 sm:gap-16">
            {cleaning.process.map((step, i) => (
              <motion.li
                key={step.step}
                initial={reduced ? false : { opacity: 0, y: 26 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{
                  duration: 0.8,
                  delay: i * 0.06,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="relative grid gap-5 sm:grid-cols-[auto_1fr] sm:gap-10"
              >
                <span className="relative z-10 grid size-8 shrink-0 place-items-center rounded-full border border-white/12 bg-ink font-display text-[11px] font-medium tabular-nums text-accent">
                  {step.step}
                </span>

                <div className="grid gap-4 lg:grid-cols-[0.6fr_1fr] lg:gap-12">
                  <h3 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
                    {step.title}
                  </h3>
                  <p className="max-w-xl leading-relaxed text-mist">
                    {step.body}
                  </p>
                </div>
              </motion.li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
