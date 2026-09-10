import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import Reveal from "./Reveal";

export default function SectionHeading({
  eyebrow,
  title,
  body,
  align = "left",
  className,
}: {
  eyebrow?: string;
  title: ReactNode;
  body?: ReactNode;
  align?: "left" | "center";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex max-w-2xl flex-col gap-5",
        align === "center" && "mx-auto items-center text-center",
        className,
      )}
    >
      {eyebrow ? (
        <Reveal>
          <span className="inline-flex items-center gap-2.5 text-[11px] font-medium uppercase tracking-[0.28em] text-accent">
            <span className="h-px w-8 bg-accent/50" aria-hidden />
            {eyebrow}
          </span>
        </Reveal>
      ) : null}

      <Reveal delay={0.06}>
        <h2 className="font-display text-4xl font-semibold leading-[1.06] tracking-[-0.03em] text-balance sm:text-5xl lg:text-[3.4rem]">
          {title}
        </h2>
      </Reveal>

      {body ? (
        <Reveal delay={0.12}>
          <p className="text-base leading-relaxed text-mist text-pretty sm:text-lg">
            {body}
          </p>
        </Reveal>
      ) : null}
    </div>
  );
}
