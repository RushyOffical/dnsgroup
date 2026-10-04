import type { Metadata } from "next";
import Link from "next/link";
import Nav from "@/components/ui/Nav";
import Footer from "@/components/ui/Footer";
import QuoteForm from "@/components/sections/QuoteForm";
import Reveal from "@/components/ui/Reveal";
import { contact, divisions, group, groupNav } from "@/content/site";

export const metadata: Metadata = {
  title: "Contact",
  description: `Request a quote from ${group.name}. ${contact.hours}.`,
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <>
      <Nav items={groupNav} />

      <main id="main" className="flex-1">
        <section className="relative mx-auto max-w-7xl px-5 pb-24 pt-40 sm:px-8 lg:pt-48">
          {/* Ambient wash so the page doesn't read flat without a canvas */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[70vh] bg-[radial-gradient(ellipse_at_50%_0%,color-mix(in_oklab,var(--color-accent)_13%,transparent),transparent_65%)]"
          />

          <div className="grid gap-16 lg:grid-cols-[0.85fr_1.15fr] lg:gap-24">
            <div className="flex flex-col gap-10">
              <Reveal>
                <div>
                  <span className="inline-flex items-center gap-2.5 text-[11px] font-medium uppercase tracking-[0.28em] text-accent">
                    <span className="h-px w-8 bg-accent/50" aria-hidden />
                    Contact
                  </span>
                  <h1 className="mt-6 font-display text-5xl font-semibold leading-[1.02] tracking-[-0.04em] text-balance lg:text-6xl">
                    Let&rsquo;s talk about{" "}
                    <span className="text-gradient">the work.</span>
                  </h1>
                  <p className="mt-6 max-w-md leading-relaxed text-mist text-pretty">
                    Tell us about the site and we will come and look at it. Every
                    quote is fixed, itemised and back with you within 24 hours.
                  </p>
                </div>
              </Reveal>

              <Reveal delay={0.1}>
                <dl className="flex flex-col gap-6 border-t border-white/8 pt-8">
                  <div>
                    <dt className="text-[11px] uppercase tracking-[0.2em] text-mist">
                      Phone
                    </dt>
                    <dd className="mt-2">
                      <a
                        href={contact.phoneHref}
                        className="font-display text-2xl tracking-tight transition-colors hover:text-accent"
                      >
                        {contact.phoneDisplay}
                      </a>
                    </dd>
                  </div>

                  <div>
                    <dt className="text-[11px] uppercase tracking-[0.2em] text-mist">
                      Email
                    </dt>
                    <dd className="mt-2">
                      <a
                        href={`mailto:${contact.email}`}
                        className="break-all text-lg transition-colors hover:text-accent"
                      >
                        {contact.email}
                      </a>
                    </dd>
                  </div>

                  <div>
                    <dt className="text-[11px] uppercase tracking-[0.2em] text-mist">
                      Hours
                    </dt>
                    <dd className="mt-2 text-mist">{contact.hours}</dd>
                  </div>

                  <div>
                    <dt className="text-[11px] uppercase tracking-[0.2em] text-mist">
                      Enquiring about
                    </dt>
                    <dd className="mt-3 flex flex-wrap gap-2">
                      {divisions.map((d) =>
                        d.href ? (
                          <Link
                            key={d.slug}
                            href={d.href}
                            className="rounded-full border border-white/12 px-4 py-2 text-xs transition-colors hover:border-accent/50 hover:text-accent"
                          >
                            {d.shortName}
                          </Link>
                        ) : (
                          <span
                            key={d.slug}
                            className="rounded-full border border-white/6 px-4 py-2 text-xs text-mist/40"
                          >
                            {d.shortName} · soon
                          </span>
                        ),
                      )}
                    </dd>
                  </div>
                </dl>
              </Reveal>
            </div>

            <Reveal delay={0.15}>
              <div className="glass grain rounded-card p-7 sm:p-10">
                <QuoteForm />
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
