import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    let to = "";
    let from = "";
    let callSid = "";

    // Parse parameters from POST form-urlencoded, searchParams, or JSON body
    try {
      const contentType = req.headers.get("content-type") || "";
      if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
        const formData = await req.formData();
        to = (formData.get("To") as string) || "";
        from = (formData.get("From") as string) || "";
        callSid = (formData.get("CallSid") as string) || "";
      } else if (contentType.includes("application/json")) {
        const body = await req.json();
        to = body.To || body.to || "";
        from = body.From || body.from || "";
        callSid = body.CallSid || body.callSid || "";
      }
    } catch (err) {
      console.log("[Twilio Voice Webhook] Parsing request body failed, using searchParams fallback");
    }

    if (!to || !from) {
      const { searchParams } = new URL(req.url);
      to = to || searchParams.get("To") || searchParams.get("to") || "";
      from = from || searchParams.get("From") || searchParams.get("from") || "";
      callSid = callSid || searchParams.get("CallSid") || searchParams.get("callSid") || "";
    }

    console.log(`[Twilio Voice Webhook] Incoming call from ${from} to Twilio number ${to} (CallSid: ${callSid})`);

    if (!to) {
      return new NextResponse(
        `<?xml version="1.0" encoding="UTF-8"?><Response><Reject reason="busy" /></Response>`,
        { headers: { "Content-Type": "application/xml" } }
      );
    }

    // Lookup Account that has this assigned Twilio number
    // We try querying with/without '+' to be extremely safe
    const searchNumbers = [to];
    if (to.startsWith("+")) {
      searchNumbers.push(to.substring(1));
    } else {
      searchNumbers.push("+" + to);
    }

    const account = await prisma.account.findFirst({
      where: {
        assignedTwilioNum: {
          in: searchNumbers,
        },
      },
    });

    if (!account) {
      console.warn(`[Twilio Voice Webhook] No account found for assigned Twilio number: ${to}`);
      // Fallback: Reject the call with a busy signal
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Reject reason="busy" />
</Response>`;
      return new NextResponse(twiml, {
        headers: { "Content-Type": "application/xml" },
      });
    }

    console.log(`[Twilio Voice Webhook] Found Account ${account.id} (${account.businessName}) forwarding to real number: ${account.realPhoneNumber}`);

    // Return TwiML to Dial the user's real phone number
    // Configure action URL with account ID to track call status and trigger missed-call SMS text-backs
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial action="/api/webhooks/twilio-status?accountId=${account.id}" method="POST">
    ${account.realPhoneNumber}
  </Dial>
</Response>`;

    return new NextResponse(twiml, {
      headers: {
        "Content-Type": "application/xml",
      },
    });
  } catch (error: any) {
    console.error("[Twilio Voice Webhook Error] Fatal error:", error);
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Reject reason="busy" />
</Response>`;
    return new NextResponse(twiml, {
      headers: { "Content-Type": "application/xml" },
    });
  }
}

// Support GET for simple testing
export async function GET(req: Request) {
  return POST(req);
}
