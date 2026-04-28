import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { checklistTemplates } from "@/lib/db/schema";
import { asc, eq, isNull, or } from "drizzle-orm";
import { seedBuiltInTemplates } from "@/lib/tote/seed";

/**
 * Returns built-in templates (always) + the caller's saved templates.
 * Each row is annotated with its item count so the picker can show "12 items".
 */
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await seedBuiltInTemplates();

  const templates = await db.query.checklistTemplates.findMany({
    where: or(
      isNull(checklistTemplates.createdById),
      eq(checklistTemplates.createdById, session.user.id),
    ),
    with: { /* drizzle relations not configured — load items separately below */ },
    orderBy: [asc(checklistTemplates.isBuiltIn), asc(checklistTemplates.createdAt)],
  });

  // Attach item counts in one pass
  const ids = templates.map((t) => t.id);
  let counts: Record<string, number> = {};
  if (ids.length > 0) {
    const allItems = await db.query.checklistTemplateItems.findMany();
    counts = allItems.reduce<Record<string, number>>((acc, it) => {
      acc[it.templateId] = (acc[it.templateId] ?? 0) + 1;
      return acc;
    }, {});
  }

  return NextResponse.json(
    templates.map((t) => ({
      ...t,
      itemCount: counts[t.id] ?? 0,
    })),
  );
}
