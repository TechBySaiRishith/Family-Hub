import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { locations, locationTags } from "@/lib/db/schema";
import { createLocationSchema } from "@/lib/validations";
import { ulid } from "ulid";
import { desc } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allLocations = await db.query.locations.findMany({
    orderBy: [desc(locations.createdAt)],
  });

  const result = allLocations.map((loc) => ({
    ...loc,
    cuisine: JSON.parse(loc.cuisine || "[]"),
  }));

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = createLocationSchema.safeParse(body);

  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { tagIds, ...data } = parsed.data;
  const id = ulid();

  await db.insert(locations).values({
    id,
    ...data,
    cuisine: JSON.stringify(data.cuisine),
    addedBy: session.user.id,
  });

  if (tagIds.length > 0) {
    await db.insert(locationTags).values(tagIds.map((tagId) => ({ locationId: id, tagId })));
  }

  return NextResponse.json({ id }, { status: 201 });
}
