import { ButtonLink, Arrow } from "@/components/ui/Button";
import Reveal from "@/components/ui/Reveal";
import { contact } from "@/content/site";

export default function CallToAction({
  eyebrow,
  title,
  body,
  primaryHref = "/contact",
  primaryLabel = "Request a quote",
}: {
  eyebrow: string;
  title: string;
  body: string;
  primaryHref?: string;
  primaryLabel?: string;
}) {
  return (
    <section className="relative mx-auto max-w-7xl px-5 py-28 sm:px-8 lg:py-36">
      <Reveal>
        <div className="grain edge-glow relative overflow-hidden rounded-[2rem] border border-white/10 bg-elevated/40 px-8 py-16 text-center sm:px-16 lg:py-24">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,color-mix(in_oklab,var(--color-accent)_18%,transparent),transparent_65%)]"
          />

          <div className="relative">
            <span className="text-[11px] font-medium uppercase tracking-[0.28em] text-accent">
              {eyebrow}
            </span>
            <h2 className="mx-auto mt-6 max-w-3xl font-display text-4xl font-semibold leading-[1.05] tracking-[-0.035em] text-balance sm:text-5xl lg:text-6xl">
              {title}
            </h2>
            <p className="mx-auto mt-6 max-w-xl leading-relaxed text-mist text-pretty">
              {body}
            </p>

            <div className="mt-10 flex flex-wrap justify-center gap-3">
              <ButtonLink href={primaryHref}>
                {primaryLabel}
                <Arrow />
              </ButtonLink>
              <ButtonLink href={contact.phoneHref} variant="outline">
                Call {contact.phoneDisplay}
              </ButtonLink>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
