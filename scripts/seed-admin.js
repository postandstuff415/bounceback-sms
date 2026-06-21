const { PrismaClient } = require("@prisma/client");
const crypto = require("node:crypto");
const prisma = new PrismaClient();

const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

function getEncryptionKey() {
  const secret = process.env.ENCRYPTION_KEY || "dev-only-insecure-fallback";
  return crypto.createHash("sha256").update(secret).digest();
}

function encrypt(text) {
  if (!text) return "";
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

async function main() {
  const email = "michael@bounceback-sms.com";
  const existing = await prisma.account.findUnique({
    where: { email },
  });

  if (existing) {
    await prisma.account.update({
      where: { email },
      data: { role: "SUPERADMIN" },
    });
    console.log("Updated existing account to SUPERADMIN");
  } else {
    await prisma.account.create({
      data: {
        email,
        businessName: "BounceBack SMS Admin",
        realPhoneNumber: encrypt("+15550199"),
        bookingLink: "https://calendly.com/bounceback-sms",
        role: "SUPERADMIN",
        subscriptionStatus: "active",
        assignedTwilioNum: "+15550100",
      },
    });
    console.log("Created SUPERADMIN account");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
