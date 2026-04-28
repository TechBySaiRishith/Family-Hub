import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { events, checklistItems } from "@/lib/db/schema";
import { createChecklistItemSchema } from "@/lib/validations";
import { ulid } from "ulid";
import { and, eq, max } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = createChecklistItemSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { eventId, scope, ...rest } = parsed.data;

  const event = await db.query.events.findFirst({ where: eq(events.id, eventId) });
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  // Find the next sortOrder within the same scope+(user) bucket so new items go to the bottom.
  const ownerFilter = scope === "user" ? eq(checklistItems.userId, session.user.id) : undefined;
  const [{ maxOrder }] = await db
    .select({ maxOrder: max(checklistItems.sortOrder) })
    .from(checklistItems)
    .where(
      ownerFilter
        ? and(eq(checklistItems.eventId, eventId), eq(checklistItems.scope, scope), ownerFilter)
        : and(eq(checklistItems.eventId, eventId), eq(checklistItems.scope, scope)),
    );

  const id = ulid();
  await db.insert(checklistItems).values({
    id,
    eventId,
    scope,
    userId: scope === "user" ? session.user.id : null,
    ...rest,
    quantity: rest.quantity ?? null,
    sortOrder: (maxOrder ?? -1) + 1,
  });

  return NextResponse.json({ id }, { status: 201 });
}
