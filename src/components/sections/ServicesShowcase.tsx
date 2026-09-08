"use client";

import dynamic from "next/dynamic";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import SectionHeading from "@/components/ui/SectionHeading";
import { cleaning } from "@/content/site";
import { cn, spellCount } from "@/lib/utils";

const Stage = dynamic(() => import("@/components/three/Stage"), { ssr: false });
const ServiceOrbit = dynamic(
  () => import("@/components/three/ServiceOrbit"),
  { ssr: false },
);

const services = cleaning.services;

export default function ServicesShowcase() {
  const [active, setActive] = useState(0);
  const reduced = useReducedMotion();
  const current = services[active];

  return (
    <section
      id="services"
      className="relative mx-auto max-w-7xl scroll-mt-24 px-5 py-28 sm:px-8 lg:py-40"
    >
      <SectionHeading
        eyebrow="What we clean"
        title={
          <>
            <span className="capitalize">{spellCount(services.length)}</span>{" "}
            services.{" "}
            <span className="text-mist">One standard across all of them.</span>
          </>
        }
        body="Contract or one-off, commercial or domestic — every job is scoped in writing and finished against a checklist."
      />

      <div className="mt-16 grid gap-12 lg:grid-cols-[1fr_0.85fr] lg:gap-16">
        {/* --- The list -------------------------------------------------- */}
        <ul className="flex flex-col">
          {services.map((service, i) => {
            const isActive = i === active;
            return (
              <li key={service.slug}>
                <button
                  type="button"
                  onClick={() => setActive(i)}
                  onMouseEnter={() => setActive(i)}
                  onFocus={() => setActive(i)}
                  aria-expanded={isActive}
                  className={cn(
                    "group w-full border-t border-white/8 py-7 text-left transition-colors duration-500",
                    i === services.length - 1 && "border-b",
                  )}
                >
                  <div className="flex items-baseline gap-5">
                    <span
                      className={cn(
                        "font-display text-xs tabular-nums transition-colors duration-500",
                        isActive ? "text-accent" : "text-mist/40",
                      )}
                    >
                      0{i + 1}
                    </span>

                    <div className="flex-1">
                      <h3
                        className={cn(
                          "font-display text-2xl font-medium tracking-tight transition-all duration-500 ease-[var(--ease-out-expo)] sm:text-3xl",
                          isActive
                            ? "translate-x-1 text-bone"
                            : "text-mist/55 group-hover:text-mist",
                        )}
                      >
                        {service.title}
                      </h3>

                      <AnimatePresence initial={false}>
                        {isActive ? (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{
                              duration: 0.5,
                              ease: [0.16, 1, 0.3, 1],
                            }}
                            className="overflow-hidden"
                          >
                            <p className="max-w-lg pt-3.5 text-sm leading-relaxed text-mist">
                              {service.blurb}
                            </p>
                            <ul className="grid gap-2 pt-5 sm:grid-cols-2">
                              {service.points.map((point) => (
                                <li
                                  key={point}
                                  className="flex items-start gap-2.5 text-[13px] text-mist"
                                >
                                  <span
                                    aria-hidden
                                    className="mt-1.5 size-1 shrink-0 rounded-full bg-accent"
                                  />
                                  {point}
                                </li>
                              ))}
                            </ul>
                          </motion.div>
                        ) : null}
                      </AnimatePresence>
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>

        {/* --- The object ------------------------------------------------ */}
        <div className="relative hidden lg:block">
          <div className="sticky top-28">
            <div className="grain relative aspect-square overflow-hidden rounded-card border border-white/8 bg-elevated/25">
              <Stage
                className="absolute inset-0"
                camera={{ position: [0, 0, 4.6], fov: 45 }}
              >
                <ServiceOrbit shape={current.shape} />
              </Stage>

              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 z-20 bg-[radial-gradient(ellipse_at_50%_50%,transparent_40%,color-mix(in_oklab,var(--color-ink)_75%,transparent)_100%)]"
              />

              {/* Caption tracks the active service */}
              <div className="absolute inset-x-0 bottom-0 z-30 p-8">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={current.slug}
                    initial={reduced ? false : { opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduced ? undefined : { opacity: 0, y: -10 }}
                    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <span className="text-[10px] uppercase tracking-[0.24em] text-accent">
                      Service 0{active + 1}
                    </span>
                    <p className="mt-2 font-display text-xl font-medium tracking-tight">
                      {current.title}
                    </p>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
