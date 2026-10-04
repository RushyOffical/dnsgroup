/**
 * Shared quote-request contract.
 *
 * Deliberately dependency-free and free of server imports so the exact same
 * validation runs in the browser for instant feedback and again on the server,
 * where it is the only validation that actually counts.
 */

import { cleaning } from "@/content/site";

export type QuoteFields = {
  name: string;
  email: string;
  phone: string;
  suburb: string;
  service: string;
  message: string;
  /** Honeypot. Real users never see it, so any value means a bot. */
  company?: string;
  /** Client timestamp of when the form was mounted, as a millisecond epoch. */
  startedAt?: number;
};

export type QuoteErrors = Partial<Record<keyof QuoteFields, string>>;

export type QuoteResult =
  | { ok: true }
  | { ok: false; errors?: QuoteErrors; reason: QuoteFailure };

/**
 * `unconfigured` is not an error the visitor caused — it means no delivery
 * provider is set up yet, and the client should fall back to mailto rather
 * than showing a failure.
 */
export type QuoteFailure =
  | "validation"
  | "unconfigured"
  | "rate-limited"
  | "rejected"
  | "delivery";

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const LIMITS = {
  name: 120,
  email: 200,
  phone: 40,
  suburb: 120,
  service: 120,
  message: 4000,
} as const;

/** Services the visitor is allowed to pick, plus the catch-all. */
export const SERVICE_OPTIONS = [
  ...cleaning.services.map((service) => service.title),
  "Something else",
];

export function validateQuote(fields: QuoteFields): QuoteErrors {
  const errors: QuoteErrors = {};

  const name = fields.name?.trim() ?? "";
  const email = fields.email?.trim() ?? "";
  const suburb = fields.suburb?.trim() ?? "";
  const message = fields.message?.trim() ?? "";
  const phone = fields.phone?.trim() ?? "";

  if (!name) errors.name = "Please tell us your name.";
  else if (name.length > LIMITS.name) errors.name = "That name is too long.";

  if (!EMAIL_PATTERN.test(email)) errors.email = "Enter a valid email address.";
  else if (email.length > LIMITS.email) errors.email = "That email is too long.";

  if (!suburb) errors.suburb = "Which suburb is the site in?";
  else if (suburb.length > LIMITS.suburb) errors.suburb = "That suburb is too long.";

  if (message.length < 10) {
    errors.message = "A sentence or two about the space helps us quote it.";
  } else if (message.length > LIMITS.message) {
    errors.message = "That message is too long — send us the essentials.";
  }

  if (phone.length > LIMITS.phone) errors.phone = "That phone number is too long.";

  if (fields.service && !SERVICE_OPTIONS.includes(fields.service)) {
    errors.service = "Choose one of the listed services.";
  }

  return errors;
}

/** Normalises and truncates before anything is stored or emailed. */
export function normaliseQuote(fields: QuoteFields): QuoteFields {
  const trim = (value: unknown, max: number) =>
    typeof value === "string" ? value.trim().slice(0, max) : "";

  return {
    name: trim(fields.name, LIMITS.name),
    email: trim(fields.email, LIMITS.email),
    phone: trim(fields.phone, LIMITS.phone),
    suburb: trim(fields.suburb, LIMITS.suburb),
    service: trim(fields.service, LIMITS.service),
    message: trim(fields.message, LIMITS.message),
  };
}

/** Plain-text body shared by every delivery provider and the mailto fallback. */
export function formatQuoteBody(fields: QuoteFields) {
  return [
    `Name:    ${fields.name}`,
    `Email:   ${fields.email}`,
    `Phone:   ${fields.phone || "—"}`,
    `Suburb:  ${fields.suburb}`,
    `Service: ${fields.service}`,
    "",
    fields.message,
  ].join("\n");
}

export function formatQuoteSubject(fields: QuoteFields) {
  return `Quote request — ${fields.service || "General enquiry"}`;
}
