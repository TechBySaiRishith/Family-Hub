import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ulid } from "ulid";
import path from "path";
import fs from "fs";

const UPLOAD_DIR = path.join(process.cwd(), "data", "uploads", "coupons");
const MAX_BYTES = 8 * 1024 * 1024; // 8 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "File too large" }, { status: 413 });
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Unsupported file type" }, { status: 415 });
  }

  ensureDir(UPLOAD_DIR);

  const ext = file.type === "image/png"
    ? ".png"
    : file.type === "image/webp"
    ? ".webp"
    : file.type === "image/gif"
    ? ".gif"
    : ".jpg";
  const filename = `${ulid()}${ext}`;
  const fullPath = path.join(UPLOAD_DIR, filename);
  const relPath = `coupons/${filename}`;

  const buffer = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(fullPath, buffer);

  let text = "";
  try {
    // OCR is loaded lazily so the endpoint stays usable even if Tesseract isn't installed
    const ocr = await import("@/lib/ocr").catch(() => null);
    if (ocr) text = await ocr.runOcr(fullPath);
  } catch {
    // Image was saved fine — fall back to no extracted text
  }

  return NextResponse.json({ imagePath: relPath, text });
}
