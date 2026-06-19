import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { encrypt, decrypt } from "@/lib/encryption";
import crypto from "crypto";
import twilio from "twilio";

const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: NextRequest) {
  try {
    let { accountId, name, phone, issue } = await req.json();

    // Basic sanitization
    name = name?.substring(0, 100).trim();
    phone = phone?.replace(/[^0-9+]/g, "").substring(0, 20);
    issue = issue?.substring(0, 1000).trim();

    if (!accountId || !name || !phone || !issue) {
      return NextResponse.json({ error: "Missing required form properties." }, { status: 400 });
    }

    // 1. Verify multi-tenant subscription check gate
    const account = await prisma.account.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      return NextResponse.json({ error: "Target business profile not found." }, { status: 404 });
    }

    if (!account.aiFrontDeskEnabled) {
      return NextResponse.json({ error: "AI FrontDesk Intake add-on is disabled for this account." }, { status: 403 });
    }

    // 2. Sandboxed Structured AI Blueprint Prompt Construction
    const prompt = `Analyze this customer residential repair emergency text and extract critical parameters.
CRITICAL RESTRICTION: You are strictly an administrative intake analyzer. You are barred from open conversation or pricing estimations.

Customer Input: """${issue.replace(/"""/g, "'''")}"""

Respond ONLY with a JSON object in this format:
{
  "issueSummary": "short concise technical summary",
  "urgencyRating": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
}`;

    const model = ai.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
      }
    });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const aiText = response.text();
    
    if (!aiText) throw new Error("Empty processing breakdown returned from AI engine core.");

    const parsedData = JSON.parse(aiText);

    // 3. Save directly to the persistence cabinet
    const newTicket = await prisma.intakeTicket.create({
      data: {
        accountId,
        customerName: name,
        customerPhone: encrypt(phone),
        emergencyIssue: issue,
        issueSummary: parsedData.issueSummary,
        computedUrgency: parsedData.urgencyRating,
        dispatchStatus: "PENDING",
      },
    });

    // Generate a cryptographically secure 16+ character random token
    const token = crypto.randomBytes(24).toString("hex"); // 48-character hex token
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

    // Save token in the LeadToken table
    await prisma.leadToken.create({
      data: {
        token,
        ticketId: newTicket.id,
        expiresAt,
      },
    });

    // Notify the business owner about the new lead
    const decryptedRealNumber = decrypt(account.realPhoneNumber);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const baseUrl = appUrl.replace(/\/$/, "");
    const leadLink = `${baseUrl}/leads?token=${token}`;
    const messageBody = `🚨 Bounce Back Alert: New Lead from ${name}. Tap the link to view details and reply instantly: ${leadLink}`;

    if (
      process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      !process.env.TWILIO_ACCOUNT_SID.includes("your_twilio")
    ) {
      try {
        const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
        const twilioFrom = account.assignedTwilioNum || process.env.TWILIO_PHONE_NUMBER;
        if (twilioFrom) {
          await client.messages.create({
            to: decryptedRealNumber,
            from: twilioFrom,
            body: messageBody,
          });
          console.log(`[Twilio SMS Notification] Sent lead alert to business owner at ${decryptedRealNumber}`);
        }
      } catch (smsErr: any) {
        console.error("[Twilio SMS Notification Error] Failed to send lead notification to business owner:", smsErr.message);
      }
    } else {
      console.log(`[Mock Twilio SMS Notification] Sent lead alert to business owner (${decryptedRealNumber}): ${messageBody}`);
    }

    return NextResponse.json({ success: true, ticketId: newTicket.id, token });
  } catch (error: any) {
    console.error("AI INTAKE FAULT ERROR:", error);
    return NextResponse.json({ error: "System failed to accurately classify dispatch parameters." }, { status: 500 });
  }
}
