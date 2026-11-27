"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { LIMITS, TRAP_FIELD, readFields, validate, type ContactState } from "@/lib/contact";

const OFFLINE = "The form is offline right now. Please email me directly instead.";

/**
 * A short, one-way hash of the visitor's IP address, so the database can rate-limit per visitor
 * without storing the address itself. On Vercel, x-forwarded-for is set by the platform. Null when
 * there's no address (e.g. local development); the database then skips the per-visitor check.
 */
async function senderHash(): Promise<string | null> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip")?.trim();
  if (!ip) return null;
  return createHash("sha256").update(`jeric-portfolio-contact:${ip}`).digest("hex").slice(0, 32);
}

/**
 * Saves a contact-form message to Supabase (table public.messages, insert-only for anon; see
 * supabase/messages.sql). Runs on the server only, so the publishable key never reaches the
 * browser and the spam checks below can't be skipped. Next.js also checks the request's Origin.
 */
export async function sendMessage(_prev: ContactState, form: FormData): Promise<ContactState> {
  const values = readFields(form);

  // Honeypot: people never see or fill this field. Pretend it worked; save nothing.
  const trap = form.get(TRAP_FIELD);
  if (typeof trap === "string" && trap.trim() !== "")
    return { status: "sent", name: values.name, email: values.email };

  // Too fast to be a person (the form records when it appeared). Advisory only: a send made
  // before the page's JavaScript loads (or without it) has no time, and is allowed through; the
  // database's rate limit is the real brake.
  const started = Number(form.get("started"));
  if (started > 0 && Date.now() - started < LIMITS.minFillMs)
    return {
      status: "error",
      message: "That was quick! Please wait a moment and send again.",
      values,
    };

  const fieldErrors = validate(values);
  if (Object.keys(fieldErrors).length) return { status: "error", fieldErrors, values };

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    console.error("Contact form: SUPABASE_URL or SUPABASE_PUBLISHABLE_KEY is not set.");
    return { status: "error", message: OFFLINE, values };
  }

  try {
    const res = await fetch(`${url.replace(/\/+$/, "")}/rest/v1/messages`, {
      method: "POST",
      headers: {
        apikey: key,
        "Content-Type": "application/json",
        // anon may insert but not read, so ask for no row back.
        Prefer: "return=minimal",
      },
      body: JSON.stringify({ ...values, sender_hash: await senderHash() }),
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) return { status: "sent", name: values.name, email: values.email };

    const body = await res.text();
    // The database's rate-limit trigger (raise exception 'rate_limited', P0001).
    if (body.includes("rate_limited"))
      return {
        status: "error",
        message: "Too many messages right now. Please try again later, or email me directly.",
        values,
      };
    console.error(`Contact form: Supabase insert failed (${res.status}): ${body.slice(0, 300)}`);
  } catch (err) {
    console.error("Contact form: Supabase request failed:", err);
  }
  return {
    status: "error",
    message: "Your message couldn't be sent. Please try again, or email me directly.",
    values,
  };
}
