import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/encryption";
import { authenticateRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Create a new sub-account
export async function POST(req: Request) {
  try {
    const session = authenticateRequest(req);
    if (!session) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const agency = await prisma.account.findUnique({
      where: { email: session.email.trim().toLowerCase() },
    });

    if (!agency || agency.role !== "AGENCY") {
      return NextResponse.json({ error: "Unauthorized. Agency access only." }, { status: 403 });
    }

    const body = await req.json();
    const { email, businessName, realPhoneNumber, bookingLink } = body;

    if (!email || !businessName || !realPhoneNumber || !bookingLink) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    const existingAccount = await prisma.account.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    if (existingAccount) {
      return NextResponse.json(
        { error: "An account with this email address already exists." },
        { status: 400 }
      );
    }

    // Encrypt realPhoneNumber before saving
    const encryptedPhone = encrypt(realPhoneNumber.trim());

    // Generate a mock Twilio number for local testing/UX demo if none is provided
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const assignedTwilioNum = `+155501${randomSuffix}`;

    const newSubAccount = await prisma.account.create({
      data: {
        email: email.trim().toLowerCase(),
        businessName: businessName.trim(),
        realPhoneNumber: encryptedPhone,
        bookingLink: bookingLink.trim(),
        role: "USER",
        subscriptionStatus: "active", // Agency sub-accounts are active under the parent agency subscription
        agencyId: agency.id,
        assignedTwilioNum, // Pre-assign a number for demo/UX purposes
      },
    });

    return NextResponse.json({
      success: true,
      message: "Sub-account created successfully.",
      subAccount: {
        id: newSubAccount.id,
        email: newSubAccount.email,
        businessName: newSubAccount.businessName,
        bookingLink: newSubAccount.bookingLink,
        subscriptionStatus: newSubAccount.subscriptionStatus,
        assignedTwilioNum: newSubAccount.assignedTwilioNum,
      },
    });
  } catch (error: any) {
    console.error("Sub-account creation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Delete a sub-account
export async function DELETE(req: Request) {
  try {
    const session = authenticateRequest(req);
    if (!session) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const agency = await prisma.account.findUnique({
      where: { email: session.email.trim().toLowerCase() },
    });

    if (!agency || agency.role !== "AGENCY") {
      return NextResponse.json({ error: "Unauthorized. Agency access only." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const subAccountId = searchParams.get("id");

    if (!subAccountId) {
      return NextResponse.json({ error: "Missing sub-account ID." }, { status: 400 });
    }

    const subAccount = await prisma.account.findUnique({
      where: { id: subAccountId },
    });

    if (!subAccount) {
      return NextResponse.json({ error: "Sub-account not found." }, { status: 444 });
    }

    if (subAccount.agencyId !== agency.id) {
      return NextResponse.json({ error: "Forbidden. This account does not belong to your agency." }, { status: 403 });
    }

    await prisma.account.delete({
      where: { id: subAccountId },
    });

    return NextResponse.json({
      success: true,
      message: "Sub-account deleted successfully.",
    });
  } catch (error: any) {
    console.error("Sub-account deletion error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
