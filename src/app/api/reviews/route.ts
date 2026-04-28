import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { reviews, locations } from "@/lib/db/schema";
import { createReviewSchema } from "@/lib/validations";
import { ulid } from "ulid";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = createReviewSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { locationId, rating, notes, visitedAt } = parsed.data;

  const location = await db.query.locations.findFirst({ where: eq(locations.id, locationId) });
  if (!location) return NextResponse.json({ error: "Location not found" }, { status: 404 });

  const id = ulid();
  await db.insert(reviews).values({
    id, locationId, userId: session.user.id, rating, notes,
    visitedAt: visitedAt ? new Date(visitedAt) : new Date(),
  });

  await db.update(locations).set({ visited: true, updatedAt: new Date() }).where(eq(locations.id, locationId));

  return NextResponse.json({ id }, { status: 201 });
}
