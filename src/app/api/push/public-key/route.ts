import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSetting } from "@/lib/reminders/settings";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const publicKey = await getSetting("vapid_public_key");
  return NextResponse.json({ publicKey: publicKey || null });
}
