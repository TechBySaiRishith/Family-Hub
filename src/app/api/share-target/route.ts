import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ulid } from "ulid";
import path from "path";
import fs from "fs";
import { dispatchShareTarget } from "@/lib/mini-apps/registry";

const UPLOAD_DIR = path.join(process.cwd(), "data", "uploads", "coupons");
const MAX_BYTES = 8 * 1024 * 1024; // 8 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function loginRedirect(req: NextRequest) {
  return NextResponse.redirect(new URL("/login", req.nextUrl.origin), 303);
}

async function dispatch(
  req: NextRequest,
  payload: {
    title: string;
    text: string;
    url: string;
    imagePath?: string;
    ocrText?: string;
  },
) {
  const origin = req.nextUrl.origin;
  const target = dispatchShareTarget(payload);
  if (target) {
    return NextResponse.redirect(new URL(target, origin), 303);
  }
  return NextResponse.redirect(new URL("/", origin), 303);
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return loginRedirect(req);

  const sp = req.nextUrl.searchParams;
  return dispatch(req, {
    title: sp.get("title") || "",
    text: sp.get("text") || "",
    url: sp.get("url") || "",
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return loginRedirect(req);

  let title = "";
  let text = "";
  let url = "";
  let imagePath: string | undefined;
  let ocrText: string | undefined;

  const contentType = req.headers.get("content-type") || "";
  const isMultipart =
    contentType.includes("multipart/form-data") ||
    contentType.includes("application/x-www-form-urlencoded");

  if (isMultipart) {
    const form = await req.formData();
    title = (form.get("title") as string) || "";
    text = (form.get("text") as string) || "";
    url = (form.get("url") as string) || "";

    // First valid image wins
    const files = form.getAll("files");
    for (const f of files) {
      if (!(f instanceof File)) continue;
      if (!f.type.startsWith("image/")) continue;
      if (!ALLOWED_TYPES.includes(f.type)) continue;
      if (f.size > MAX_BYTES) continue;

      ensureDir(UPLOAD_DIR);
      const ext =
        f.type === "image/png" ? ".png" :
        f.type === "image/webp" ? ".webp" :
        f.type === "image/gif" ? ".gif" : ".jpg";
      const filename = `${ulid()}${ext}`;
      const fullPath = path.join(UPLOAD_DIR, filename);
      const buf = Buffer.from(await f.arrayBuffer());
      try {
        fs.writeFileSync(fullPath, buf);
        imagePath = `coupons/${filename}`;
      } catch (err) {
        console.error("Share-target image write failed:", err);
        break;
      }

      try {
        const ocr = await import("@/lib/ocr").catch(() => null);
        if (ocr) ocrText = await ocr.runOcr(fullPath);
      } catch (err) {
        console.error("Share-target OCR failed:", err);
      }
      break;
    }
  } else {
    const sp = req.nextUrl.searchParams;
    title = sp.get("title") || "";
    text = sp.get("text") || "";
    url = sp.get("url") || "";
  }

  return dispatch(req, { title, text, url, imagePath, ocrText });
}
