import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { checklistItems } from "@/lib/db/schema";
import { updateChecklistItemSchema } from "@/lib/validations";
import { eq } from "drizzle-orm";

/**
 * Scope-aware authorization for editing/deleting a checklist item:
 * - shared items: any logged-in user
 * - user (private) items: only the owner
 * - admins can act on anything
 */
async function authorizeItem(itemId: string, sessionUserId: string, isAdmin: boolean) {
  const item = await db.query.checklistItems.findFirst({ where: eq(checklistItems.id, itemId) });
  if (!item) return { error: "Not found" as const, status: 404, item: null };

  if (item.scope === "user" && item.userId !== sessionUserId && !isAdmin) {
    return { error: "Forbidden" as const, status: 403, item: null };
  }
  return { error: null, status: 200, item };
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const auth0 = await authorizeItem(id, session.user.id, session.user.role === "admin");
  if (auth0.error) return NextResponse.json({ error: auth0.error }, { status: auth0.status });

  const body = await req.json();
  const parsed = updateChecklistItemSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  await db.update(checklistItems).set(parsed.data).where(eq(checklistItems.id, id));
  return NextResponse.json({ success: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const auth0 = await authorizeItem(id, session.user.id, session.user.role === "admin");
  if (auth0.error) return NextResponse.json({ error: auth0.error }, { status: auth0.status });

  await db.delete(checklistItems).where(eq(checklistItems.id, id));
  return NextResponse.json({ success: true });
}
