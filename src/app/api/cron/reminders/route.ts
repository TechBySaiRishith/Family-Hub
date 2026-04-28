import { NextRequest, NextResponse } from "next/server";
import { runReminders } from "@/lib/reminders/scheduler";
import { getReminderConfig } from "@/lib/reminders/settings";

export async function GET(req: NextRequest) {
  const config = await getReminderConfig();
  if (!config.cronToken) {
    return NextResponse.json({ error: "Cron token not configured" }, { status: 503 });
  }

  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (token !== config.cronToken) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const result = await runReminders(req.nextUrl.origin);
  return NextResponse.json(result);
}

export const POST = GET;
