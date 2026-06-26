/**
 * Lightweight email sender built on the Resend REST API (no SDK dependency).
 *
 * If RESEND_API_KEY is missing or a placeholder, falls back to logging the
 * message to the server console — so local/staging works before the live key
 * is wired in.
 */

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

interface SendResult {
  ok: boolean;
  id?: string;
  error?: string;
}

const DEFAULT_FROM = "BounceBack SMS <login@bouncebacksms.com>";

function isResendConfigured(): boolean {
  const key = process.env.RESEND_API_KEY;
  return !!key && key.trim() !== "" && !key.includes("your_");
}

export async function sendEmail({ to, subject, html, text }: SendEmailParams): Promise<SendResult> {
  const from = process.env.RESEND_FROM || DEFAULT_FROM;

  if (!isResendConfigured()) {
    // Dev fallback — surface the content in logs instead of sending.
    console.log(
      `\n[Email:DEV] (RESEND_API_KEY not set — not actually sent)\n  To:      ${to}\n  Subject: ${subject}\n  Body:\n${text || html}\n`
    );
    return { ok: true, id: "dev-console" };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to, subject, html, text }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error("[Email] Resend API error:", res.status, body);
      return { ok: false, error: `Resend responded ${res.status}` };
    }

    const data = await res.json();
    return { ok: true, id: data.id };
  } catch (err: any) {
    console.error("[Email] Send failed:", err?.message || err);
    return { ok: false, error: err?.message || "send failed" };
  }
}

/**
 * Send a passwordless "magic link" sign-in email.
 */
export async function sendMagicLink(to: string, link: string): Promise<SendResult> {
  const subject = "Your BounceBack SMS sign-in link";
  const text =
    `Sign in to BounceBack SMS by opening this link:\n\n${link}\n\n` +
    `This link expires in 15 minutes and can only be used once. ` +
    `If you didn't request it, you can safely ignore this email.`;

  const html = `
  <div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#0f172a;border-radius:16px;color:#e2e8f0;">
    <h1 style="font-size:20px;font-weight:800;color:#ffffff;margin:0 0 16px;">Sign in to BounceBack SMS</h1>
    <p style="font-size:14px;line-height:1.6;color:#cbd5e1;margin:0 0 24px;">
      Click the button below to securely sign in. This link expires in 15 minutes and can only be used once.
    </p>
    <a href="${link}" style="display:inline-block;background:#10b981;color:#0f172a;font-weight:800;text-decoration:none;padding:14px 28px;border-radius:12px;font-size:15px;">
      Sign in &rarr;
    </a>
    <p style="font-size:12px;line-height:1.6;color:#64748b;margin:24px 0 0;">
      If the button doesn't work, paste this URL into your browser:<br>
      <span style="color:#94a3b8;word-break:break-all;">${link}</span>
    </p>
    <p style="font-size:12px;color:#64748b;margin:16px 0 0;">
      If you didn't request this, you can safely ignore this email.
    </p>
  </div>`;

  return sendEmail({ to, subject, html, text });
}
