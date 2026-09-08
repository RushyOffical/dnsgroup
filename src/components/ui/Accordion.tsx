"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { cn } from "@/lib/utils";

type Item = { q: string; a: string };

export default function Accordion({
  items,
  className,
}: {
  items: readonly Item[];
  className?: string;
}) {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className={cn("divide-y divide-white/8 border-y border-white/8", className)}>
      {items.map((item, i) => {
        const expanded = open === i;
        return (
          <div key={item.q}>
            <h3>
              <button
                type="button"
                onClick={() => setOpen(expanded ? null : i)}
                aria-expanded={expanded}
                className="group flex w-full items-center justify-between gap-6 py-6 text-left transition-colors hover:text-accent"
              >
                <span className="font-display text-lg font-medium tracking-tight sm:text-xl">
                  {item.q}
                </span>
                <span
                  aria-hidden
                  className={cn(
                    "relative grid size-9 shrink-0 place-items-center rounded-full border border-white/12 transition-all duration-500 ease-[var(--ease-out-expo)]",
                    expanded
                      ? "rotate-45 border-accent/60 bg-accent/10"
                      : "group-hover:border-accent/40",
                  )}
                >
                  <span className="absolute h-px w-3.5 bg-current" />
                  <span className="absolute h-3.5 w-px bg-current" />
                </span>
              </button>
            </h3>

            <AnimatePresence initial={false}>
              {expanded ? (
                <motion.div
                  key="panel"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden"
                >
                  <p className="max-w-2xl pb-7 pr-12 leading-relaxed text-mist">
                    {item.a}
                  </p>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
