import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import path from "path";
import fs from "fs/promises";

const UPLOAD_DIR = path.join(process.cwd(), "data", "images");

export async function GET(_req: NextRequest, { params }: { params: Promise<{ filename: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { filename } = await params;
  const safeName = path.basename(filename);
  const filePath = path.join(UPLOAD_DIR, safeName);

  try {
    const file = await fs.readFile(filePath);
    const ext = safeName.split(".").pop()?.toLowerCase();
    const contentType =
      ext === "png" ? "image/png" :
      ext === "webp" ? "image/webp" :
      ext === "gif" ? "image/gif" :
      "image/jpeg";
    return new NextResponse(new Uint8Array(file), {
      headers: { "Content-Type": contentType, "Cache-Control": "private, max-age=31536000" },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
