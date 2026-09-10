"use server";

import { headers } from "next/headers";
import { deliverQuote, resolveProvider } from "@/lib/delivery";
import { rateLimit } from "@/lib/rate-limit";
import {
  normaliseQuote,
  validateQuote,
  type QuoteFields,
  type QuoteResult,
} from "@/lib/quote";

/** Minimum time a human plausibly takes to fill the form, in milliseconds. */
const MIN_FILL_MS = 3000;

async function clientKey() {
  const list = await headers();
  // x-forwarded-for is a client-controllable header, so this is a spam
  // speed bump, not an identity check. The left-most entry is the closest
  // thing to the origin IP behind a single trusted proxy.
  const forwarded = list.get("x-forwarded-for");
  const ip =
    forwarded?.split(",")[0]?.trim() ||
    list.get("x-real-ip") ||
    "unknown";
  return `quote:${ip}`;
}

export async function submitQuote(fields: QuoteFields): Promise<QuoteResult> {
  // Honeypot: the field is hidden from real users, so anything in it is a bot.
  // Report success so the bot doesn't learn to work around the check.
  if (fields.company) return { ok: true };

  if (
    typeof fields.startedAt === "number" &&
    Date.now() - fields.startedAt < MIN_FILL_MS
  ) {
    return { ok: true };
  }

  const clean = normaliseQuote(fields);

  // The client validates for fast feedback; this is the run that counts.
  const errors = validateQuote(clean);
  if (Object.keys(errors).length > 0) {
    return { ok: false, reason: "validation", errors };
  }

  // Checked before rate limiting so an unconfigured deploy always falls back
  // to mailto instead of burning the visitor's quota on a no-op.
  if (resolveProvider() === "none") {
    return { ok: false, reason: "unconfigured" };
  }

  const { allowed } = rateLimit(await clientKey());
  if (!allowed) return { ok: false, reason: "rate-limited" };

  try {
    await deliverQuote(clean);
    return { ok: true };
  } catch (error) {
    // Log server-side; never leak provider internals to the browser.
    console.error("[quote] delivery failed:", error);
    return { ok: false, reason: "delivery" };
  }
}
