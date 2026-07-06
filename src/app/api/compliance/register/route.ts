import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest } from "@/lib/auth";
import { registerA2PBrand } from "@/lib/twilio-a2p";

export const dynamic = "force-dynamic";

/**
 * Validates whether a given string is a correctly formatted HTTPS URL.
 */
function isValidHttpsUrl(urlStr: string): boolean {
  try {
    const url = new URL(urlStr);
    return url.protocol === "https:";
  } catch {
    return false;
  }
}

export async function GET(req: Request) {
  try {
    const session = await authenticateRequest(req);
    if (!session) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const accountId = session.accountId;

    const registration = await prisma.a2pRegistration.findUnique({
      where: { accountId: accountId },
    });

    if (!registration) {
      return NextResponse.json({ status: "UNREGISTERED" });
    }

    return NextResponse.json({
      status: registration.status,
      registration,
    });
  } catch (error: any) {
    console.error("[GET /api/compliance/register] Error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    // 1. Authenticate Request using standard Session validation
    const session = await authenticateRequest(req);
    if (!session) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const accountId = session.accountId;

    // 2. Parse payload and support multiple potential input field mappings
    const body = await req.json();

    const legalBusinessName = body.a2pLegalBusinessName || body.legalBusinessName;
    const businessType = body.a2pBusinessType || body.businessType;
    const ein = body.a2pEinOrTaxId || body.ein;
    const website = body.a2pWebsiteUrl || body.website;
    const campaignUseCase = body.a2pCampaignUseCase || body.campaignUseCase || body.campaignDescription;
    const sampleMessages = body.a2pSampleMessages || body.sampleMessages || [body.sampleMessage1, body.sampleMessage2].filter(Boolean).join("\n\n");
    const privacyPolicyUrl = body.a2pPrivacyPolicyUrl || body.privacyPolicyUrl;
    const termsAndConditionsUrl = body.a2pTermsAndConditionsUrl || body.termsAndConditionsUrl || body.termsOfServiceUrl;

    // 3. Field validation
    if (!legalBusinessName || typeof legalBusinessName !== "string" || !legalBusinessName.trim()) {
      return NextResponse.json({ error: "Legal business name is required." }, { status: 400 });
    }

    if (!businessType || typeof businessType !== "string" || !businessType.trim()) {
      return NextResponse.json({ error: "Business type is required." }, { status: 400 });
    }

    // EIN/Tax ID is mandatory for all non-Sole Proprietorships
    const isSoleProp = businessType.trim().toLowerCase() === "sole proprietorship";
    if (!isSoleProp) {
      if (!ein || typeof ein !== "string" || !ein.trim()) {
        return NextResponse.json(
          { error: `EIN/Tax ID is required for business type: ${businessType}` },
          { status: 400 }
        );
      }
    }

    // Website validation (must start with https://)
    if (!website || typeof website !== "string" || !website.trim() || !isValidHttpsUrl(website.trim())) {
      return NextResponse.json({ error: "A valid business website URL starting with https:// is required." }, { status: 400 });
    }

    // Privacy Policy and Terms and Conditions validation (must start with https://)
    if (!privacyPolicyUrl || typeof privacyPolicyUrl !== "string" || !privacyPolicyUrl.trim() || !isValidHttpsUrl(privacyPolicyUrl.trim())) {
      return NextResponse.json({ error: "A valid Privacy Policy URL starting with https:// is required." }, { status: 400 });
    }

    if (!termsAndConditionsUrl || typeof termsAndConditionsUrl !== "string" || !termsAndConditionsUrl.trim() || !isValidHttpsUrl(termsAndConditionsUrl.trim())) {
      return NextResponse.json({ error: "A valid Terms and Conditions URL starting with https:// is required." }, { status: 400 });
    }

    // 4. Upsert into A2pRegistration model
    await prisma.a2pRegistration.upsert({
      where: { accountId: accountId },
      update: {
        legalBusinessName: legalBusinessName.trim(),
        businessType: businessType.trim(),
        ein: ein ? ein.trim() : "",
        website: website.trim(),
        campaignDescription: campaignUseCase ? campaignUseCase.trim() : "",
        sampleMessage1: sampleMessages.trim(),
        sampleMessage2: "",
        privacyPolicyUrl: privacyPolicyUrl.trim(),
        termsAndConditionsUrl: termsAndConditionsUrl.trim(),
        status: "PENDING",
      },
      create: {
        accountId: accountId,
        legalBusinessName: legalBusinessName.trim(),
        businessType: businessType.trim(),
        ein: ein ? ein.trim() : "",
        website: website.trim(),
        industry: "Technology",
        country: "US",
        address: "123 Main St",
        contactFirstName: "John",
        contactLastName: "Doe",
        contactEmail: "john@example.com",
        contactPhone: "+15555555555",
        campaignDescription: campaignUseCase ? campaignUseCase.trim() : "",
        sampleMessage1: sampleMessages.trim(),
        sampleMessage2: "",
        privacyPolicyUrl: privacyPolicyUrl.trim(),
        termsAndConditionsUrl: termsAndConditionsUrl.trim(),
        status: "PENDING",
      },
    });

    // Also update Account table for compatibility/fallback
    await prisma.account.update({
      where: { id: accountId },
      data: {
        a2pLegalBusinessName: legalBusinessName.trim(),
        a2pBusinessType: businessType.trim(),
        a2pEinOrTaxId: ein ? ein.trim() : null,
        a2pWebsiteUrl: website.trim(),
        a2pCampaignUseCase: campaignUseCase ? campaignUseCase.trim() : null,
        a2pSampleMessages: sampleMessages ? sampleMessages.trim() : null,
        a2pPrivacyPolicyUrl: privacyPolicyUrl.trim(),
        a2pTermsOfServiceUrl: termsAndConditionsUrl.trim(),
        a2pRegistrationStatus: "pending",
      },
    });

    // 5. Trigger Twilio A2P Brand Registration Service
    const twilioResult = await registerA2PBrand(accountId, {
      legalName: legalBusinessName.trim(),
      businessType: businessType.trim(),
      ein: ein ? ein.trim() : "",
      websiteUrl: website.trim(),
      campaignUseCase: campaignUseCase ? campaignUseCase.trim() : "",
      sampleMessages: sampleMessages ? sampleMessages.trim() : "",
      privacyPolicyUrl: privacyPolicyUrl.trim(),
      termsAndConditionsUrl: termsAndConditionsUrl.trim(),
    });

    if (!twilioResult.success) {
      // Handle failure gracefully
      await prisma.a2pRegistration.update({
        where: { accountId: accountId },
        data: { status: "FAILED" },
      });
      await prisma.account.update({
        where: { id: accountId },
        data: { a2pRegistrationStatus: "failed" },
      });

      return NextResponse.json({
        success: false,
        error: twilioResult.message || "Twilio compliance registration failed.",
      }, { status: 500 });
    }

    // Update both tables with success and SIDs
    await prisma.a2pRegistration.update({
      where: { accountId: accountId },
      data: { status: twilioResult.status || "PENDING" },
    });

    const finalAccount = await prisma.account.update({
      where: { id: accountId },
      data: {
        a2pRegistrationStatus: twilioResult.status?.toLowerCase() || "pending",
        a2pTwilioBrandSid: twilioResult.brandSid,
        a2pTwilioCampaignSid: twilioResult.campaignSid,
      },
    });

    return NextResponse.json({
      success: true,
      account: finalAccount,
      brandSid: twilioResult.brandSid,
      campaignSid: twilioResult.campaignSid,
    });

  } catch (error: any) {
    console.error("[POST /api/compliance/register] Internal Error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}