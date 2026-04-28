import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { checklistTemplates, checklistTemplateItems } from "@/lib/db/schema";
import { forkTemplateSchema } from "@/lib/validations";
import { ulid } from "ulid";
import { and, asc, eq, isNull, or } from "drizzle-orm";

/**
 * Clone a template (built-in or someone else's visible template) into a new
 * user-owned template that the caller can edit.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: sourceId } = await params;

  const source = await db.query.checklistTemplates.findFirst({
    where: and(
      eq(checklistTemplates.id, sourceId),
      or(
        isNull(checklistTemplates.createdById),
        eq(checklistTemplates.createdById, session.user.id),
      ),
    ),
  });
  if (!source) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const parsed = forkTemplateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const newName = parsed.data.name ?? `${source.name} (copy)`;
  const newId = ulid();

  await db.insert(checklistTemplates).values({
    id: newId,
    name: newName,
    eventType: source.eventType,
    isBuiltIn: false,
    createdById: session.user.id,
  });

  const items = await db.query.checklistTemplateItems.findMany({
    where: eq(checklistTemplateItems.templateId, sourceId),
    orderBy: [asc(checklistTemplateItems.sortOrder)],
  });

  if (items.length > 0) {
    await db.insert(checklistTemplateItems).values(
      items.map((it, idx) => ({
        id: ulid(),
        templateId: newId,
        text: it.text,
        quantity: it.quantity,
        category: it.category,
        sortOrder: idx,
      })),
    );
  }

  return NextResponse.json({ id: newId }, { status: 201 });
}
