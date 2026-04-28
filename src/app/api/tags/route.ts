import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { tags } from "@/lib/db/schema";
import { createTagSchema } from "@/lib/validations";
import { ulid } from "ulid";
import { eq } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const allTags = await db.query.tags.findMany();
  return NextResponse.json(allTags);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const parsed = createTagSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const id = ulid();
  await db.insert(tags).values({ id, ...parsed.data });
  return NextResponse.json({ id, ...parsed.data }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Tag ID required" }, { status: 400 });
  await db.delete(tags).where(eq(tags.id, id));
  return NextResponse.json({ success: true });
}
