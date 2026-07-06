import twilio from "twilio";
import { prisma } from "@/lib/prisma";

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

export interface A2pRegistrationData {
  legalName: string;
  businessType: string;
  ein: string;
  websiteUrl: string;
  campaignUseCase: string;
  sampleMessages: string;
  privacyPolicyUrl: string;
  termsAndConditionsUrl: string; // Required by Twilio A2P 10DLC as of June 2026
}

export interface A2pBrandRegistrationData {
  legalName: string;
  businessType: string;
  ein: string;
  websiteUrl: string;
  campaignUseCase: string;
  sampleMessages: string;
  privacyPolicyUrl: string;
  termsOfServiceUrl: string;
}

export async function registerA2PBrand(
  accountId: string,
  data: A2pRegistrationData
) {
  console.log(`[Twilio A2P] Initiating 10DLC registration flow for Account: ${accountId}`);

  if (!isTwilioConfigured()) {
    console.error("[Twilio A2P] Missing or invalid Twilio credentials. Cannot proceed.");
    return {
      success: false,
      status: "FAILED",
      message: "Twilio credentials not configured."
    };
  }

  const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

  // 1. Customer Profile (Trust Bundle) creation
  console.log("[Twilio A2P] Step 1: Creating Customer Profile (Trust Bundle)...");
  let customerProfileSid = "BUXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX";
  try {
    const profile = await (client as any).trusthub.v1.trustProducts.create({
      friendlyName: `${data.legalName} Customer Profile`,
      email: "compliance@bouncebacksms.com",
      policySid: "RNdf18579912061415f333333333333333"
    });
    customerProfileSid = profile.sid;
    console.log(`[Twilio A2P] Customer Profile created successfully. SID: ${customerProfileSid}`);
  } catch (error: any) {
    console.error("[Twilio A2P] Customer Profile creation failed:", error);
    return {
      success: false,
      status: "FAILED",
      message: error.message || "Customer profile creation failed."
    };
  }

  // 2. Brand Registration
  console.log("[Twilio A2P] Step 2: Creating Brand Registration...");
  let brandSid = "";
  try {
    const brand = await (client as any).messaging.v1.brandRegistrations.create({
      customerProfileBundleSid: customerProfileSid,
      a2PProfileBundleSid: customerProfileSid,
      businessName: data.legalName,
      website: data.websiteUrl,
      privacyPolicyUrl: data.privacyPolicyUrl,
      termsOfServiceUrl: data.termsAndConditionsUrl
    });
    brandSid = brand.sid;
    console.log(`[Twilio A2P] Brand Registration created successfully. SID: ${brandSid}`);
  } catch (error: any) {
    console.error("[Twilio A2P] Brand Registration failed:", error);
    return {
      success: false,
      status: "FAILED",
      message: error.message || "Brand registration failed."
    };
  }

  // 3. Campaign Creation
  console.log("[Twilio A2P] Step 3: Creating Campaign...");
  let campaignSid = "";
  try {
    const campaign = await (client as any).messaging.v1.campaigns.create({
      brandSid: brandSid,
      useCase: data.campaignUseCase,
      sampleMessages: [data.sampleMessages]
    });
    campaignSid = campaign.sid;
    console.log(`[Twilio A2P] Campaign created successfully. SID: ${campaignSid}`);
  } catch (error: any) {
    console.error("[Twilio A2P] Campaign creation failed:", error);
    return {
      success: false,
      status: "FAILED",
      message: error.message || "Campaign creation failed."
    };
  }

  return {
    success: true,
    brandSid,
    campaignSid,
    status: "PENDING",
    message: "A2P 10DLC Brand and Campaign registration submitted successfully."
  };
}

export async function getRegistrationStatus(accountId: string): Promise<string> {
  const account = await prisma.account.findUnique({
    where: { id: accountId },
    select: {
      a2pRegistrationStatus: true,
    },
  });

  return account?.a2pRegistrationStatus || "unregistered";
}
