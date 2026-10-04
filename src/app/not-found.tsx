import Link from "next/link";
import { ButtonLink, Arrow } from "@/components/ui/Button";
import Logo from "@/components/ui/Logo";

export default function NotFound() {
  return (
    <main
      id="main"
      className="relative flex min-h-svh flex-1 flex-col items-center justify-center px-5 text-center"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_50%_40%,color-mix(in_oklab,var(--color-accent)_12%,transparent),transparent_60%)]"
      />

      <Logo />

      <p className="mt-14 font-display text-[clamp(5rem,18vw,12rem)] font-semibold leading-none tracking-[-0.05em] text-gradient">
        404
      </p>
      <h1 className="mt-4 font-display text-2xl font-medium tracking-tight sm:text-3xl">
        This page isn&rsquo;t part of the group.
      </h1>
      <p className="mt-4 max-w-sm leading-relaxed text-mist">
        The link may be out of date, or the division you are looking for
        hasn&rsquo;t opened yet.
      </p>

      <div className="mt-9 flex flex-wrap justify-center gap-3">
        <ButtonLink href="/">
          Back to the Group
          <Arrow />
        </ButtonLink>
        <ButtonLink href="/cleaning" variant="outline">
          Visit Cleaning
        </ButtonLink>
      </div>

      <Link
        href="/contact"
        className="mt-10 text-sm text-mist underline underline-offset-4 transition-colors hover:text-accent"
      >
        Or get in touch
      </Link>
    </main>
  );
}
