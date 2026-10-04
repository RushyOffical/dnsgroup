/**
 * Quote submission. Runs in the browser.
 *
 * The site is a static export, so there is no server of ours to post to.
 * Delivery goes straight to Web3Forms, which emails the enquiry on. Its access
 * key is designed to sit in client-side code, so it is a build-time public
 * variable rather than a secret.
 *
 * With no key configured the result is `unconfigured` and the form falls back
 * to opening the visitor's mail client — so a fresh deploy is never a dead end.
 */

import {
  formatQuoteBody,
  formatQuoteSubject,
  normaliseQuote,
  validateQuote,
  type QuoteFields,
  type QuoteResult,
} from "@/lib/quote";
import { group } from "@/content/site";

/** Minimum time a human plausibly takes to fill the form, in milliseconds. */
const MIN_FILL_MS = 3000;

const ENDPOINT = "https://api.web3forms.com/submit";

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
  const errors = validateQuote(clean);
  if (Object.keys(errors).length > 0) {
    return { ok: false, reason: "validation", errors };
  }

  const accessKey = process.env.NEXT_PUBLIC_WEB3FORMS_KEY;
  if (!accessKey) return { ok: false, reason: "unconfigured" };

  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      access_key: accessKey,
      subject: formatQuoteSubject(clean),
      from_name: `${group.name} website`,
      // So hitting reply in the inbox goes to the customer.
      replyto: clean.email,
      message: formatQuoteBody(clean),
    }),
  });

  const data = (await response.json().catch(() => null)) as
    | { success?: boolean }
    | null;

  return response.ok && data?.success
    ? { ok: true }
    : { ok: false, reason: "delivery" };
}
