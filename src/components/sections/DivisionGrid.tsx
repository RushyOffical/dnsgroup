"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import TiltCard from "@/components/ui/TiltCard";
import SectionHeading from "@/components/ui/SectionHeading";
import { Arrow } from "@/components/ui/Button";
import { divisions, type Division } from "@/content/site";
import { cn } from "@/lib/utils";

function Card({
  division,
  index,
  compact = false,
}: {
  division: Division;
  index: number;
  compact?: boolean;
}) {
  const reduced = useReducedMotion();
  const live = division.status === "operating";

  const body = (
    <TiltCard
      intensity={live ? 7 : 3}
      className={cn(
        "h-full rounded-card",
        live ? "cursor-pointer" : "cursor-default",
      )}
    >
      <div
        className={cn(
          "grain relative flex h-full flex-col overflow-hidden rounded-card border transition-all duration-700 ease-[var(--ease-out-expo)]",
          compact ? "p-7" : "p-8 sm:p-10",
          live
            ? "border-white/10 bg-elevated/40 hover:border-white/20"
            : "border-white/6 bg-elevated/15",
        )}
        style={
          {
            "--color-accent": division.accent,
          } as React.CSSProperties
        }
      >
        {/* Accent wash, keyed to the division's own colour */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 size-64 rounded-full blur-3xl transition-opacity duration-700"
          style={{
            background: division.accent,
            opacity: live ? 0.14 : 0.05,
          }}
        />

        <div className="relative flex items-start justify-between gap-6">
          <div>
            <span
              className="text-[10px] font-medium uppercase tracking-[0.24em]"
              style={{ color: division.accent, opacity: live ? 1 : 0.5 }}
            >
              {division.discipline}
            </span>
            <h3
              className={cn(
                "mt-4 font-display font-semibold tracking-tight",
                compact ? "text-xl" : "text-2xl sm:text-3xl",
                live ? "text-bone" : "text-mist/60",
              )}
            >
              {division.name}
            </h3>
          </div>

          {compact ? null : (
            <span
              className={cn(
                "shrink-0 rounded-full border px-3 py-1.5 text-[10px] uppercase tracking-[0.16em]",
                live
                  ? "border-white/15 text-bone"
                  : "border-white/8 text-mist/45",
              )}
            >
              {live ? "Now taking bookings" : "In development"}
            </span>
          )}
        </div>

        <p
          className={cn(
            "relative mt-5 flex-1 text-sm leading-relaxed",
            live ? "text-mist" : "text-mist/50",
          )}
        >
          {division.summary}
        </p>

        <div className="relative mt-8 flex items-center gap-2 text-sm font-medium">
          {live ? (
            <span
              className="group/btn inline-flex items-center gap-2"
              style={{ color: division.accent }}
            >
              Visit {division.shortName}
              <Arrow />
            </span>
          ) : (
            <span className="text-mist/40">Announcement to follow</span>
          )}
        </div>
      </div>
    </TiltCard>
  );

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 34 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.9, delay: index * 0.09, ease: [0.16, 1, 0.3, 1] }}
      className="h-full"
    >
      {division.href ? (
        <Link href={division.href} className="block h-full">
          {body}
        </Link>
      ) : (
        body
      )}
    </motion.div>
  );
}

export default function DivisionGrid() {
  const operating = divisions.filter((d) => d.status === "operating");
  const planned = divisions.filter((d) => d.status !== "operating");

  return (
    <section
      id="divisions"
      className="relative mx-auto max-w-7xl scroll-mt-24 px-5 py-28 sm:px-8 lg:py-40"
    >
      <SectionHeading
        eyebrow="The group"
        title={
          <>
            One parent company.{" "}
            <span className="text-mist">Specialist divisions beneath it.</span>
          </>
        }
        body="Cleaning is where the group starts. Further divisions will be added only once they can be held to the same standard — and will be announced when they are."
      />

      {/* Operating companies lead. With one division this is a single wide
          card; a second one splits the row without any layout change. */}
      <div
        className={cn(
          "mt-16 grid gap-5",
          operating.length > 1 && "lg:grid-cols-2",
        )}
      >
        {operating.map((division, i) => (
          <Card key={division.slug} division={division} index={i} />
        ))}
      </div>

      {planned.length ? (
        <>
          <div className="mt-16 flex items-center gap-5">
            <span className="text-[11px] uppercase tracking-[0.24em] text-mist/60">
              In development
            </span>
            <span className="h-px flex-1 bg-white/8" aria-hidden />
          </div>

          <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {planned.map((division, i) => (
              <Card key={division.slug} division={division} index={i} compact />
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}
