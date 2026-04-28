import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { coupons } from "@/lib/db/schema";
import { and, eq, or } from "drizzle-orm";

// Mark used — race-safe
export async function PATCH(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  // Race-safe + visibility-safe: only update if the coupon exists, isn't already
  // used, and is either shared or owned by the caller. This prevents a logged-in
  // user from claiming someone else's private coupon by guessing the ULID.
  const result = await db
    .update(coupons)
    .set({
      isUsed: true,
      usedById: session.user.id,
      usedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(coupons.id, id),
        eq(coupons.isUsed, false),
        or(eq(coupons.isPrivate, false), eq(coupons.createdById, session.user.id)),
      )
    );

  if (result.changes === 0) {
    const existing = await db.query.coupons.findFirst({ where: eq(coupons.id, id) });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (existing.isPrivate && existing.createdById !== session.user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(
      { error: "Already claimed", usedById: existing.usedById, usedAt: existing.usedAt },
      { status: 409 }
    );
  }

  return NextResponse.json({ success: true });
}

// Mark unused — only the user who claimed it can revert
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const coupon = await db.query.coupons.findFirst({ where: eq(coupons.id, id) });
  if (!coupon) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (coupon.usedById !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await db
    .update(coupons)
    .set({ isUsed: false, usedById: null, usedAt: null, updatedAt: new Date() })
    .where(eq(coupons.id, id));

  return NextResponse.json({ success: true });
}
