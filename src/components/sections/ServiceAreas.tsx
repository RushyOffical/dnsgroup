import SectionHeading from "@/components/ui/SectionHeading";
import Reveal from "@/components/ui/Reveal";
import { cleaning, contact } from "@/content/site";

export default function ServiceAreas() {
  return (
    <section
      id="areas"
      className="relative mx-auto max-w-7xl scroll-mt-24 px-5 py-28 sm:px-8 lg:py-36"
    >
      <div className="grid gap-14 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
        <SectionHeading
          eyebrow="Where we work"
          title={
            <>
              Across{" "}
              <span className="text-gradient">{contact.region}.</span>
            </>
          }
          body="If your site sits outside these areas, ask anyway — we travel for contract work and will tell you straight if we cannot service you well."
        />

        <div className="flex flex-wrap content-start gap-2.5">
          {cleaning.serviceAreas.map((area, i) => (
            <Reveal key={area} delay={i * 0.04}>
              <span className="inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-elevated/30 px-5 py-3 text-sm text-mist transition-all duration-500 hover:-translate-y-0.5 hover:border-accent/40 hover:text-bone">
                <span
                  aria-hidden
                  className="size-1.5 rounded-full bg-accent/70"
                />
                {area}
              </span>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
