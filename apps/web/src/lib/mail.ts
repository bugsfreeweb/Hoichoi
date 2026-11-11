import "server-only";

import nodemailer, { type Transporter } from "nodemailer";

/**
 * Outbound email.
 *
 * Two transports, chosen by what the deployment has configured:
 *
 *  - `RESEND_API_KEY` — one HTTPS call, works on serverless runtimes that block
 *    outbound SMTP (Vercel does). Preferred in production.
 *  - `SMTP_URL` — classic SMTP (e.g. `smtp://user:pass@smtp.example.com:587`),
 *    used by self-hosted installs and the desktop runner.
 *
 * When neither is set, `sendMail` reports `configured: false` instead of
 * throwing. Reset links then still work in development: the caller logs the URL
 * and shows it to a signed-in admin, so you are never locked out of a fresh
 * install just because mail is not wired up yet.
 */

export interface MailConfig {
  configured: boolean;
  transport: "resend" | "smtp" | "none";
  from: string;
  /** Human-readable reason when mail is unavailable. */
  reason?: string;
}

export interface SendMailInput {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface SendMailResult {
  ok: boolean;
  transport: MailConfig["transport"];
  error?: string;
}

const DEFAULT_FROM = "হৈচৈ <no-reply@hoichoifeed.vercel.app>";

export function mailConfig(): MailConfig {
  const from = process.env.MAIL_FROM?.trim() || DEFAULT_FROM;
  if (process.env.RESEND_API_KEY?.trim()) {
    return { configured: true, transport: "resend", from };
  }
  if (process.env.SMTP_URL?.trim()) {
    return { configured: true, transport: "smtp", from };
  }
  return {
    configured: false,
    transport: "none",
    from,
    reason:
      "RESEND_API_KEY বা SMTP_URL কোনোটিই সেট করা নেই। ইমেইল পাঠাতে একটির প্রয়োজন।",
  };
}

let smtpTransport: Transporter | null = null;

function smtp(): Transporter {
  if (!smtpTransport) {
    smtpTransport = nodemailer.createTransport(process.env.SMTP_URL ?? "");
  }
  return smtpTransport;
}

export async function sendMail(input: SendMailInput): Promise<SendMailResult> {
  const cfg = mailConfig();
  if (!cfg.configured || !input.to) {
    return { ok: false, transport: cfg.transport, error: cfg.reason ?? "ইমেইল কনফিগার করা নেই।" };
  }

  try {
    if (cfg.transport === "resend") {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: cfg.from,
          to: [input.to],
          subject: input.subject,
          text: input.text,
          html: input.html ?? undefined,
        }),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        return {
          ok: false,
          transport: "resend",
          error: `Resend ${res.status}: ${body.slice(0, 300) || "no body"}`,
        };
      }
      return { ok: true, transport: "resend" };
    }

    await smtp().sendMail({
      from: cfg.from,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
    });
    return { ok: true, transport: "smtp" };
  } catch (error) {
    return {
      ok: false,
      transport: cfg.transport,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/** Base URL for links in mail. Explicit env wins so preview deployments are not used. */
export function siteBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  if (explicit) return explicit;
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercel) return `https://${vercel.replace(/^https?:\/\//, "")}`;
  return "http://localhost:3070";
}

/** Plain-text + HTML pair shared by all reset and code emails. */
export function messageShell(heading: string, body: string, link: string, cta: string) {
  const text = `${heading}\n\n${body}\n\n${cta}: ${link}\n\nএই লিংক ৬০ মিনিট পর্যন্ত কার্যকর। আপনি অনুরোধ না করলে এটি উপেক্ষা করুন — আপনার পাসওয়ার্ড বদলাবে না।`;
  const html = `<!doctype html><html lang="bn"><body style="margin:0;background:#f3eee1;font-family:system-ui,'Segoe UI',sans-serif;color:#1a140d">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:28px 12px">
    <table role="presentation" width="100%" style="max-width:520px;background:#fffdf7;border:1px solid #d9d1bf">
      <tr><td style="padding:22px 24px 0">
        <p style="margin:0;font-size:10px;letter-spacing:.22em;text-transform:uppercase;color:#d2202c">হৈচৈ · SECURITY</p>
        <h1 style="margin:8px 0 0;font-size:22px;line-height:1.3">${heading}</h1>
      </td></tr>
      <tr><td style="padding:12px 24px 0;font-size:14px;line-height:1.65;color:#4b4436">${body}</td></tr>
      <tr><td style="padding:20px 24px 0">
        <a href="${link}" style="display:inline-block;background:#d2202c;color:#fff;text-decoration:none;padding:11px 20px;font-size:13px;font-weight:700">${cta}</a>
      </td></tr>
      <tr><td style="padding:16px 24px 22px;font-size:11px;line-height:1.6;color:#7a7161">
        লিংক কাজ না করলে কপি করুন:<br><span style="color:#4b4436;word-break:break-all">${link}</span><br><br>
        এই লিংক ৬০ মিনিট পর্যন্ত কার্যকর। আপনি অনুরোধ না করলে এটি উপেক্ষা করুন — আপনার পাসওয়ার্ড বদলাবে না।
      </td></tr>
    </table>
  </td></tr></table></body></html>`;
  return { text, html };
}
