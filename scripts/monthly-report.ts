import { prisma } from "../src/lib/prisma";
import twilio from "twilio";
import { config } from "dotenv";
import path from "path";

// Load environment variables
config({ path: path.resolve(__dirname, "../.env") });

// Helper to check if Twilio is properly configured
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

async function runMonthlyReport() {
  console.log(`\n======================================================`);
  console.log(`[Monthly Report Engine] Initiating automated proof-of-value report...`);
  console.log(`======================================================\n`);

  // 1. Fetch all active accounts
  const activeAccounts = await prisma.account.findMany({
    where: {
      subscriptionStatus: "active",
    },
  });

  console.log(`[Monthly Report Engine] Found ${activeAccounts.length} active subscription accounts.\n`);

  if (activeAccounts.length === 0) {
    console.log(`[Monthly Report Engine] No active accounts to report. Exiting.`);
    return;
  }

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  let reportsSent = 0;

  for (const account of activeAccounts) {
    console.log(`\n------------------------------------------------------`);
    console.log(`Generating Monthly Report for: ${account.businessName}`);
    console.log(`------------------------------------------------------`);

    // 2. Collect CallLog records within the last 30 days
    const logs = await prisma.callLog.findMany({
      where: {
        accountId: account.id,
        timestamp: {
          gte: thirtyDaysAgo,
        },
      },
    });

    console.log(`  - Total logs analyzed for last 30 days: ${logs.length}`);

    // Missed calls: final status is not completed and not answered
    const missedLogs = logs.filter(
      (log) => log.callStatus.toLowerCase() !== "completed" && log.callStatus.toLowerCase() !== "answered"
    );
    const smsSentLogs = logs.filter((log) => log.smsSent);

    const totalMissed = missedLogs.length;
    const totalSmsSent = smsSentLogs.length;

    // Cumulative Estimated Revenue Saved (using database field or $60 * totalSmsSent)
    const totalRevenueSaved = smsSentLogs.reduce((acc, log) => acc + log.revenueSavedEst, 0.0);

    console.log(`  - Total Missed Calls Intercepted: ${totalMissed}`);
    console.log(`  - Total SMS Rescue Messages Sent: ${totalSmsSent}`);
    console.log(`  - Estimated Business Pipeline Saved: $${totalRevenueSaved.toFixed(2)}`);

    // 3. Construct the SMS report payload
    const smsBody = `BounceBack Report: This month we saved you ${totalMissed} missed calls and recovered an estimated $${totalRevenueSaved.toFixed(2)} in business pipeline. Your system cost: $29.99.`;

    console.log(`  - SMS Body: "${smsBody}"`);

    // 4. Dispatch the SMS report directly to account.realPhoneNumber
    const targetNumber = account.realPhoneNumber;

    if (isTwilioConfigured()) {
      try {
        console.log(`  - [Twilio SMS] Sending live monthly report SMS to ${targetNumber}...`);
        const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
        const twilioFrom = process.env.TWILIO_PHONE_NUMBER;

        if (twilioFrom) {
          const message = await client.messages.create({
            to: targetNumber,
            from: twilioFrom,
            body: smsBody,
          });
          console.log(`  - [Twilio SMS] Success! SMS dispatched. SID: ${message.sid}`);
          reportsSent++;
        } else {
          console.warn(`  - [Twilio SMS Warning] No Twilio source phone number configured in environment.`);
        }
      } catch (twilioErr: any) {
        console.error(`  - [Twilio SMS Error] Failed to send live SMS: ${twilioErr.message}`);
      }
    } else {
      console.log(`  - [Mock Twilio SMS] (Credentials not configured) Simulated SMS dispatch:`);
      console.log(`    - To: ${targetNumber}`);
      console.log(`    - From: ${process.env.TWILIO_PHONE_NUMBER || "+15551234567"}`);
      console.log(`    - Status: SIMULATED_SUCCESS`);
      reportsSent++;
    }
  }

  console.log(`\n======================================================`);
  console.log(`[Monthly Report Engine] Monthly report completed successfully!`);
  console.log(`[Monthly Report Engine] Total reports processed: ${reportsSent}`);
  console.log(`======================================================\n`);
}

runMonthlyReport().catch((err) => {
  console.error("Fatal error in monthly report pipeline:", err);
  process.exit(1);
});
