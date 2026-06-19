import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/encryption";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json({ error: "Missing email parameter" }, { status: 400 });
    }

    const account = await prisma.account.findUnique({
      where: { email },
      select: {
        businessName: true,
        email: true,
        realPhoneNumber: true,
        assignedTwilioNum: true,
        bookingLink: true,
        subscriptionStatus: true,
      },
    });

    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    return NextResponse.json({
      account: {
        ...account,
        realPhoneNumber: decrypt(account.realPhoneNumber),
      },
    });
  } catch (error: any) {
    console.error("Error retrieving success details:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
