// Idempotent seed for built-in Tote templates.
// No-op when at least one built-in row already exists, so admin-deleted
// built-ins are re-seeded on the next Tote request (instead of staying
// missing until the container restarts).

import { db } from "@/lib/db";
import { checklistTemplates, checklistTemplateItems } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { ulid } from "ulid";
import { BUILT_IN_TEMPLATES } from "./built-in-templates";

export async function seedBuiltInTemplates(): Promise<void> {
  const existing = await db.query.checklistTemplates.findFirst({
    where: eq(checklistTemplates.isBuiltIn, true),
  });
  if (existing) return;

  for (const tpl of BUILT_IN_TEMPLATES) {
    const id = ulid();
    await db.insert(checklistTemplates).values({
      id,
      name: tpl.name,
      eventType: tpl.eventType,
      isBuiltIn: true,
      createdById: null,
    });

    if (tpl.items.length > 0) {
      await db.insert(checklistTemplateItems).values(
        tpl.items.map((item, idx) => ({
          id: ulid(),
          templateId: id,
          text: item.text,
          quantity: item.quantity ?? null,
          category: item.category,
          sortOrder: idx,
        })),
      );
    }
  }
}
