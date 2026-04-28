import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { checklistTemplates, checklistTemplateItems } from "@/lib/db/schema";
import { updateTemplateSchema } from "@/lib/validations";
import { and, asc, eq, isNull, or } from "drizzle-orm";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const tpl = await db.query.checklistTemplates.findFirst({
    where: and(
      eq(checklistTemplates.id, id),
      or(
        isNull(checklistTemplates.createdById),
        eq(checklistTemplates.createdById, session.user.id),
      ),
    ),
  });
  if (!tpl) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const items = await db.query.checklistTemplateItems.findMany({
    where: eq(checklistTemplateItems.templateId, id),
    orderBy: [asc(checklistTemplateItems.sortOrder)],
  });

  return NextResponse.json({ ...tpl, items });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const tpl = await db.query.checklistTemplates.findFirst({ where: eq(checklistTemplates.id, id) });
  if (!tpl) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (tpl.isBuiltIn) {
    return NextResponse.json(
      { error: "Built-in templates can't be edited directly. Save a copy and edit that." },
      { status: 403 },
    );
  }
  if (tpl.createdById !== session.user.id && session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = updateTemplateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  await db.update(checklistTemplates).set(parsed.data).where(eq(checklistTemplates.id, id));
  return NextResponse.json({ success: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const tpl = await db.query.checklistTemplates.findFirst({ where: eq(checklistTemplates.id, id) });
  if (!tpl) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (tpl.isBuiltIn) {
    return NextResponse.json({ error: "Built-in templates cannot be deleted" }, { status: 403 });
  }
  if (tpl.createdById !== session.user.id && session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await db.delete(checklistTemplates).where(eq(checklistTemplates.id, id));
  return NextResponse.json({ success: true });
}
