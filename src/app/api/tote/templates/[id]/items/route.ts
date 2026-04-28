import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { checklistTemplates, checklistTemplateItems } from "@/lib/db/schema";
import { createTemplateItemSchema } from "@/lib/validations";
import { ulid } from "ulid";
import { eq, max } from "drizzle-orm";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: templateId } = await params;

  const tpl = await db.query.checklistTemplates.findFirst({
    where: eq(checklistTemplates.id, templateId),
  });
  if (!tpl) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (tpl.isBuiltIn) {
    return NextResponse.json(
      { error: "Built-in templates can't be edited. Save a copy and edit that." },
      { status: 403 },
    );
  }
  if (tpl.createdById !== session.user.id && session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createTemplateItemSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const [{ maxOrder }] = await db
    .select({ maxOrder: max(checklistTemplateItems.sortOrder) })
    .from(checklistTemplateItems)
    .where(eq(checklistTemplateItems.templateId, templateId));

  const id = ulid();
  await db.insert(checklistTemplateItems).values({
    id,
    templateId,
    text: parsed.data.text,
    quantity: parsed.data.quantity ?? null,
    category: parsed.data.category,
    sortOrder: (maxOrder ?? -1) + 1,
  });

  return NextResponse.json({ id }, { status: 201 });
}
