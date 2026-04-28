import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import path from "path";
import fs from "fs/promises";

const UPLOAD_ROOT = path.join(process.cwd(), "data", "uploads");

export async function GET(_req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { path: parts } = await params;
  const requested = parts.join("/");
  const filePath = path.join(UPLOAD_ROOT, requested);

  // Path traversal guard
  const normalized = path.normalize(filePath);
  if (!normalized.startsWith(UPLOAD_ROOT)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const file = await fs.readFile(normalized);
    const ext = normalized.split(".").pop()?.toLowerCase();
    const contentType =
      ext === "png" ? "image/png" :
      ext === "webp" ? "image/webp" :
      ext === "gif" ? "image/gif" :
      "image/jpeg";
    return new NextResponse(new Uint8Array(file), {
      headers: { "Content-Type": contentType, "Cache-Control": "private, max-age=86400" },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
