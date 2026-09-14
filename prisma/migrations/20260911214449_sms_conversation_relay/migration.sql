-- Two-way SMS relay: one thread per (contractor account, lead number).
-- leadNumber is AES-256-GCM encrypted; leadNumberHash is a deterministic HMAC
-- of the same value so threads can be looked up without decrypting the column.
CREATE TABLE "SmsConversation" (
    "id"             TEXT NOT NULL,
    "accountId"      TEXT NOT NULL,
    "leadNumber"     TEXT NOT NULL,
    "leadNumberHash" TEXT NOT NULL,
    "lastInboundAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastRelayedAt"  TIMESTAMP(3),
    "optedOut"       BOOLEAN NOT NULL DEFAULT false,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SmsConversation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SmsConversation_accountId_leadNumberHash_key"
    ON "SmsConversation"("accountId", "leadNumberHash");

CREATE INDEX "SmsConversation_accountId_lastInboundAt_idx"
    ON "SmsConversation"("accountId", "lastInboundAt");

ALTER TABLE "SmsConversation"
    ADD CONSTRAINT "SmsConversation_accountId_fkey"
    FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
