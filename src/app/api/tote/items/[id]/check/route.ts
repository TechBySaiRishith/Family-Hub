import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { checklistItems } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod/v4";

const checkSchema = z.object({ checked: z.boolean() });

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const item = await db.query.checklistItems.findFirst({ where: eq(checklistItems.id, id) });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Private items: only the owner can check/uncheck
  if (item.scope === "user" && item.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = checkSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const { checked } = parsed.data;
  await db
    .update(checklistItems)
    .set({
      isChecked: checked,
      checkedById: checked ? session.user.id : null,
      checkedAt: checked ? new Date() : null,
    })
    .where(eq(checklistItems.id, id));

  return NextResponse.json({ success: true });
}
