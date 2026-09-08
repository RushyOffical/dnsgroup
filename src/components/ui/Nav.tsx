"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import Logo from "./Logo";
import { ButtonLink, Arrow } from "./Button";
import { cn } from "@/lib/utils";
import { contact, divisions } from "@/content/site";

type NavItem = { label: string; href: string };

export default function Nav({
  items,
  division,
  logoHref = "/",
}: {
  items: readonly NavItem[];
  /** Set on a division page so the bar shows which company you're inside. */
  division?: string;
  logoHref?: string;
}) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // A locked body behind an open overlay; restored on close.
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-50 transition-all duration-500 ease-[var(--ease-out-expo)]",
          scrolled ? "py-3" : "py-6",
        )}
      >
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div
            className={cn(
              "flex items-center justify-between gap-6 rounded-full px-5 py-2.5 transition-all duration-500 ease-[var(--ease-out-expo)]",
              scrolled
                ? "glass shadow-[0_20px_60px_-40px_rgba(0,0,0,0.9)]"
                : "border border-transparent",
            )}
          >
            <Logo division={division} href={logoHref} />

            <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary">
              {items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="relative rounded-full px-4 py-2 text-sm text-mist transition-colors duration-300 hover:text-bone"
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="flex items-center gap-3">
              {/* On a division page, this is the way back up to the parent. */}
              {division ? (
                <Link
                  href="/"
                  className="hidden items-center gap-2 rounded-full border border-white/10 px-3.5 py-2 text-[11px] uppercase tracking-[0.16em] text-mist transition-colors hover:border-accent/40 hover:text-bone md:inline-flex"
                >
                  <span className="size-1.5 rounded-full bg-accent" aria-hidden />
                  Part of the Group
                </Link>
              ) : null}

              <ButtonLink
                href={contact.phoneHref}
                variant="primary"
                className="hidden px-5 py-2.5 text-[13px] sm:inline-flex"
              >
                {contact.phoneDisplay}
                <Arrow />
              </ButtonLink>

              <button
                type="button"
                onClick={() => setMenuOpen(true)}
                aria-label="Open menu"
                className="grid size-10 place-items-center rounded-full border border-white/12 transition-colors hover:border-accent/50 lg:hidden"
              >
                <span className="flex flex-col gap-1.5" aria-hidden>
                  <span className="h-px w-4 bg-current" />
                  <span className="h-px w-4 bg-current" />
                </span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {menuOpen ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="fixed inset-0 z-60 bg-void/95 backdrop-blur-xl lg:hidden"
          >
            <div className="flex h-full flex-col p-6">
              <div className="flex items-center justify-between">
                <Logo division={division} href={logoHref} />
                <button
                  type="button"
                  onClick={() => setMenuOpen(false)}
                  aria-label="Close menu"
                  className="grid size-10 place-items-center rounded-full border border-white/12"
                >
                  <span className="relative block size-4" aria-hidden>
                    <span className="absolute top-1/2 h-px w-4 rotate-45 bg-current" />
                    <span className="absolute top-1/2 h-px w-4 -rotate-45 bg-current" />
                  </span>
                </button>
              </div>

              <nav
                className="mt-14 flex flex-1 flex-col gap-1"
                aria-label="Mobile"
              >
                {items.map((item, i) => (
                  <motion.div
                    key={item.href}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.06 * i + 0.1, duration: 0.5 }}
                  >
                    <Link
                      href={item.href}
                      onClick={() => setMenuOpen(false)}
                      className="block border-b border-white/8 py-5 font-display text-3xl font-medium tracking-tight transition-colors hover:text-accent"
                    >
                      {item.label}
                    </Link>
                  </motion.div>
                ))}

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="mt-10"
                >
                  <p className="text-[11px] uppercase tracking-[0.24em] text-mist">
                    Group companies
                  </p>
                  <div className="mt-4 flex flex-col gap-2">
                    {divisions.map((d) =>
                      d.href ? (
                        <Link
                          key={d.slug}
                          href={d.href}
                          onClick={() => setMenuOpen(false)}
                          className="text-lg text-bone transition-colors hover:text-accent"
                        >
                          {d.name}
                        </Link>
                      ) : (
                        <span key={d.slug} className="text-lg text-mist/50">
                          {d.name}{" "}
                          <span className="text-[10px] uppercase tracking-widest">
                            · soon
                          </span>
                        </span>
                      ),
                    )}
                  </div>
                </motion.div>
              </nav>

              <ButtonLink href={contact.phoneHref} className="w-full">
                Call {contact.phoneDisplay}
                <Arrow />
              </ButtonLink>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
