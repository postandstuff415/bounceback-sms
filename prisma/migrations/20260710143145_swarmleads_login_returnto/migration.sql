-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPERADMIN', 'AGENCY', 'USER');

-- CreateEnum
CREATE TYPE "SwarmleadsOutreachStatus" AS ENUM ('QUEUED', 'SENT', 'FAILED');

-- CreateEnum
CREATE TYPE "UrgencyLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "DispatchStatus" AS ENUM ('PENDING', 'SYNCED', 'FAILED');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'QUOTED', 'BOOKED', 'LOST');

-- CreateEnum
CREATE TYPE "EmailStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "realPhoneNumber" TEXT NOT NULL,
    "assignedTwilioNum" TEXT,
    "bookingLink" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "stripeCustomerId" TEXT,
    "stripePriceId" TEXT,
    "subscriptionStatus" TEXT NOT NULL DEFAULT 'inactive',
    "agencyId" TEXT,
    "aiFrontDeskEnabled" BOOLEAN NOT NULL DEFAULT false,
    "aiFrontDeskPriceMonthly" DOUBLE PRECISION NOT NULL DEFAULT 29.99,
    "swarmleadsAddonActive" BOOLEAN NOT NULL DEFAULT false,
    "swarmleadsAddonSince" TIMESTAMP(3),
    "customLogoUrl" TEXT,
    "customBrandColor" TEXT,
    "smsTemplate" TEXT DEFAULT 'Hi, we missed your call. Here is our booking link to secure your spot: {booking_link}',
    "privacyAccepted" BOOLEAN NOT NULL DEFAULT false,
    "privacyAcceptedAt" TIMESTAMP(3),
    "privacyPolicyVersion" TEXT,
    "termsAccepted" BOOLEAN NOT NULL DEFAULT false,
    "termsAcceptedAt" TIMESTAMP(3),
    "termsVersion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "a2pLegalBusinessName" TEXT,
    "a2pBusinessType" TEXT,
    "a2pEinOrTaxId" TEXT,
    "a2pWebsiteUrl" TEXT,
    "a2pCampaignUseCase" TEXT,
    "a2pSampleMessages" TEXT,
    "a2pRegistrationStatus" TEXT DEFAULT 'unregistered',
    "a2pTwilioBrandSid" TEXT,
    "a2pTwilioCampaignSid" TEXT,
    "a2pPrivacyPolicyUrl" TEXT,
    "a2pTermsOfServiceUrl" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SwarmleadsOutreach" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "businessName" TEXT,
    "metadata" JSONB,
    "status" "SwarmleadsOutreachStatus" NOT NULL DEFAULT 'QUEUED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SwarmleadsOutreach_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CallLog" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "callerNumber" TEXT NOT NULL,
    "callStatus" TEXT NOT NULL,
    "smsSent" BOOLEAN NOT NULL DEFAULT false,
    "revenueSavedEst" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CallLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntakeTicket" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "emergencyIssue" TEXT NOT NULL,
    "issueSummary" TEXT,
    "computedUrgency" "UrgencyLevel" NOT NULL DEFAULT 'LOW',
    "isBooked" BOOLEAN NOT NULL DEFAULT false,
    "dispatchStatus" "DispatchStatus" NOT NULL DEFAULT 'PENDING',
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntakeTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadActivity" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "activityType" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScrapeState" (
    "id" TEXT NOT NULL,
    "currentIndustryIndex" INTEGER NOT NULL DEFAULT 0,
    "currentCityIndex" INTEGER NOT NULL DEFAULT 0,
    "lastRunTimestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ScrapeState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailHoldingTank" (
    "id" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "emailAddress" TEXT NOT NULL,
    "industry" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "estimatedRevenueLoss" DOUBLE PRECISION NOT NULL,
    "status" "EmailStatus" NOT NULL DEFAULT 'PENDING',
    "dispatchedFromInbox" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailHoldingTank_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoginToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "returnTo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoginToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "A2pRegistration" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "legalBusinessName" TEXT NOT NULL,
    "ein" TEXT NOT NULL,
    "businessType" TEXT NOT NULL,
    "industry" TEXT NOT NULL,
    "website" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "contactFirstName" TEXT NOT NULL,
    "contactLastName" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "contactPhone" TEXT NOT NULL,
    "campaignDescription" TEXT NOT NULL,
    "sampleMessage1" TEXT NOT NULL,
    "sampleMessage2" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "privacyPolicyUrl" TEXT NOT NULL,
    "termsAndConditionsUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "A2pRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Account_email_key" ON "Account"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Account_assignedTwilioNum_key" ON "Account"("assignedTwilioNum");

-- CreateIndex
CREATE UNIQUE INDEX "Account_stripeCustomerId_key" ON "Account"("stripeCustomerId");

-- CreateIndex
CREATE INDEX "SwarmleadsOutreach_accountId_idx" ON "SwarmleadsOutreach"("accountId");

-- CreateIndex
CREATE INDEX "SwarmleadsOutreach_status_idx" ON "SwarmleadsOutreach"("status");

-- CreateIndex
CREATE UNIQUE INDEX "LeadToken_token_key" ON "LeadToken"("token");

-- CreateIndex
CREATE INDEX "LeadToken_token_idx" ON "LeadToken"("token");

-- CreateIndex
CREATE INDEX "CallLog_accountId_idx" ON "CallLog"("accountId");

-- CreateIndex
CREATE INDEX "CallLog_timestamp_idx" ON "CallLog"("timestamp");

-- CreateIndex
CREATE INDEX "IntakeTicket_accountId_idx" ON "IntakeTicket"("accountId");

-- CreateIndex
CREATE INDEX "LeadActivity_ticketId_idx" ON "LeadActivity"("ticketId");

-- CreateIndex
CREATE INDEX "LeadActivity_createdAt_idx" ON "LeadActivity"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- CreateIndex
CREATE INDEX "Session_token_idx" ON "Session"("token");

-- CreateIndex
CREATE INDEX "Session_accountId_idx" ON "Session"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "LoginToken_token_key" ON "LoginToken"("token");

-- CreateIndex
CREATE INDEX "LoginToken_token_idx" ON "LoginToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "A2pRegistration_accountId_key" ON "A2pRegistration"("accountId");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SwarmleadsOutreach" ADD CONSTRAINT "SwarmleadsOutreach_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadToken" ADD CONSTRAINT "LeadToken_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "IntakeTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallLog" ADD CONSTRAINT "CallLog_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntakeTicket" ADD CONSTRAINT "IntakeTicket_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadActivity" ADD CONSTRAINT "LeadActivity_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "IntakeTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "A2pRegistration" ADD CONSTRAINT "A2pRegistration_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
