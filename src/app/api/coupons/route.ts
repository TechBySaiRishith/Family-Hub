import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { coupons } from "@/lib/db/schema";
import { createCouponSchema } from "@/lib/validations";
import { ulid } from "ulid";
import { and, asc, eq, gte, lte, or } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const expiringOnly = searchParams.get("expiring") === "true";

  // Visibility: public coupons OR own private coupons
  const visibilityClause = or(
    eq(coupons.isPrivate, false),
    eq(coupons.createdById, session.user.id),
  );

  let whereClause = visibilityClause;
  if (expiringOnly) {
    const now = new Date();
    const horizon = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    whereClause = and(
      visibilityClause,
      eq(coupons.isUsed, false),
      gte(coupons.expiryDate, now),
      lte(coupons.expiryDate, horizon),
    )!;
  }

  const rows = await db.query.coupons.findMany({
    where: whereClause,
    orderBy: [asc(coupons.expiryDate)],
  });

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = createCouponSchema.safeParse(body);

  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { expiryDate, code, ...rest } = parsed.data;
  const id = ulid();

  await db.insert(coupons).values({
    id,
    ...rest,
    code: code ?? null,
    expiryDate: new Date(expiryDate),
    createdById: session.user.id,
  });

  return NextResponse.json({ id }, { status: 201 });
}
