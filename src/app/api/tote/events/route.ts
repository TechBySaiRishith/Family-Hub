import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  events,
  checklistItems,
  checklistTemplates,
  checklistTemplateItems,
} from "@/lib/db/schema";
import { createEventSchema } from "@/lib/validations";
import { ulid } from "ulid";
import { and, asc, eq, or, isNull } from "drizzle-orm";
import { seedBuiltInTemplates } from "@/lib/tote/seed";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Seed-on-first-read so a brand-new install can show templates without a separate boot step.
  await seedBuiltInTemplates();

  const rows = await db.query.events.findMany({
    orderBy: [asc(events.eventDate)],
  });
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await seedBuiltInTemplates();

  const body = await req.json();
  const parsed = createEventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { templateId, eventDate, ...rest } = parsed.data;
  const id = ulid();

  await db.insert(events).values({
    id,
    ...rest,
    eventDate: new Date(eventDate),
    createdById: session.user.id,
  });

  // If a template was chosen, copy its items into the event's shared list.
  if (templateId) {
    // Visibility: built-in templates (createdById is null) OR the caller's own saved template.
    const tpl = await db.query.checklistTemplates.findFirst({
      where: and(
        eq(checklistTemplates.id, templateId),
        or(
          isNull(checklistTemplates.createdById),
          eq(checklistTemplates.createdById, session.user.id),
        ),
      ),
    });

    if (tpl) {
      const tplItems = await db.query.checklistTemplateItems.findMany({
        where: eq(checklistTemplateItems.templateId, templateId),
        orderBy: [asc(checklistTemplateItems.sortOrder)],
      });

      if (tplItems.length > 0) {
        await db.insert(checklistItems).values(
          tplItems.map((item, idx) => ({
            id: ulid(),
            eventId: id,
            scope: "shared" as const,
            userId: null,
            text: item.text,
            quantity: item.quantity,
            itemNotes: "",
            category: item.category,
            sortOrder: idx,
          })),
        );
      }
    }
  }

  return NextResponse.json({ id }, { status: 201 });
}
