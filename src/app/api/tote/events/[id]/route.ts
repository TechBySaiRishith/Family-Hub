import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { events, checklistItems } from "@/lib/db/schema";
import { updateEventSchema } from "@/lib/validations";
import { and, asc, eq, or, isNull } from "drizzle-orm";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const event = await db.query.events.findFirst({ where: eq(events.id, id) });
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Visibility: shared items + this user's private items
  const items = await db.query.checklistItems.findMany({
    where: and(
      eq(checklistItems.eventId, id),
      or(
        eq(checklistItems.scope, "shared"),
        and(
          eq(checklistItems.scope, "user"),
          eq(checklistItems.userId, session.user.id),
        ),
      ),
    ),
    orderBy: [asc(checklistItems.sortOrder), asc(checklistItems.createdAt)],
  });

  return NextResponse.json({ ...event, items });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const event = await db.query.events.findFirst({ where: eq(events.id, id) });
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (event.createdById !== session.user.id && session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = updateEventSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { eventDate, ...rest } = parsed.data;

  await db.update(events).set({
    ...rest,
    ...(eventDate ? { eventDate: new Date(eventDate) } : {}),
    updatedAt: new Date(),
  }).where(eq(events.id, id));

  return NextResponse.json({ success: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const event = await db.query.events.findFirst({ where: eq(events.id, id) });
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (event.createdById !== session.user.id && session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await db.delete(events).where(eq(events.id, id));
  return NextResponse.json({ success: true });
}

// Suppress unused-import lint noise for these helpers when re-imported elsewhere
void isNull;
