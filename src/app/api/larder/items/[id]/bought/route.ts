import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { larderItems } from "@/lib/db/schema";
import { setBoughtSchema } from "@/lib/validations";
import { eq } from "drizzle-orm";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await db.query.larderItems.findFirst({ where: eq(larderItems.id, id) });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const parsed = setBoughtSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const now = new Date();
  await db
    .update(larderItems)
    .set({
      isBought: parsed.data.bought,
      boughtById: parsed.data.bought ? session.user.id : null,
      boughtAt: parsed.data.bought ? now : null,
      updatedAt: now,
    })
    .where(eq(larderItems.id, id));

  return NextResponse.json({ success: true });
}
