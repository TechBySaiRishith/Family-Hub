import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { parseLinkSchema } from "@/lib/validations";
import { parseUrl, detectUrlType } from "@/lib/parsers";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = parseLinkSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid URL" }, { status: 400 });

  const { url } = parsed.data;

  // Only allow http(s) — keeps file:, ftp:, etc. away from server-side fetch
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }
  if (!/^https?:$/i.test(parsedUrl.protocol)) {
    return NextResponse.json({ error: "Only http(s) URLs are supported" }, { status: 400 });
  }

  // Block parsing of URLs we don't recognise — prevents this endpoint from
  // becoming a generic SSRF surface (e.g. probing internal Tailscale services).
  const urlType = detectUrlType(url);
  if (urlType === "unknown") {
    return NextResponse.json(
      { error: "Unsupported URL — paste a Google Maps or Instagram link" },
      { status: 400 }
    );
  }

  const result = await parseUrl(url);
  return NextResponse.json({ ...result, urlType, sourceUrl: url });
}
