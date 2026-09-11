import type { Metadata } from "next";
import Nav from "@/components/ui/Nav";
import Footer from "@/components/ui/Footer";
import NeuralConsole from "@/components/sections/NeuralConsole";
import { group, groupNav, neuralLink } from "@/content/site";

export const metadata: Metadata = {
  title: neuralLink.name,
  description: neuralLink.body,
  alternates: { canonical: "/neural" },
  openGraph: {
    title: `${neuralLink.name} — ${group.name}`,
    description: neuralLink.body,
    url: `${group.url}/neural`,
  },
};

/**
 * The Neural Link console.
 *
 * A full-height app view rather than a scrolling marketing section: the whole
 * group — coverage, services, divisions and the standard behind them — drawn
 * as one network you can pick your way through. Every node is read out of
 * `content/site.ts`, so the map is never a second copy of the truth.
 */
export default function NeuralLinkPage() {
  return (
    <>
      <Nav items={groupNav} />
      <NeuralConsole />
      <Footer />
    </>
  );
}
