import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ulid } from "ulid";
import { setSetting } from "@/lib/reminders/settings";

export async function POST() {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const token = ulid();
  await setSetting("reminder_cron_token", token);
  return NextResponse.json({ token });
}
