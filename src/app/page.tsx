import Nav from "@/components/ui/Nav";
import Footer from "@/components/ui/Footer";
import GroupHero from "@/components/sections/GroupHero";
import DivisionGrid from "@/components/sections/DivisionGrid";
import GroupStandard from "@/components/sections/GroupStandard";
import StatsBand from "@/components/sections/StatsBand";
import CallToAction from "@/components/sections/CallToAction";
import Reveal from "@/components/ui/Reveal";
import { ButtonLink, Arrow } from "@/components/ui/Button";
import { group, groupNav } from "@/content/site";

export default function GroupHome() {
  return (
    <>
      <Nav items={groupNav} />

      <main id="main" className="flex-1">
        <GroupHero />

        {/* --- Who the group is ------------------------------------------ */}
        <section
          id="group"
          className="relative mx-auto max-w-7xl scroll-mt-24 px-5 py-28 sm:px-8 lg:py-40"
        >
          <div className="grid gap-16 lg:grid-cols-[0.9fr_1.1fr] lg:gap-24">
            <Reveal>
              <div className="lg:sticky lg:top-32">
                <span className="inline-flex items-center gap-2.5 text-[11px] font-medium uppercase tracking-[0.28em] text-accent">
                  <span className="h-px w-8 bg-accent/50" aria-hidden />
                  Who we are
                </span>
                <h2 className="mt-6 font-display text-4xl font-semibold leading-[1.06] tracking-[-0.03em] text-balance sm:text-5xl">
                  A services group,{" "}
                  <span className="text-mist">built division by division.</span>
                </h2>
              </div>
            </Reveal>

            <div className="flex flex-col gap-8">
              <Reveal delay={0.1}>
                <p className="text-xl leading-relaxed text-bone text-pretty sm:text-2xl">
                  {group.name} started where the need was clearest — cleaning.
                  It is the division we run today, and the one every future
                  division will be measured against.
                </p>
              </Reveal>

              <Reveal delay={0.16}>
                <p className="leading-relaxed text-mist text-pretty">
                  The plan has never been to be a cleaning company that
                  eventually does other things. It is to build one operating
                  standard — how a crew is trained, how a job is scoped, how a
                  problem gets fixed — and then carry that standard into every
                  field we enter. Cleaning is where we prove it works.
                </p>
              </Reveal>

              <Reveal delay={0.22}>
                <p className="leading-relaxed text-mist text-pretty">
                  That means when you deal with any part of this group, you are
                  dealing with the same people, the same accountability and the
                  same promise. Not a franchise. Not a subcontractor chain. One
                  company, answerable for the work.
                </p>
              </Reveal>

              <Reveal delay={0.28}>
                <div className="mt-2 flex flex-wrap gap-3">
                  <ButtonLink href="/cleaning" variant="outline">
                    See the cleaning division
                    <Arrow />
                  </ButtonLink>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        <StatsBand />
        <DivisionGrid />
        <GroupStandard />

        <CallToAction
          eyebrow="Work with the group"
          title="Tell us what needs doing."
          body="Whether it is a single clean or a contract across a portfolio of sites, the conversation starts the same way — we look at the space and quote it properly."
          primaryLabel="Request a quote"
        />
      </main>

      <Footer />
    </>
  );
}
