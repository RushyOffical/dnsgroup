import type { Metadata, Viewport } from "next";
import { Inter, Sora } from "next/font/google";
import "./globals.css";
import SmoothScroll from "@/components/SmoothScroll";
import { contact, group } from "@/content/site";

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(group.url),
  title: {
    default: `${group.name} — ${group.tagline}`,
    template: `%s · ${group.name}`,
  },
  description: group.hero.body,
  applicationName: group.name,
  keywords: [
    "Don and Silva Group",
    "Don and Silva Cleaning",
    "commercial cleaning Australia",
    "office cleaning",
    "end of lease cleaning",
    "strata cleaning",
  ],
  openGraph: {
    type: "website",
    siteName: group.name,
    title: `${group.name} — ${group.tagline}`,
    description: group.hero.body,
    locale: "en_AU",
    url: group.url,
  },
  twitter: {
    card: "summary_large_image",
    title: `${group.name} — ${group.tagline}`,
    description: group.hero.body,
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#04060c",
  colorScheme: "dark",
};

/**
 * Declares the parent company and its subsidiaries to search engines, so the
 * group structure is machine-readable rather than implied by the nav alone.
 */
const organisationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: group.name,
  url: group.url,
  slogan: group.tagline,
  description: group.mission,
  telephone: contact.phoneDisplay,
  email: contact.email,
  areaServed: contact.region,
  subOrganization: [
    {
      "@type": "Organization",
      name: "Don & Silva Cleaning",
      url: `${group.url}/cleaning`,
      description:
        "Commercial and residential cleaning division of Don & Silva Group.",
    },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en-AU"
      data-brand="group"
      className={`${sora.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-ink">
        <script
          type="application/ld+json"
          // Static, authored object — not user input.
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organisationSchema),
          }}
        />
        <SmoothScroll />
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-5 focus:top-5 focus:z-100 focus:rounded-full focus:bg-accent focus:px-5 focus:py-3 focus:text-sm focus:text-ink"
        >
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
