import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import webpush from "web-push";
import { setSetting } from "@/lib/reminders/settings";

export async function POST() {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const keys = webpush.generateVAPIDKeys();
  await setSetting("vapid_public_key", keys.publicKey);
  await setSetting("vapid_private_key", keys.privateKey);

  return NextResponse.json({ publicKey: keys.publicKey });
}
