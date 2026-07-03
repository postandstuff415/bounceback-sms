import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest } from "@/lib/auth";
import { submitTwilioA2pRegistration } from "@/lib/twilio-a2p";

export async function POST(req: Request) {
  try {
    // 1. Authenticate Request
    const session = authenticateRequest(req);
    if (!session) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const accountId = session.accountId;

    // 2. Parse and Validate Request Payload
    const body = await req.json();
    const {
      legalBusinessName,
      ein,
      businessType,
      industry,
      website,
      country,
      address,
      contactFirstName,
      contactLastName,
      contactEmail,
      contactPhone,
      campaignDescription,
      sampleMessage1,
      sampleMessage2,
    } = body;

    // Validate presence of required compliance fields
    const requiredFields = {
      legalBusinessName,
      ein,
      businessType,
      industry,
      website,
      country,
      address,
      contactFirstName,
      contactLastName,
      contactEmail,
      contactPhone,
      campaignDescription,
      sampleMessage1,
      sampleMessage2,
    };

    for (const [key, value] of Object.entries(requiredFields)) {
      if (!value || typeof value !== "string" || !value.trim()) {
        return NextResponse.json(
          { error: `Missing or invalid required compliance field: ${key}` },
          { status: 400 }
        );
      }
    }

    // 3. Save initial boilerplate/local registration to database (UPSERT pattern)
    // This allows re-submitting or correcting compliance details
    const registrationData = {
      legalBusinessName: legalBusinessName.trim(),
      ein: ein.trim(),
      businessType: businessType.trim(),
      industry: industry.trim(),
      website: website.trim(),
      country: country.trim(),
      address: address.trim(),
      contactFirstName: contactFirstName.trim(),
      contactLastName: contactLastName.trim(),
      contactEmail: contactEmail.trim(),
      contactPhone: contactPhone.trim(),
      campaignDescription: campaignDescription.trim(),
      sampleMessage1: sampleMessage1.trim(),
      sampleMessage2: sampleMessage2.trim(),
      status: "PENDING",
    };

    const localRegistration = await prisma.a2pRegistration.upsert({
      where: { accountId },
      create: {
        accountId,
        ...registrationData,
      },
      update: {
        ...registrationData,
      },
    });

    // 4. Submit to Twilio Trust Hub Service Layer
    const twilioResult = await submitTwilioA2pRegistration(accountId, {
      legalBusinessName: localRegistration.legalBusinessName,
      ein: localRegistration.ein,
      businessType: localRegistration.businessType,
      industry: localRegistration.industry,
      website: localRegistration.website,
      country: localRegistration.country,
      address: localRegistration.address,
      contactFirstName: localRegistration.contactFirstName,
      contactLastName: localRegistration.contactLastName,
      contactEmail: localRegistration.contactEmail,
      contactPhone: localRegistration.contactPhone,
      campaignDescription: localRegistration.campaignDescription,
      sampleMessage1: localRegistration.sampleMessage1,
      sampleMessage2: localRegistration.sampleMessage2,
    });

    if (!twilioResult.success) {
      return NextResponse.json(
        { error: twilioResult.message || "Failed to submit A2P details to messaging gateway." },
        { status: 500 }
      );
    }

    // 5. Update local database record with generated SIDs and vetting status from service
    const finalRegistration = await prisma.a2pRegistration.update({
      where: { accountId },
      data: {
        status: twilioResult.status,
        // SIDs or external tracking could be appended to details, notes, or columns if needed
      },
    });

    return NextResponse.json({
      success: true,
      registration: finalRegistration,
      brandSid: twilioResult.brandSid,
      campaignSid: twilioResult.campaignSid,
      trustBundleSid: twilioResult.trustBundleSid,
      message: twilioResult.message,
    });
  } catch (error: any) {
    console.error("[A2P Registration API Error]:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
