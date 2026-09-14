import { NextResponse } from "next/server";
import twilio from "twilio";
import { prisma } from "@/lib/prisma";
import { decrypt, encrypt, hashPhone, normalizePhone } from "@/lib/encryption";

export const dynamic = "force-dynamic";

const EMPTY_TWIML = `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`;

const xml = (body: string = EMPTY_TWIML) =>
  new NextResponse(body, { headers: { "Content-Type": "application/xml" } });

// Carrier-mandated keywords. Twilio's Advanced Opt-Out also intercepts these at
// the account level, but we mirror the state so we never queue a message that
// the carrier would reject (error 21610).
const STOP_WORDS = new Set([
  "stop", "stopall", "unsubscribe", "cancel", "end", "quit", "revoke", "optout",
]);
const HELP_WORDS = new Set(["help", "info"]);

const isTwilioConfigured = () => {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  return Boolean(
    sid && token && !sid.includes("your_twilio") && sid.trim() && token.trim()
  );
};

/** Last 4 digits, used as the human-facing handle for a thread. */
const last4 = (num: string) => normalizePhone(num).slice(-4);

export async function POST(req: Request) {
  // ---------------------------------------------------------------------------
  // 1. Authenticate the request as genuinely from Twilio.
  // ---------------------------------------------------------------------------
  const signature = req.headers.get("x-twilio-signature") || "";
  const authToken = process.env.TWILIO_AUTH_TOKEN || "";
  const isProduction = process.env.NODE_ENV === "production";
  const url = process.env.NEXT_PUBLIC_APP_URL + "/api/webhooks/twilio-sms";

  let params: Record<string, string> = {};
  try {
    const formData = await req.clone().formData();
    formData.forEach((value, key) => {
      params[key] = value.toString();
    });
  } catch {
    try {
      params = (await req.clone().json()) as Record<string, string>;
    } catch {
      const { searchParams } = new URL(req.url);
      searchParams.forEach((value, key) => {
        params[key] = value;
      });
    }
  }

  if (isProduction && authToken && signature) {
    if (!twilio.validateRequest(authToken, signature, url, params)) {
      console.error("[Twilio SMS Webhook] Invalid signature. Access denied.");
      return new NextResponse("Invalid signature", { status: 403 });
    }
  }

  try {
    const from = normalizePhone(params.From || params.from || "");
    const to = normalizePhone(params.To || params.to || "");
    const body = (params.Body || params.body || "").trim();

    if (!from || !to) {
      console.warn("[Twilio SMS Webhook] Missing From/To on inbound message.");
      return xml();
    }

    // -------------------------------------------------------------------------
    // 2. Resolve which contractor owns the Twilio number that was texted.
    // -------------------------------------------------------------------------
    const account = await prisma.account.findFirst({
      where: { assignedTwilioNum: { in: [to, to.replace(/^\+/, "")] } },
    });

    if (!account) {
      console.warn(`[Twilio SMS Webhook] No account owns Twilio number ${to}`);
      return xml();
    }

    if (!isTwilioConfigured()) {
      console.log(`[Mock Twilio SMS Webhook] Inbound from ${from} to ${to}: "${body}"`);
      return xml();
    }

    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    const contractorNumber = normalizePhone(decrypt(account.realPhoneNumber));
    const isFromContractor = Boolean(contractorNumber) && from === contractorNumber;

    // =========================================================================
    // CASE A — the contractor is replying. Route it back to a lead.
    // =========================================================================
    if (isFromContractor) {
      // An explicit "#1234 message" prefix targets a specific thread; a bare
      // reply goes to whoever texted most recently.
      const targeted = body.match(/^#(\d{4})\s+([\s\S]+)$/);
      const outboundBody = targeted ? targeted[2].trim() : body;

      if (!outboundBody) return xml();

      const threads = await prisma.smsConversation.findMany({
        where: { accountId: account.id, optedOut: false },
        orderBy: { lastInboundAt: "desc" },
        take: 20,
      });

      if (threads.length === 0) {
        await client.messages.create({
          to: contractorNumber,
          from: to,
          body: "No active conversations yet. When a customer texts you, reply here and it goes straight back to them.",
        });
        return xml();
      }

      let thread = threads[0];
      if (targeted) {
        const match = threads.find(
          (t) => last4(decrypt(t.leadNumber)) === targeted[1]
        );
        if (!match) {
          await client.messages.create({
            to: contractorNumber,
            from: to,
            body: `No recent conversation ending in ${targeted[1]}. Reply without the #code to answer your most recent customer.`,
          });
          return xml();
        }
        thread = match;
      }

      const leadNumber = normalizePhone(decrypt(thread.leadNumber));

      try {
        await client.messages.create({ to: leadNumber, from: to, body: outboundBody });
        await prisma.smsConversation.update({
          where: { id: thread.id },
          data: { lastRelayedAt: new Date() },
        });
        console.log(
          `[Twilio SMS Relay] Contractor reply routed to lead ...${last4(leadNumber)} for account ${account.id}`
        );
      } catch (err: any) {
        // 21610 = recipient has opted out at the carrier level.
        if (err?.code === 21610) {
          await prisma.smsConversation.update({
            where: { id: thread.id },
            data: { optedOut: true },
          });
          await client.messages.create({
            to: contractorNumber,
            from: to,
            body: `That customer (...${last4(leadNumber)}) has opted out of texts, so your message wasn't delivered.`,
          });
        } else {
          console.error("[Twilio SMS Relay Error] Reply to lead failed:", err?.message);
        }
      }

      return xml();
    }

    // =========================================================================
    // CASE B — a lead is texting in. Record the thread, relay to the mobile.
    // =========================================================================
    const leadHash = hashPhone(from);
    const keyword = body.toLowerCase().replace(/[^a-z]/g, "");

    const thread = await prisma.smsConversation.upsert({
      where: { accountId_leadNumberHash: { accountId: account.id, leadNumberHash: leadHash } },
      create: {
        accountId: account.id,
        leadNumber: encrypt(from),
        leadNumberHash: leadHash,
        lastInboundAt: new Date(),
      },
      update: { lastInboundAt: new Date() },
    });

    // Opt-out / opt-in bookkeeping. Twilio auto-responds to STOP and HELP, so we
    // only track state and never send our own message to an opted-out number.
    if (STOP_WORDS.has(keyword)) {
      await prisma.smsConversation.update({
        where: { id: thread.id },
        data: { optedOut: true },
      });
      console.log(`[Twilio SMS Webhook] Lead ...${last4(from)} opted out of account ${account.id}`);
      return xml();
    }
    if (HELP_WORDS.has(keyword)) {
      return xml(); // Twilio's Advanced Opt-Out serves the compliant HELP reply.
    }
    if (thread.optedOut) {
      // Texting again after STOP is an implicit opt back in.
      await prisma.smsConversation.update({
        where: { id: thread.id },
        data: { optedOut: false },
      });
    }

    if (!contractorNumber) {
      console.error(`[Twilio SMS Webhook] Account ${account.id} has no usable real phone number.`);
      return xml();
    }

    // Belt-and-braces against a relay loop: if the stored contractor number ever
    // fails to match the sender (bad data, changed number), never echo a message
    // back to its own origin.
    if (contractorNumber === from) {
      console.error(`[Twilio SMS Webhook] Refusing to relay a message to its own sender (${from}).`);
      return xml();
    }

    const relayBody =
      `📩 ${from}: ${body}\n` +
      `— Reply to answer. Another customer: start with #${last4(from)}`;

    try {
      await client.messages.create({ to: contractorNumber, from: to, body: relayBody });
      await prisma.smsConversation.update({
        where: { id: thread.id },
        data: { lastRelayedAt: new Date() },
      });
      console.log(
        `[Twilio SMS Relay] Lead ...${last4(from)} relayed to contractor for account ${account.id}`
      );
    } catch (err: any) {
      console.error("[Twilio SMS Relay Error] Relay to contractor failed:", err?.message);
    }

    return xml();
  } catch (error: any) {
    console.error("[Twilio SMS Webhook Error] Fatal error:", error);
    return xml();
  }
}

// Support GET for simple testing
export async function GET(req: Request) {
  return POST(req);
}
