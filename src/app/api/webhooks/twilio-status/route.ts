import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import twilio from "twilio";
import { encrypt } from "@/lib/encryption";

export const dynamic = "force-dynamic";

// Helper to check if Twilio is properly configured
const isTwilioConfigured = () => {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  return (
    sid &&
    token &&
    !sid.includes("your_twilio_account_sid_here") &&
    !token.includes("your_twilio_auth_token_here") &&
    sid.trim() !== "" &&
    token.trim() !== ""
  );
};

// Helper to fire Capacitor push notification telemetry
async function firePushNotification(account: any, callerNumber: string) {
  const payload = {
    title: "Call Rescued!",
    body: `Intercepted missed call from ${callerNumber} and auto-sent booking link.`,
    data: {
      accountId: account.id,
      callerNumber: callerNumber,
      timestamp: new Date().toISOString()
    }
  };

  console.log(`\n🔔 [Capacitor Push Notification Telemetry]`);
  console.log(`   - Target Device (Account: ${account.email})`);
  console.log(`   - Plugin: @capacitor/push-notifications`);
  console.log(`   - Payload Title: "${payload.title}"`);
  console.log(`   - Payload Body: "${payload.body}"\n`);

  const fcmServerKey = process.env.FCM_SERVER_KEY;
  if (fcmServerKey && fcmServerKey !== "your_fcm_server_key_here") {
    try {
      console.log(`[FCM Push Dispatch] Sending push notification via Firebase Cloud Messaging...`);
      await fetch(`https://fcm.googleapis.com/fcm/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `key=${fcmServerKey}`
        },
        body: JSON.stringify({
          to: "/topics/all",
          notification: {
            title: payload.title,
            body: payload.body,
            sound: "default"
          },
          data: payload.data
        })
      });
    } catch (pushErr: any) {
      console.error(`[FCM Push Dispatch Error] Failed to send FCM push:`, pushErr.message);
    }
  } else {
    console.log(`[Mock FCM Push] (FCM_SERVER_KEY not configured) Push notification telemetry successfully logged to console.`);
  }
}

export async function POST(req: Request) {
  // 1. Twilio Request Validation
  const signature = req.headers.get("x-twilio-signature") || "";
  const { searchParams: urlSearchParams } = new URL(req.url);
  const accountIdForValidation = urlSearchParams.get("accountId");
  const url = process.env.NEXT_PUBLIC_APP_URL + "/api/webhooks/twilio-status?accountId=" + accountIdForValidation;
  
  const authToken = process.env.TWILIO_AUTH_TOKEN || "";
  const isProduction = process.env.NODE_ENV === "production";

  if (isProduction && authToken && signature) {
    const clonedReq = req.clone();
    const formData = await clonedReq.formData();
    const params: Record<string, string> = {};
    formData.forEach((value, key) => {
      params[key] = value.toString();
    });

    const isValid = twilio.validateRequest(authToken, signature, url, params);
    if (!isValid) {
      console.error("[Twilio Status Webhook] Invalid signature. Access denied.");
      return new NextResponse("Invalid signature", { status: 403 });
    }
  }
  try {
    const { searchParams } = new URL(req.url);
    const accountId = searchParams.get("accountId");

    if (!accountId) {
      console.error("[Twilio Status Webhook] Missing accountId in status callback query");
      return new NextResponse(
        `<?xml version="1.0" encoding="UTF-8"?><Response />`,
        { headers: { "Content-Type": "application/xml" } }
      );
    }

    let from = "";
    let to = "";
    let dialCallStatus = "";
    let callStatus = "";

    // Parse parameters from POST form-urlencoded, searchParams, or JSON body
    try {
      const contentType = req.headers.get("content-type") || "";
      if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
        const formData = await req.formData();
        from = (formData.get("From") as string) || "";
        to = (formData.get("To") as string) || "";
        dialCallStatus = (formData.get("DialCallStatus") as string) || "";
        callStatus = (formData.get("CallStatus") as string) || "";
      } else if (contentType.includes("application/json")) {
        const body = await req.json();
        from = body.From || body.from || "";
        to = body.To || body.to || "";
        dialCallStatus = body.DialCallStatus || body.dialCallStatus || "";
        callStatus = body.CallStatus || body.callStatus || "";
      }
    } catch (err) {
      console.log("[Twilio Status Webhook] Parsing request body failed, using searchParams fallback");
    }

    // Fallback to query/search params
    from = from || searchParams.get("From") || searchParams.get("from") || "";
    to = to || searchParams.get("To") || searchParams.get("to") || "";
    dialCallStatus = dialCallStatus || searchParams.get("DialCallStatus") || searchParams.get("dialCallStatus") || "";
    callStatus = callStatus || searchParams.get("CallStatus") || searchParams.get("callStatus") || "";

    // The dial status of the outbound leg is our primary signal
    const finalStatus = (dialCallStatus || callStatus || "no-answer").toLowerCase();

    console.log(`[Twilio Status Webhook] Call segment finished. Account ID: ${accountId}. From: ${from}, To: ${to}, DialCallStatus: ${dialCallStatus}, CallStatus: ${callStatus} -> Final status interpreted as: ${finalStatus}`);

    // Lookup the account to get the business name, assigned Twilio number, and booking link
    const account = await prisma.account.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      console.error(`[Twilio Status Webhook] No account found for ID: ${accountId}`);
      return new NextResponse(
        `<?xml version="1.0" encoding="UTF-8"?><Response />`,
        { headers: { "Content-Type": "application/xml" } }
      );
    }

    // Check if the call was missed
    // A call is considered missed if DialCallStatus is not "completed" and not "answered"
    const wasMissed = finalStatus !== "completed" && finalStatus !== "answered";

    let smsSent = false;

    if (wasMissed) {
      console.log(`[Twilio Status Webhook] Missed call intercepted for ${account.businessName}! Triggering SMS back to caller: ${from}`);

      const messageBody = `Stop losing jobs to competitors for $29.99/mo`;

      if (isTwilioConfigured()) {
        try {
          const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
          // Use the account's assigned Twilio number, or fallback to the env variable if not set
          const twilioFrom = account.assignedTwilioNum || process.env.TWILIO_PHONE_NUMBER;

          if (twilioFrom) {
            await client.messages.create({
              to: from,
              from: twilioFrom,
              body: messageBody,
            });
            smsSent = true;
            console.log(`[Twilio SMS] Missed call text-back sent to ${from} from ${twilioFrom}`);
            // Fire push notification telemetry to device
            await firePushNotification(account, from);
          } else {
            console.warn("[Twilio SMS] No Twilio phone number available to send SMS from.");
          }
        } catch (smsErr: any) {
          console.error("[Twilio SMS Error] Failed to send SMS:", smsErr.message);
        }
      } else {
        console.log(`[Mock Twilio SMS] (Credentials not configured) Sending mock text-back to ${from} with booking link: ${account.bookingLink}`);
        smsSent = true; // Mark as true in mock mode to verify the successful recovery flow
        // Fire push notification telemetry to device
        await firePushNotification(account, from);
      }
    }

    // Log the call event in the CallLog table
    // A missed call saves $60 in revenue (if SMS was sent), whereas a completed call saves $0.
    const revenueSaved = wasMissed && smsSent ? 60.0 : 0.0;

    // Encrypt the caller's phone number before storing (PII protection)
    const encryptedCallerNumber = encrypt(from);

    await prisma.callLog.create({
      data: {
        accountId: account.id,
        callerNumber: encryptedCallerNumber,
        callStatus: finalStatus,
        smsSent: smsSent,
        revenueSavedEst: revenueSaved,
      },
    });

    console.log(`[Twilio Status Webhook] Logged CallLog entry. Account ID: ${account.id}, EncryptedCaller: yes, Status: ${finalStatus}, SMSSent: ${smsSent}, RevenueSaved: $${revenueSaved}`);

    // Return blank TwiML to end execution gracefully
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response></Response>`;

    return new NextResponse(twiml, {
      headers: {
        "Content-Type": "application/xml",
      },
    });
  } catch (error: any) {
    console.error("[Twilio Status Webhook Error] Fatal error:", error);
    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?><Response />`,
      { headers: { "Content-Type": "application/xml" } }
    );
  }
}

// Support GET for simple testing
export async function GET(req: Request) {
  return POST(req);
}
