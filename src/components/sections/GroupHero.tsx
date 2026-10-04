"use client";

import dynamic from "next/dynamic";
import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { ButtonLink, Arrow } from "@/components/ui/Button";
import { divisions, group } from "@/content/site";

// The 3D stack is client-only and heavy; keep it out of the server bundle
// and off the critical path entirely.
const Stage = dynamic(() => import("@/components/three/Stage"), { ssr: false });
const GroupCore = dynamic(() => import("@/components/three/GroupCore"), {
  ssr: false,
});

const WORDS_1 = group.hero.line1.split(" ");
const WORDS_2 = group.hero.line2.split(" ");

export default function GroupHero() {
  const reduced = useReducedMotion();

  const word = (w: string, i: number, offset = 0) => (
    <motion.span
      key={`${w}-${i}`}
      className="inline-block"
      initial={reduced ? false : { y: "110%", opacity: 0 }}
      animate={{ y: "0%", opacity: 1 }}
      transition={{
        duration: 1.1,
        delay: 0.25 + (i + offset) * 0.09,
        ease: [0.16, 1, 0.3, 1],
      }}
    >
      {w}&nbsp;
    </motion.span>
  );

  return (
    <section className="relative min-h-svh w-full overflow-hidden">
      {/* --- 3D layer ------------------------------------------------------ */}
      <Stage
        className="absolute inset-0"
        camera={{ position: [0, 0, 6.4], fov: 42 }}
        fallback={
          <div className="size-full bg-[radial-gradient(ellipse_at_50%_45%,color-mix(in_oklab,var(--color-accent)_16%,transparent),transparent_62%)]" />
        }
      >
        <GroupCore />
      </Stage>

      {/* Legibility scrims. The subject lives in the right-hand column on wide
          screens, so the copy side is darkened horizontally; on phones the
          subject sits high, so it's darkened vertically instead. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-20 hidden lg:block lg:bg-[linear-gradient(to_right,var(--color-ink)_0%,color-mix(in_oklab,var(--color-ink)_88%,transparent)_34%,color-mix(in_oklab,var(--color-ink)_35%,transparent)_58%,transparent_78%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-20 bg-[linear-gradient(to_bottom,color-mix(in_oklab,var(--color-ink)_45%,transparent)_0%,color-mix(in_oklab,var(--color-ink)_88%,transparent)_38%,var(--color-ink)_70%)] lg:hidden"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-20 bg-[radial-gradient(ellipse_at_60%_50%,transparent_35%,color-mix(in_oklab,var(--color-ink)_65%,transparent)_95%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-64 bg-linear-to-t from-ink to-transparent"
      />

      {/* --- Content ------------------------------------------------------- */}
      <div className="relative z-30 mx-auto flex min-h-svh max-w-7xl flex-col justify-center px-5 pb-24 pt-32 sm:px-8 lg:max-w-7xl">
        <motion.span
          initial={reduced ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.1 }}
          className="inline-flex w-fit items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-[11px] font-medium uppercase tracking-[0.24em] text-mist backdrop-blur-sm"
        >
          <span className="relative flex size-1.5">
            <span className="absolute inline-flex size-full animate-pulse-ring rounded-full bg-accent" />
            <span className="relative inline-flex size-1.5 rounded-full bg-accent" />
          </span>
          {group.eyebrow}
        </motion.span>

        <h1 className="mt-8 max-w-[15ch] font-display text-[clamp(2.5rem,7.5vw,6.25rem)] font-semibold leading-[0.94] tracking-[-0.045em]">
          <span className="block overflow-hidden">
            {WORDS_1.map((w, i) => word(w, i))}
          </span>
          <span className="block overflow-hidden text-gradient">
            {WORDS_2.map((w, i) => word(w, i, WORDS_1.length))}
          </span>
        </h1>

        <motion.p
          initial={reduced ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.75 }}
          className="mt-8 max-w-xl text-base leading-relaxed text-mist text-pretty sm:text-lg"
        >
          {group.hero.body}
        </motion.p>

        <motion.div
          initial={reduced ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.9 }}
          className="mt-10 flex flex-wrap items-center gap-3"
        >
          <ButtonLink href="/cleaning">
            Explore Don &amp; Silva Cleaning
            <Arrow />
          </ButtonLink>
          <ButtonLink href="/#divisions" variant="outline">
            See the group
          </ButtonLink>
        </motion.div>

        {/* Division ticker — the group's shape, stated up front */}
        <motion.div
          initial={reduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.2, delay: 1.15 }}
          className="mt-16 flex flex-wrap items-center gap-x-7 gap-y-3 border-t border-white/8 pt-7"
        >
          {divisions.map((d) => {
            const label = (
              <span className="flex items-center gap-2.5">
                <span
                  className="size-1.5 rounded-full"
                  style={{
                    backgroundColor: d.accent,
                    opacity: d.status === "operating" ? 1 : 0.35,
                  }}
                  aria-hidden
                />
                <span
                  className={
                    d.status === "operating"
                      ? "text-bone"
                      : "text-mist/45"
                  }
                >
                  {d.shortName}
                </span>
                {d.status !== "operating" ? (
                  <span className="text-[9px] uppercase tracking-[0.18em] text-mist/40">
                    Soon
                  </span>
                ) : null}
              </span>
            );

            return d.href ? (
              <Link
                key={d.slug}
                href={d.href}
                className="text-sm transition-opacity hover:opacity-70"
              >
                {label}
              </Link>
            ) : (
              <span key={d.slug} className="text-sm">
                {label}
              </span>
            );
          })}
        </motion.div>
      </div>

      {/* Scroll cue */}
      <motion.div
        initial={reduced ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 1 }}
        className="pointer-events-none absolute bottom-7 left-1/2 z-30 hidden -translate-x-1/2 flex-col items-center gap-2.5 lg:flex"
      >
        <span className="text-[10px] uppercase tracking-[0.3em] text-mist/60">
          Scroll
        </span>
        <span className="relative h-10 w-px overflow-hidden bg-white/12">
          <motion.span
            className="absolute inset-x-0 top-0 h-4 bg-accent"
            animate={reduced ? {} : { y: ["-100%", "250%"] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
        </span>
      </motion.div>
    </section>
  );
}
