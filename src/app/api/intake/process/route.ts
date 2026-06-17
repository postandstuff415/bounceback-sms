import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GoogleGenerativeAI } from "@google/generative-ai";

const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: NextRequest) {
  try {
    const { accountId, name, phone, issue } = await req.json();

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

Customer Input: "${issue}"

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
        customerPhone: phone,
        emergencyIssue: issue,
        issueSummary: parsedData.issueSummary,
        computedUrgency: parsedData.urgencyRating,
        dispatchStatus: "PENDING",
      },
    });

    return NextResponse.json({ success: true, ticketId: newTicket.id });
  } catch (error: any) {
    console.error("AI INTAKE FAULT ERROR:", error);
    return NextResponse.json({ error: "System failed to accurately classify dispatch parameters." }, { status: 500 });
  }
}
