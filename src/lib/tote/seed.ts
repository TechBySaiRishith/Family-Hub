// Idempotent seed for built-in Tote templates.
// Runs at most once: a no-op when any built-in row already exists.

import { db } from "@/lib/db";
import { checklistTemplates, checklistTemplateItems } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { ulid } from "ulid";
import { BUILT_IN_TEMPLATES } from "./built-in-templates";

let seededInThisProcess = false;

export async function seedBuiltInTemplates(): Promise<void> {
  if (seededInThisProcess) return;
  seededInThisProcess = true;

  const existing = await db.query.checklistTemplates.findFirst({
    where: eq(checklistTemplates.isBuiltIn, true),
  });
  if (existing) return; // already seeded

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
