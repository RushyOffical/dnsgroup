/**
 * Quote delivery. Server-only — never import this from a client component.
 *
 * The provider is inferred from whichever environment variables are present,
 * so deploying with no configuration is a supported state: the action reports
 * `unconfigured` and the form falls back to opening the visitor's mail client,
 * exactly as it did before a backend existed. Nothing is silently dropped.
 *
 * Set QUOTE_PROVIDER to force one explicitly.
 */

import {
  formatQuoteBody,
  formatQuoteSubject,
  type QuoteFields,
} from "@/lib/quote";

export type Provider = "resend" | "webhook" | "console" | "none";

export function resolveProvider(): Provider {
  const forced = process.env.QUOTE_PROVIDER as Provider | undefined;
  if (forced && ["resend", "webhook", "console", "none"].includes(forced)) {
    return forced;
  }
  if (process.env.RESEND_API_KEY && process.env.QUOTE_TO_EMAIL) return "resend";
  if (process.env.QUOTE_WEBHOOK_URL) return "webhook";
  // In development, log rather than pretending delivery is configured.
  if (process.env.NODE_ENV !== "production") return "console";
  return "none";
}

async function deliverViaResend(fields: QuoteFields) {
  const to = process.env.QUOTE_TO_EMAIL;
  // Resend requires a verified sending domain; onboarding@resend.dev works
  // for testing before one is set up.
  const from = process.env.QUOTE_FROM_EMAIL ?? "onboarding@resend.dev";
  if (!to) throw new Error("QUOTE_TO_EMAIL is not set");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      // So hitting reply in the inbox goes to the customer, not to us.
      reply_to: fields.email,
      subject: formatQuoteSubject(fields),
      text: formatQuoteBody(fields),
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Resend responded ${response.status}: ${detail.slice(0, 300)}`);
  }
}

async function deliverViaWebhook(fields: QuoteFields) {
  const url = process.env.QUOTE_WEBHOOK_URL;
  if (!url) throw new Error("QUOTE_WEBHOOK_URL is not set");

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(process.env.QUOTE_WEBHOOK_SECRET
        ? { "X-Webhook-Secret": process.env.QUOTE_WEBHOOK_SECRET }
        : {}),
    },
    body: JSON.stringify({
      subject: formatQuoteSubject(fields),
      submittedAt: new Date().toISOString(),
      ...fields,
    }),
  });

  if (!response.ok) {
    throw new Error(`Webhook responded ${response.status}`);
  }
}

export async function deliverQuote(fields: QuoteFields): Promise<void> {
  switch (resolveProvider()) {
    case "resend":
      return deliverViaResend(fields);
    case "webhook":
      return deliverViaWebhook(fields);
    case "console":
      console.info(
        `[quote] ${formatQuoteSubject(fields)}\n${formatQuoteBody(fields)}`,
      );
      return;
    case "none":
      throw new Error("unconfigured");
  }
}
