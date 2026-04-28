import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { coupons } from "@/lib/db/schema";
import { updateCouponSchema } from "@/lib/validations";
import { eq } from "drizzle-orm";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const coupon = await db.query.coupons.findFirst({ where: eq(coupons.id, id) });
  if (!coupon) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (coupon.isPrivate && coupon.createdById !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(coupon);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const coupon = await db.query.coupons.findFirst({ where: eq(coupons.id, id) });
  if (!coupon) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (coupon.createdById !== session.user.id && session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = updateCouponSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { expiryDate, ...rest } = parsed.data;

  await db.update(coupons).set({
    ...rest,
    ...(expiryDate ? { expiryDate: new Date(expiryDate) } : {}),
    updatedAt: new Date(),
  }).where(eq(coupons.id, id));

  return NextResponse.json({ success: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const coupon = await db.query.coupons.findFirst({ where: eq(coupons.id, id) });
  if (!coupon) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (coupon.createdById !== session.user.id && session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await db.delete(coupons).where(eq(coupons.id, id));
  return NextResponse.json({ success: true });
}
