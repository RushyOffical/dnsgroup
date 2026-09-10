import Reveal from "@/components/ui/Reveal";
import { cleaning } from "@/content/site";

export default function Assurances() {
  return (
    <section className="mx-auto max-w-7xl px-5 py-24 sm:px-8">
      <div className="grid gap-px overflow-hidden rounded-card border border-white/8 bg-white/8 sm:grid-cols-2 lg:grid-cols-4">
        {cleaning.assurances.map((item, i) => (
          <Reveal key={item.title} delay={i * 0.07}>
            <div className="group h-full bg-ink p-8 transition-colors duration-500 hover:bg-elevated/50">
              <span
                aria-hidden
                className="block h-px w-8 bg-accent transition-all duration-700 ease-[var(--ease-out-expo)] group-hover:w-16"
              />
              <h3 className="mt-6 font-display text-lg font-semibold tracking-tight">
                {item.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-mist">
                {item.body}
              </p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
