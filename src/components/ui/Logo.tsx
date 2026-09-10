import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * The group mark. A division renders the same mark with its own name beneath,
 * which is how the parent/child relationship stays legible on every page.
 */
export default function Logo({
  division,
  href = "/",
  className,
}: {
  division?: string;
  href?: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn("group/logo flex items-center gap-3", className)}
      aria-label={division ? `${division}, a Don & Silva Group company` : "Don & Silva Group, home"}
    >
      <span className="relative grid size-10 shrink-0 place-items-center">
        <svg
          viewBox="0 0 40 40"
          className="absolute inset-0 size-full transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover/logo:rotate-90"
          aria-hidden
        >
          <defs>
            <linearGradient id="ds-mark" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="var(--color-accent-soft)" />
              <stop offset="100%" stopColor="var(--color-accent)" />
            </linearGradient>
          </defs>
          <rect
            x="1.5"
            y="1.5"
            width="37"
            height="37"
            rx="11"
            fill="none"
            stroke="url(#ds-mark)"
            strokeWidth="1.4"
            opacity="0.55"
          />
          <rect
            x="7.5"
            y="7.5"
            width="25"
            height="25"
            rx="7"
            fill="none"
            stroke="url(#ds-mark)"
            strokeWidth="1"
            opacity="0.3"
          />
        </svg>
        <span className="font-display text-[13px] font-semibold tracking-tight text-accent">
          DS
        </span>
      </span>

      <span className="flex flex-col leading-none">
        <span className="font-display text-[15px] font-semibold tracking-tight text-bone">
          Don &amp; Silva
        </span>
        <span className="mt-1 text-[10px] font-medium uppercase tracking-[0.22em] text-mist">
          {division ?? "Group"}
        </span>
      </span>
    </Link>
  );
}
