"use client";

import { motion, useReducedMotion } from "motion/react";
import { group } from "@/content/site";

export default function StatsBand() {
  const reduced = useReducedMotion();

  return (
    <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
      <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
        {group.stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={reduced ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: i * 0.08 }}
            className="flex flex-col gap-2"
          >
            <span className="font-display text-5xl font-semibold tracking-tight text-gradient lg:text-6xl">
              {stat.value}
              {stat.suffix}
            </span>
            <span className="text-sm text-mist">{stat.label}</span>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
