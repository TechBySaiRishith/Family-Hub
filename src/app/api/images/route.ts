import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { locationImages } from "@/lib/db/schema";
import { ulid } from "ulid";
import path from "path";
import fs from "fs/promises";

// Statically scoped under cwd so Turbopack's file tracer doesn't pull in the
// whole project when it can't resolve DATABASE_PATH at build time.
const UPLOAD_DIR = path.join(process.cwd(), "data", "images");

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const locationId = formData.get("locationId") as string | null;

  if (!file || !locationId) return NextResponse.json({ error: "File and locationId required" }, { status: 400 });

  const EXT_BY_MIME: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
  };
  const ext = EXT_BY_MIME[file.type];
  if (!ext) return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
  if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 400 });

  await fs.mkdir(UPLOAD_DIR, { recursive: true });

  const id = ulid();
  const fileName = `${id}.${ext}`;
  const filePath = path.join(UPLOAD_DIR, fileName);

  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(filePath, buffer);

  await db.insert(locationImages).values({ id, locationId, filePath: fileName, uploadedBy: session.user.id });

  return NextResponse.json({ id, filePath: fileName }, { status: 201 });
}
