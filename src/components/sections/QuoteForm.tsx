"use client";

import { useState, type FormEvent } from "react";
import { motion } from "motion/react";
import { Button, Arrow } from "@/components/ui/Button";
import { cleaning, contact } from "@/content/site";
import { cn } from "@/lib/utils";

type Fields = {
  name: string;
  email: string;
  phone: string;
  suburb: string;
  service: string;
  message: string;
};

const EMPTY: Fields = {
  name: "",
  email: "",
  phone: "",
  suburb: "",
  service: cleaning.services[0].title,
  message: "",
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Quote request form.
 *
 * ⚠️  There is no backend yet. On submit this composes a pre-filled email and
 *     hands it to the visitor's mail client, which works on a static host with
 *     no server and no third-party dependency.
 *
 *     To take submissions server-side instead, replace `handleSubmit` with a
 *     Server Action (or a POST to /api/quote) — the validation below already
 *     produces a clean `Fields` object to send.
 */
export default function QuoteForm() {
  const [fields, setFields] = useState<Fields>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof Fields, string>>>({});
  const [sent, setSent] = useState(false);

  const set = (key: keyof Fields) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    setFields((prev) => ({ ...prev, [key]: event.target.value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const validate = () => {
    const next: Partial<Record<keyof Fields, string>> = {};
    if (!fields.name.trim()) next.name = "Please tell us your name.";
    if (!EMAIL_PATTERN.test(fields.email)) next.email = "Enter a valid email address.";
    if (!fields.suburb.trim()) next.suburb = "Which suburb is the site in?";
    if (fields.message.trim().length < 10) {
      next.message = "A sentence or two about the space helps us quote it.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validate()) return;

    const body = [
      `Name: ${fields.name}`,
      `Email: ${fields.email}`,
      `Phone: ${fields.phone || "—"}`,
      `Suburb: ${fields.suburb}`,
      `Service: ${fields.service}`,
      "",
      fields.message,
    ].join("\n");

    window.location.href = `mailto:${contact.emailCleaning}?subject=${encodeURIComponent(
      `Quote request — ${fields.service}`,
    )}&body=${encodeURIComponent(body)}`;

    setSent(true);
  };

  const field =
    "w-full rounded-xl border border-white/10 bg-elevated/40 px-4 py-3.5 text-sm text-bone outline-none transition-colors duration-300 placeholder:text-mist/50 focus:border-accent/60";

  if (sent) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="glass rounded-card p-10 text-center"
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
          Your email is ready to send
        </h3>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-mist">
          We have opened your mail app with the details filled in. Send it and
          we will come back to you within one business day.
        </p>
        <button
          type="button"
          onClick={() => {
            setFields(EMPTY);
            setSent(false);
          }}
          className="mt-7 text-sm text-accent underline underline-offset-4 transition-opacity hover:opacity-70"
        >
          Start another request
        </button>
      </motion.div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="flex flex-col gap-2">
          <span className="text-[11px] uppercase tracking-[0.2em] text-mist">
            Name
          </span>
          <input
            value={fields.name}
            onChange={set("name")}
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
            placeholder="04XX XXX XXX"
            className={field}
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-[11px] uppercase tracking-[0.2em] text-mist">
            Suburb
          </span>
          <input
            value={fields.suburb}
            onChange={set("suburb")}
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
        <select value={fields.service} onChange={set("service")} className={field}>
          {cleaning.services.map((service) => (
            <option key={service.slug} value={service.title} className="bg-ink">
              {service.title}
            </option>
          ))}
          <option value="Something else" className="bg-ink">
            Something else
          </option>
        </select>
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-[11px] uppercase tracking-[0.2em] text-mist">
          About the space
        </span>
        <textarea
          value={fields.message}
          onChange={set("message")}
          rows={5}
          placeholder="Size, how often you need it, anything specific we should know."
          className={cn(field, "resize-none", errors.message && "border-red-400/60")}
          aria-invalid={Boolean(errors.message)}
        />
        {errors.message ? (
          <span className="text-xs text-red-400/90">{errors.message}</span>
        ) : null}
      </label>

      <Button type="submit" className="mt-2 w-full sm:w-auto sm:self-start">
        Send request
        <Arrow />
      </Button>

      <p className="text-xs leading-relaxed text-mist/70">
        We reply within one business day. Your details are only used to prepare
        your quote.
      </p>
    </form>
  );
}
