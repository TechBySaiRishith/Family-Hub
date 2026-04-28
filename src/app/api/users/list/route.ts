import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * Lightweight roster of family members — id + name only.
 * Available to any logged-in user so we can render "added by",
 * "claimed by" and similar attributions across mini-apps.
 */
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await db.query.users.findMany({
    columns: { id: true, name: true },
  });

  return NextResponse.json(rows);
}
