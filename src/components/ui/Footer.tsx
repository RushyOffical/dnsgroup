import Link from "next/link";
import Logo from "./Logo";
import { contact, divisions, group } from "@/content/site";

export default function Footer({ division }: { division?: string }) {
  const year = new Date().getFullYear();

  return (
    <footer className="grain relative border-t border-white/8 bg-void">
      {/* Oversized wordmark bleeding off the baseline */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 select-none overflow-hidden"
      >
        <span className="block translate-y-[22%] text-center font-display text-[19vw] font-bold leading-none tracking-[-0.05em] text-white/[0.022]">
          DON &amp; SILVA
        </span>
      </div>

      <div className="relative mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:py-28">
        <div className="grid gap-14 lg:grid-cols-[1.4fr_1fr_1fr_1.1fr]">
          <div className="flex flex-col gap-6">
            <Logo division={division} />
            <p className="max-w-xs text-sm leading-relaxed text-mist">
              {group.mission}
            </p>
            <div className="flex gap-2.5">
              {contact.socials.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  className="grid size-9 place-items-center rounded-full border border-white/10 text-[11px] text-mist transition-all duration-300 hover:-translate-y-0.5 hover:border-accent/50 hover:text-accent"
                  aria-label={social.label}
                >
                  {social.label.charAt(0)}
                </a>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-[11px] uppercase tracking-[0.24em] text-mist">
              Companies
            </h3>
            <ul className="mt-5 flex flex-col gap-3 text-sm">
              {divisions.map((d) => (
                <li key={d.slug}>
                  {d.href ? (
                    <Link
                      href={d.href}
                      className="text-bone transition-colors hover:text-accent"
                    >
                      {d.shortName}
                    </Link>
                  ) : (
                    <span className="text-mist/45">
                      {d.shortName}
                      <span className="ml-2 text-[10px] uppercase tracking-widest">
                        Soon
                      </span>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-[11px] uppercase tracking-[0.24em] text-mist">
              Group
            </h3>
            <ul className="mt-5 flex flex-col gap-3 text-sm">
              <li>
                <Link href="/" className="text-bone transition-colors hover:text-accent">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/#standard" className="text-bone transition-colors hover:text-accent">
                  Our standard
                </Link>
              </li>
              <li>
                <Link href="/#divisions" className="text-bone transition-colors hover:text-accent">
                  Divisions
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-bone transition-colors hover:text-accent">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-[11px] uppercase tracking-[0.24em] text-mist">
              Contact
            </h3>
            <ul className="mt-5 flex flex-col gap-3 text-sm">
              <li>
                <a
                  href={contact.phoneHref}
                  className="text-bone transition-colors hover:text-accent"
                >
                  {contact.phoneDisplay}
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${contact.email}`}
                  className="break-all text-bone transition-colors hover:text-accent"
                >
                  {contact.email}
                </a>
              </li>
              <li className="text-mist">{contact.region}</li>
              <li className="text-mist">{contact.hours}</li>
            </ul>
          </div>
        </div>

        <div className="mt-16 flex flex-col gap-3 border-t border-white/8 pt-8 text-xs text-mist sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {group.name}. ABN {contact.abn}. All rights reserved.
          </p>
          <p>{group.tagline}</p>
        </div>
      </div>
    </footer>
  );
}
