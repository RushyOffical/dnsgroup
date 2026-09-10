"use client";

import { useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import { motion } from "motion/react";
import { Button, Arrow } from "@/components/ui/Button";
import { submitQuote } from "@/app/actions/quote";
import {
  formatQuoteBody,
  formatQuoteSubject,
  validateQuote,
  SERVICE_OPTIONS,
  type QuoteErrors,
  type QuoteFields,
} from "@/lib/quote";
import { cleaning, contact } from "@/content/site";
import { cn } from "@/lib/utils";

const EMPTY: QuoteFields = {
  name: "",
  email: "",
  phone: "",
  suburb: "",
  service: cleaning.services[0].title,
  message: "",
  company: "",
};

type Outcome =
  /** Delivered server-side. */
  | { kind: "sent" }
  /** No provider configured — handed to the visitor's mail client instead. */
  | { kind: "mailto" }
  | { kind: "error"; message: string };

/**
 * Quote request form.
 *
 * Submits through a Server Action, which validates again server-side and
 * delivers via whichever provider is configured. If none is (the default on a
 * fresh deploy), the action reports `unconfigured` and we fall back to opening
 * the visitor's mail client — so the form is never a dead end.
 */
export default function QuoteForm() {
  const [fields, setFields] = useState<QuoteFields>(EMPTY);
  const [errors, setErrors] = useState<QuoteErrors>({});
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [pending, startTransition] = useTransition();
  const startedAt = useRef<number>(0);

  useEffect(() => {
    startedAt.current = Date.now();
  }, []);

  const set =
    (key: keyof QuoteFields) =>
    (
      event: React.ChangeEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >,
    ) => {
      setFields((prev) => ({ ...prev, [key]: event.target.value }));
      setErrors((prev) => ({ ...prev, [key]: undefined }));
    };

  const openMailClient = (payload: QuoteFields) => {
    window.location.href = `mailto:${contact.emailCleaning}?subject=${encodeURIComponent(
      formatQuoteSubject(payload),
    )}&body=${encodeURIComponent(formatQuoteBody(payload))}`;
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending) return;

    const found = validateQuote(fields);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    const payload = { ...fields, startedAt: startedAt.current };

    startTransition(async () => {
      try {
        const result = await submitQuote(payload);

        if (result.ok) {
          setOutcome({ kind: "sent" });
          return;
        }

        if (result.reason === "unconfigured") {
          openMailClient(payload);
          setOutcome({ kind: "mailto" });
          return;
        }

        if (result.reason === "validation" && result.errors) {
          setErrors(result.errors);
          return;
        }

        setOutcome({
          kind: "error",
          message:
            result.reason === "rate-limited"
              ? "That's a few requests in a short time. Give it a few minutes, or call us and we'll sort it now."
              : "Something went wrong sending that. Please call us and we'll take the details directly.",
        });
      } catch {
        // The action itself was unreachable (offline, deploy in progress).
        // Falling back is better than losing the enquiry.
        openMailClient(payload);
        setOutcome({ kind: "mailto" });
      }
    });
  };

  const field =
    "w-full rounded-xl border border-white/10 bg-elevated/40 px-4 py-3.5 text-sm text-bone outline-none transition-colors duration-300 placeholder:text-mist/50 focus:border-accent/60 disabled:opacity-60";

  const reset = () => {
    setFields(EMPTY);
    setErrors({});
    setOutcome(null);
    startedAt.current = Date.now();
  };

  if (outcome && outcome.kind !== "error") {
    const delivered = outcome.kind === "sent";
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="glass rounded-card p-10 text-center"
        role="status"
      >
        <span className="mx-auto grid size-12 place-items-center rounded-full border border-accent/40 bg-accent/10">
          <svg
            viewBox="0 0 16 16"
            className="size-5 text-accent"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M3 8.5l3.5 3.5L13 5" />
          </svg>
        </span>
        <h3 className="mt-6 font-display text-2xl font-semibold tracking-tight">
          {delivered ? "Request received" : "Your email is ready to send"}
        </h3>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-mist">
          {delivered
            ? "Thanks — we have your details and will come back to you within one business day."
            : "We have opened your mail app with the details filled in. Send it and we will come back to you within one business day."}
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-7 text-sm text-accent underline underline-offset-4 transition-opacity hover:opacity-70"
        >
          Start another request
        </button>
      </motion.div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      {/* Honeypot: off-screen and skipped by keyboard, so only bots fill it. */}
      <div aria-hidden className="sr-only">
        <label htmlFor="company-website">Company website</label>
        <input
          id="company-website"
          name="company"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={fields.company ?? ""}
          onChange={set("company")}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="flex flex-col gap-2">
          <span className="text-[11px] uppercase tracking-[0.2em] text-mist">
            Name
          </span>
          <input
            value={fields.name}
            onChange={set("name")}
            disabled={pending}
            autoComplete="name"
            placeholder="Your name"
            className={cn(field, errors.name && "border-red-400/60")}
            aria-invalid={Boolean(errors.name)}
          />
          {errors.name ? (
            <span className="text-xs text-red-400/90">{errors.name}</span>
          ) : null}
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-[11px] uppercase tracking-[0.2em] text-mist">
            Email
          </span>
          <input
            type="email"
            value={fields.email}
            onChange={set("email")}
            disabled={pending}
            autoComplete="email"
            placeholder="you@company.com.au"
            className={cn(field, errors.email && "border-red-400/60")}
            aria-invalid={Boolean(errors.email)}
          />
          {errors.email ? (
            <span className="text-xs text-red-400/90">{errors.email}</span>
          ) : null}
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-[11px] uppercase tracking-[0.2em] text-mist">
            Phone <span className="normal-case tracking-normal">(optional)</span>
          </span>
          <input
            type="tel"
            value={fields.phone}
            onChange={set("phone")}
            disabled={pending}
            autoComplete="tel"
            placeholder="04XX XXX XXX"
            className={cn(field, errors.phone && "border-red-400/60")}
          />
          {errors.phone ? (
            <span className="text-xs text-red-400/90">{errors.phone}</span>
          ) : null}
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-[11px] uppercase tracking-[0.2em] text-mist">
            Suburb
          </span>
          <input
            value={fields.suburb}
            onChange={set("suburb")}
            disabled={pending}
            autoComplete="address-level2"
            placeholder="Where is the site?"
            className={cn(field, errors.suburb && "border-red-400/60")}
            aria-invalid={Boolean(errors.suburb)}
          />
          {errors.suburb ? (
            <span className="text-xs text-red-400/90">{errors.suburb}</span>
          ) : null}
        </label>
      </div>

      <label className="flex flex-col gap-2">
        <span className="text-[11px] uppercase tracking-[0.2em] text-mist">
          Service
        </span>
        <select
          value={fields.service}
          onChange={set("service")}
          disabled={pending}
          className={field}
        >
          {SERVICE_OPTIONS.map((option) => (
            <option key={option} value={option} className="bg-ink">
              {option}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-[11px] uppercase tracking-[0.2em] text-mist">
          About the space
        </span>
        <textarea
          value={fields.message}
          onChange={set("message")}
          disabled={pending}
          rows={5}
          placeholder="Size, how often you need it, anything specific we should know."
          className={cn(field, "resize-none", errors.message && "border-red-400/60")}
          aria-invalid={Boolean(errors.message)}
        />
        {errors.message ? (
          <span className="text-xs text-red-400/90">{errors.message}</span>
        ) : null}
      </label>

      {outcome?.kind === "error" ? (
        <p
          role="alert"
          className="rounded-xl border border-red-400/30 bg-red-400/8 px-4 py-3.5 text-sm leading-relaxed text-red-200/90"
        >
          {outcome.message}{" "}
          <a href={contact.phoneHref} className="underline underline-offset-4">
            {contact.phoneDisplay}
          </a>
        </p>
      ) : null}

      <Button
        type="submit"
        disabled={pending}
        aria-busy={pending}
        className="mt-2 w-full sm:w-auto sm:self-start"
      >
        {pending ? "Sending…" : "Send request"}
        {pending ? null : <Arrow />}
      </Button>

      <p className="text-xs leading-relaxed text-mist/70">
        We reply within one business day. Your details are only used to prepare
        your quote.
      </p>
    </form>
  );
}
