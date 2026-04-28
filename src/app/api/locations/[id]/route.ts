import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { locations, locationTags, reviews, locationImages } from "@/lib/db/schema";
import { updateLocationSchema } from "@/lib/validations";
import { eq } from "drizzle-orm";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const location = await db.query.locations.findFirst({ where: eq(locations.id, id) });
  if (!location) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const locationReviews = await db.query.reviews.findMany({ where: eq(reviews.locationId, id) });
  const tags = await db.query.locationTags.findMany({ where: eq(locationTags.locationId, id) });
  const images = await db.query.locationImages.findMany({ where: eq(locationImages.locationId, id) });

  return NextResponse.json({
    ...location,
    cuisine: JSON.parse(location.cuisine || "[]"),
    reviews: locationReviews,
    tagIds: tags.map((t) => t.tagId),
    images,
  });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const location = await db.query.locations.findFirst({ where: eq(locations.id, id) });
  if (!location) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (location.addedBy !== session.user.id && session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = updateLocationSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { tagIds, cuisine, ...data } = parsed.data;

  await db.update(locations).set({
    ...data,
    ...(cuisine ? { cuisine: JSON.stringify(cuisine) } : {}),
    updatedAt: new Date(),
  }).where(eq(locations.id, id));

  if (tagIds) {
    await db.delete(locationTags).where(eq(locationTags.locationId, id));
    if (tagIds.length > 0) {
      await db.insert(locationTags).values(tagIds.map((tagId) => ({ locationId: id, tagId })));
    }
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const location = await db.query.locations.findFirst({ where: eq(locations.id, id) });
  if (!location) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (location.addedBy !== session.user.id && session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await db.delete(locations).where(eq(locations.id, id));
  return NextResponse.json({ success: true });
}
