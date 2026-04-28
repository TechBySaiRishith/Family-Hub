import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// Admin-only: full user objects with email/role/createdAt for the family roster
export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const allUsers = await db.query.users.findMany({
    columns: { id: true, name: true, email: true, role: true, createdAt: true },
  });

  return NextResponse.json(allUsers);
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "User ID required" }, { status: 400 });
  if (id === session.user.id) return NextResponse.json({ error: "Cannot delete yourself" }, { status: 400 });

  try {
    await db.delete(users).where(eq(users.id, id));
    return NextResponse.json({ success: true });
  } catch (err) {
    // FK restrict — user has content (locations, coupons, reviews) attached
    const message = err instanceof Error ? err.message : "Unknown error";
    if (message.includes("FOREIGN KEY")) {
      return NextResponse.json(
        {
          error: "Cannot remove this member while they have saved places, coupons, or reviews. Reassign or delete their content first.",
        },
        { status: 409 }
      );
    }
    throw err;
  }
}
