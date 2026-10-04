"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { ButtonLink, Arrow } from "@/components/ui/Button";
import { cleaning, group } from "@/content/site";

const Stage = dynamic(() => import("@/components/three/Stage"), { ssr: false });
const CleaningField = dynamic(
  () => import("@/components/three/CleaningField"),
  { ssr: false },
);

const WORDS_1 = cleaning.hero.line1.split(" ");
const WORDS_2 = cleaning.hero.line2.split(" ");

export default function CleaningHero() {
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
      <Stage
        className="absolute inset-0"
        camera={{ position: [0, 0, 6.2], fov: 42 }}
        fallback={
          <div className="size-full bg-[radial-gradient(ellipse_at_50%_45%,color-mix(in_oklab,var(--color-accent)_18%,transparent),transparent_62%)]" />
        }
      >
        <CleaningField />
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

      <div className="relative z-30 mx-auto flex min-h-svh max-w-7xl flex-col justify-center px-5 pb-24 pt-32 sm:px-8 lg:max-w-7xl">
        {/* Parent attribution sits above the division name, not below it —
            the group is the thing being built, the division is the offer. */}
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.1 }}
        >
          <Link
            href="/"
            className="inline-flex w-fit items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-[11px] font-medium uppercase tracking-[0.24em] text-mist backdrop-blur-sm transition-colors hover:border-accent/40 hover:text-bone"
          >
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex size-full animate-pulse-ring rounded-full bg-accent" />
              <span className="relative inline-flex size-1.5 rounded-full bg-accent" />
            </span>
            A {group.name} company
          </Link>
        </motion.div>

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
          {cleaning.hero.body}
        </motion.p>

        <motion.div
          initial={reduced ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.9 }}
          className="mt-10 flex flex-wrap items-center gap-3"
        >
          <ButtonLink href="/contact">
            Get a free quote
            <Arrow />
          </ButtonLink>
          <ButtonLink href="/cleaning#services" variant="outline">
            What we clean
          </ButtonLink>
        </motion.div>

        {/* The guarantee, stated in the hero rather than buried */}
        <motion.p
          initial={reduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.2, delay: 1.15 }}
          className="mt-16 max-w-md border-t border-white/8 pt-7 text-sm leading-relaxed text-mist"
        >
          <span className="font-medium text-accent">Our promise · </span>
          {cleaning.promise}
        </motion.p>
      </div>
    </section>
  );
}
