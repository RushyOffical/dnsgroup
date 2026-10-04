import type { Metadata } from "next";
import Nav from "@/components/ui/Nav";
import Footer from "@/components/ui/Footer";
import CleaningHero from "@/components/sections/CleaningHero";
import Assurances from "@/components/sections/Assurances";
import CleanSequence from "@/components/sections/CleanSequence";
import ServicesShowcase from "@/components/sections/ServicesShowcase";
import ProcessTimeline from "@/components/sections/ProcessTimeline";
import ServiceAreas from "@/components/sections/ServiceAreas";
import CallToAction from "@/components/sections/CallToAction";
import Accordion from "@/components/ui/Accordion";
import SectionHeading from "@/components/ui/SectionHeading";
import { cleaning, cleaningNav, contact, group } from "@/content/site";

export const metadata: Metadata = {
  title: "Cleaning",
  description: cleaning.hero.body,
  alternates: { canonical: "/cleaning" },
  openGraph: {
    title: `${cleaning.name} — ${cleaning.tagline}`,
    description: cleaning.hero.body,
    url: `${group.url}/cleaning`,
  },
};

/** Marks this page as the division's service offering, owned by the parent. */
const serviceSchema = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  name: cleaning.name,
  description: cleaning.hero.body,
  url: `${group.url}/cleaning`,
  telephone: contact.phoneDisplay,
  email: contact.emailCleaning,
  parentOrganization: {
    "@type": "Organization",
    name: group.name,
    url: group.url,
  },
  areaServed: cleaning.serviceAreas.map((area) => ({
    "@type": "Place",
    name: area,
  })),
  hasOfferCatalog: {
    "@type": "OfferCatalog",
    name: "Cleaning services",
    itemListElement: cleaning.services.map((service) => ({
      "@type": "Offer",
      itemOffered: {
        "@type": "Service",
        name: service.title,
        description: service.blurb,
      },
    })),
  },
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: cleaning.faqs.map((faq) => ({
    "@type": "Question",
    name: faq.q,
    acceptedAnswer: { "@type": "Answer", text: faq.a },
  })),
};

export default function CleaningPage() {
  return (
    /* Every accent token below this node resolves to the cleaning aqua. */
    <div data-brand="cleaning" className="flex min-h-full flex-1 flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <Nav items={cleaningNav} division="Cleaning" logoHref="/cleaning" />

      <main id="main" className="flex-1">
        <CleaningHero />
        <Assurances />
        <CleanSequence />
        <ServicesShowcase />
        <ProcessTimeline />
        <ServiceAreas />

        <section
          id="faq"
          className="relative mx-auto max-w-7xl scroll-mt-24 px-5 pb-28 sm:px-8 lg:pb-36"
        >
          <div className="grid gap-14 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
            <SectionHeading
              eyebrow="Questions"
              title={
                <>
                  The things{" "}
                  <span className="text-mist">people ask first.</span>
                </>
              }
              className="lg:sticky lg:top-32 lg:self-start"
            />
            <Accordion items={cleaning.faqs} />
          </div>
        </section>

        <CallToAction
          eyebrow="Don & Silva Cleaning"
          title="Get a quote that actually holds."
          body="Send through the site details and we will come and look at it. You will have a fixed, itemised quote within 24 hours."
          primaryLabel="Request a free quote"
        />
      </main>

      <Footer division="Cleaning" />
    </div>
  );
}
