import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { checklistTemplates, checklistTemplateItems } from "@/lib/db/schema";
import { updateTemplateItemSchema } from "@/lib/validations";
import { and, eq } from "drizzle-orm";

async function authorize(templateId: string, itemId: string, sessionUserId: string, isAdmin: boolean) {
  const tpl = await db.query.checklistTemplates.findFirst({
    where: eq(checklistTemplates.id, templateId),
  });
  if (!tpl) return { status: 404 as const, error: "Template not found" };
  if (tpl.isBuiltIn) {
    return { status: 403 as const, error: "Built-in templates can't be edited. Save a copy and edit that." };
  }
  if (tpl.createdById !== sessionUserId && !isAdmin) {
    return { status: 403 as const, error: "Forbidden" };
  }

  const item = await db.query.checklistTemplateItems.findFirst({
    where: and(
      eq(checklistTemplateItems.id, itemId),
      eq(checklistTemplateItems.templateId, templateId),
    ),
  });
  if (!item) return { status: 404 as const, error: "Item not found" };

  return { status: 200 as const, error: null };
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> },
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, itemId } = await params;
  const auth0 = await authorize(id, itemId, session.user.id, session.user.role === "admin");
  if (auth0.error) return NextResponse.json({ error: auth0.error }, { status: auth0.status });

  const body = await req.json();
  const parsed = updateTemplateItemSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  await db
    .update(checklistTemplateItems)
    .set(parsed.data)
    .where(eq(checklistTemplateItems.id, itemId));
  return NextResponse.json({ success: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> },
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, itemId } = await params;
  const auth0 = await authorize(id, itemId, session.user.id, session.user.role === "admin");
  if (auth0.error) return NextResponse.json({ error: auth0.error }, { status: auth0.status });

  await db.delete(checklistTemplateItems).where(eq(checklistTemplateItems.id, itemId));
  return NextResponse.json({ success: true });
}
