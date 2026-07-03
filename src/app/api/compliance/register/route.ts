import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest } from "@/lib/auth";
import { registerA2PBrand } from "@/lib/twilio-a2p";

export const dynamic = "force-dynamic";

/**
 * Validates whether a given string is a correctly formatted, complete absolute URL.
 */
function isValidUrl(urlStr: string): boolean {
  try {
    const url = new URL(urlStr);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  try {
    // 1. Authenticate Request using standard Session validation
    const session = authenticateRequest(req);
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
    const termsOfServiceUrl = body.a2pTermsOfServiceUrl || body.termsOfServiceUrl;

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

    // Website validation (must be valid absolute URL format)
    if (!website || typeof website !== "string" || !website.trim() || !isValidUrl(website.trim())) {
      return NextResponse.json({ error: "A valid business website URL is required." }, { status: 400 });
    }

    // Privacy Policy and Terms of Service URLs validation
    if (!privacyPolicyUrl || typeof privacyPolicyUrl !== "string" || !privacyPolicyUrl.trim() || !isValidUrl(privacyPolicyUrl.trim())) {
      return NextResponse.json({ error: "A valid absolute Privacy Policy URL is required." }, { status: 400 });
    }

    if (!termsOfServiceUrl || typeof termsOfServiceUrl !== "string" || !termsOfServiceUrl.trim() || !isValidUrl(termsOfServiceUrl.trim())) {
      return NextResponse.json({ error: "A valid absolute Terms of Service URL is required." }, { status: 400 });
    }

    // 4. Update local Account database record, initializing status to 'pending'
    const updatedAccount = await prisma.account.update({
      where: { id: accountId },
      data: {
        a2pLegalBusinessName: legalBusinessName.trim(),
        a2pBusinessType: businessType.trim(),
        a2pEinOrTaxId: ein ? ein.trim() : null,
        a2pWebsiteUrl: website.trim(),
        a2pCampaignUseCase: campaignUseCase ? campaignUseCase.trim() : null,
        a2pSampleMessages: sampleMessages ? sampleMessages.trim() : null,
        a2pPrivacyPolicyUrl: privacyPolicyUrl.trim(),
        a2pTermsOfServiceUrl: termsOfServiceUrl.trim(),
        a2pRegistrationStatus: "pending",
      },
    });

    // 5. Trigger Twilio A2P Brand Registration Service
    try {
      const twilioResult = await registerA2PBrand(accountId, {
        legalName: legalBusinessName.trim(),
        businessType: businessType.trim(),
        ein: ein ? ein.trim() : "",
        websiteUrl: website.trim(),
        campaignUseCase: campaignUseCase ? campaignUseCase.trim() : "",
        sampleMessages: sampleMessages ? sampleMessages.trim() : "",
        privacyPolicyUrl: privacyPolicyUrl.trim(),
        termsOfServiceUrl: termsOfServiceUrl.trim(),
      });

      // Update local Account with generated SIDs on successful submit
      const finalAccount = await prisma.account.update({
        where: { id: accountId },
        data: {
          a2pRegistrationStatus: twilioResult.status || "pending",
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

    } catch (twilioError: any) {
      console.error("[POST /api/compliance/register] Twilio submission failed. Setting status to failed:", twilioError);

      // Handle errors gracefully by saving 'failed' status to DB and returning fallback data
      const failedAccount = await prisma.account.update({
        where: { id: accountId },
        data: {
          a2pRegistrationStatus: "failed",
        },
      });

      return NextResponse.json({
        success: false,
        error: "A2P compliance registration submission failed.",
        account: failedAccount,
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error("[POST /api/compliance/register] Internal Error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
