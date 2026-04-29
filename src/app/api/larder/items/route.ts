import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { larderItems } from "@/lib/db/schema";
import { createLarderItemSchema } from "@/lib/validations";
import { ulid } from "ulid";
import { asc, eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const showBought = req.nextUrl.searchParams.get("showBought") === "true";

  const rows = await db.query.larderItems.findMany({
    where: showBought ? undefined : eq(larderItems.isBought, false),
    orderBy: [asc(larderItems.category), asc(larderItems.addedAt)],
  });
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = createLarderItemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const id = ulid();
  await db.insert(larderItems).values({
    id,
    ...parsed.data,
    addedById: session.user.id,
  });

  return NextResponse.json({ id }, { status: 201 });
}
