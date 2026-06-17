const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Delete existing records to start fresh
  await prisma.callLog.deleteMany({});
  await prisma.account.deleteMany({});

  const testAccount = await prisma.account.create({
    data: {
      email: "test@example.com",
      businessName: "BounceBack Plumbers",
      realPhoneNumber: "+15557654321",
      assignedTwilioNum: "+15551234567",
      bookingLink: "https://calendly.com/bounceback-plumbers",
      subscriptionStatus: "active",
    },
  });

  console.log("Created test account:", testAccount);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
