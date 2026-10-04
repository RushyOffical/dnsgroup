import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "ghost" | "outline";

const base =
  "group/btn relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full px-7 py-3.5 text-sm font-medium tracking-tight transition-all duration-500 ease-[var(--ease-out-expo)] disabled:pointer-events-none disabled:opacity-50";

const variants: Record<Variant, string> = {
  primary:
    "bg-accent text-ink hover:shadow-[0_18px_50px_-18px_var(--color-accent)] hover:-translate-y-0.5",
  outline:
    "border border-white/15 text-bone hover:border-accent/60 hover:bg-accent/5 hover:-translate-y-0.5",
  ghost: "text-mist hover:text-bone",
};

function Inner({ children }: { children: ReactNode }) {
  return (
    <>
      {/* Sheen sweeps across on hover — reads as polish, costs one gradient. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover/btn:translate-x-full"
      />
      <span className="relative z-10 flex items-center gap-2">{children}</span>
    </>
  );
}

export function ButtonLink({
  href,
  variant = "primary",
  className,
  children,
  ...rest
}: {
  href: string;
  variant?: Variant;
  className?: string;
  children: ReactNode;
} & Omit<ComponentProps<typeof Link>, "href" | "className" | "children">) {
  const external = href.startsWith("http") || href.startsWith("tel:") || href.startsWith("mailto:");

  if (external) {
    return (
      <a href={href} className={cn(base, variants[variant], className)}>
        <Inner>{children}</Inner>
      </a>
    );
  }

  return (
    <Link href={href} className={cn(base, variants[variant], className)} {...rest}>
      <Inner>{children}</Inner>
    </Link>
  );
}

export function Button({
  variant = "primary",
  className,
  children,
  ...rest
}: ComponentProps<"button"> & { variant?: Variant }) {
  return (
    <button className={cn(base, variants[variant], className)} {...rest}>
      <Inner>{children}</Inner>
    </button>
  );
}

/** Right-pointing chevron used on CTAs; slides on hover. */
export function Arrow() {
  return (
    <svg
      viewBox="0 0 16 16"
      className="size-4 transition-transform duration-500 ease-[var(--ease-out-expo)] group-hover/btn:translate-x-1"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M2 8h11M9 4l4 4-4 4" />
    </svg>
  );
}
