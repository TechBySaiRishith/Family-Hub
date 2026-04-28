import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { notificationPreferences } from "@/lib/db/schema";
import { updateNotificationPrefsSchema } from "@/lib/validations";
import { eq } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const prefs = await db.query.notificationPreferences.findFirst({
    where: eq(notificationPreferences.userId, session.user.id),
  });

  if (!prefs) {
    return NextResponse.json({
      pushEnabled: false,
      pushSubscription: null,
      emailEnabled: false,
      emailAddress: "",
      whatsappEnabled: false,
      whatsappNumber: "",
      daysBeforeExpiry: 3,
    });
  }

  return NextResponse.json({
    pushEnabled: prefs.pushEnabled,
    pushSubscription: prefs.pushSubscription,
    emailEnabled: prefs.emailEnabled,
    emailAddress: prefs.emailAddress || "",
    whatsappEnabled: prefs.whatsappEnabled,
    whatsappNumber: prefs.whatsappNumber || "",
    daysBeforeExpiry: prefs.daysBeforeExpiry,
  });
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = updateNotificationPrefsSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const existing = await db.query.notificationPreferences.findFirst({
    where: eq(notificationPreferences.userId, session.user.id),
  });

  if (existing) {
    await db
      .update(notificationPreferences)
      .set(parsed.data)
      .where(eq(notificationPreferences.userId, session.user.id));
  } else {
    await db.insert(notificationPreferences).values({
      userId: session.user.id,
      ...parsed.data,
    });
  }

  return NextResponse.json({ success: true });
}
