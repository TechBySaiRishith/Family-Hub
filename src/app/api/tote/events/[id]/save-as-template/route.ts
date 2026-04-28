import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  events,
  checklistItems,
  checklistTemplates,
  checklistTemplateItems,
} from "@/lib/db/schema";
import { saveAsTemplateSchema } from "@/lib/validations";
import { ulid } from "ulid";
import { and, asc, eq } from "drizzle-orm";

/**
 * Capture the current state of an event's checklist into a new user template.
 * - scope='shared' captures the shared family list
 * - scope='user' captures only the caller's private list
 *
 * Templates are owned by the caller; built-in flag is always false.
 * Item check-state is dropped — templates are seed material, not snapshots.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: eventId } = await params;

  const event = await db.query.events.findFirst({ where: eq(events.id, eventId) });
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const parsed = saveAsTemplateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { name, scope } = parsed.data;

  // Pull the items the caller is allowed to capture for this scope.
  const itemFilter =
    scope === "shared"
      ? and(eq(checklistItems.eventId, eventId), eq(checklistItems.scope, "shared"))
      : and(
          eq(checklistItems.eventId, eventId),
          eq(checklistItems.scope, "user"),
          eq(checklistItems.userId, session.user.id),
        );

  const sourceItems = await db.query.checklistItems.findMany({
    where: itemFilter,
    orderBy: [asc(checklistItems.sortOrder)],
  });

  if (sourceItems.length === 0) {
    return NextResponse.json({ error: "Nothing to save — list is empty" }, { status: 400 });
  }

  const tplId = ulid();
  await db.insert(checklistTemplates).values({
    id: tplId,
    name,
    eventType: event.eventType,
    isBuiltIn: false,
    createdById: session.user.id,
  });

  await db.insert(checklistTemplateItems).values(
    sourceItems.map((it, idx) => ({
      id: ulid(),
      templateId: tplId,
      text: it.text,
      quantity: it.quantity,
      category: it.category,
      sortOrder: idx,
    })),
  );

  return NextResponse.json({ id: tplId }, { status: 201 });
}
