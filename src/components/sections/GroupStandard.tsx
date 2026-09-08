"use client";

import dynamic from "next/dynamic";
import { motion, useReducedMotion } from "motion/react";
import SectionHeading from "@/components/ui/SectionHeading";
import { divisions, group } from "@/content/site";
import { spellCount } from "@/lib/utils";

const Stage = dynamic(() => import("@/components/three/Stage"), { ssr: false });
const Lattice = dynamic(() => import("@/components/three/Lattice"), {
  ssr: false,
});

export default function GroupStandard() {
  const reduced = useReducedMotion();

  return (
    <section
      id="standard"
      className="relative scroll-mt-24 overflow-hidden border-y border-white/8 bg-void py-28 lg:py-40"
    >
      {/* Wave lattice sits behind the copy — cheap enough to run full width */}
      <Stage
        className="absolute inset-0 opacity-70"
        camera={{ position: [0, 3.2, 9], fov: 45 }}
      >
        <Lattice color="#c8a45c" />
      </Stage>

      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-20 bg-[radial-gradient(ellipse_at_50%_40%,transparent_20%,var(--color-void)_80%)]"
      />

      <div className="relative z-30 mx-auto max-w-7xl px-5 sm:px-8">
        <SectionHeading
          eyebrow="Our standard"
          title={
            <>
              The reason to put {spellCount(divisions.length)} companies{" "}
              <span className="text-gradient">under one name.</span>
            </>
          }
          body={group.mission}
        />

        <div className="mt-16 grid gap-px overflow-hidden rounded-card border border-white/8 bg-white/8 sm:grid-cols-2">
          {group.principles.map((principle, i) => (
            <motion.div
              key={principle.title}
              initial={reduced ? false : { opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{
                duration: 0.8,
                delay: i * 0.08,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="group relative bg-ink/80 p-8 backdrop-blur-sm transition-colors duration-500 hover:bg-elevated/60 sm:p-10"
            >
              <span className="font-display text-xs font-medium tabular-nums text-accent/60">
                0{i + 1}
              </span>
              <h3 className="mt-5 font-display text-xl font-semibold tracking-tight sm:text-2xl">
                {principle.title}
              </h3>
              <p className="mt-3.5 text-sm leading-relaxed text-mist">
                {principle.body}
              </p>
              {/* Accent rule that draws in on hover */}
              <span
                aria-hidden
                className="absolute bottom-0 left-0 h-px w-0 bg-accent transition-all duration-700 ease-[var(--ease-out-expo)] group-hover:w-full"
              />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
