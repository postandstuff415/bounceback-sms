import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const session = authenticateRequest(req);
    if (!session) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const { ticketId, status, notes } = await req.json();

    if (!ticketId) {
      return NextResponse.json({ error: "Missing ticketId." }, { status: 400 });
    }

    // Verify ticket belongs to authenticated user's account
    const ticket = await prisma.intakeTicket.findUnique({
      where: { id: ticketId },
      include: { account: true }
    });

    if (!ticket || ticket.account.email !== session.email) {
      return NextResponse.json({ error: "Lead not found or unauthorized." }, { status: 404 });
    }

    const updateData: any = {};
    const activitiesToCreate: any[] = [];

    if (status && status !== ticket.status) {
      updateData.status = status;
      activitiesToCreate.push({
        ticketId,
        activityType: "STATUS_CHANGED",
        content: `Lead status updated from ${ticket.status} to ${status}.`,
      });
    }

    if (notes !== undefined && notes !== ticket.notes) {
      updateData.notes = notes;
      activitiesToCreate.push({
        ticketId,
        activityType: "NOTE_ADDED",
        content: "Internal notes updated.",
      });
    }

    // Update ticket
    const updatedTicket = await prisma.intakeTicket.update({
      where: { id: ticketId },
      data: updateData,
    });

    // Create activities
    if (activitiesToCreate.length > 0) {
      await prisma.leadActivity.createMany({
        data: activitiesToCreate,
      });
    }

    return NextResponse.json({ success: true, ticket: updatedTicket });
  } catch (error: any) {
    console.error("Lead update error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
