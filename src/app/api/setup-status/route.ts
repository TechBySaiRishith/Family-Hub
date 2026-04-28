import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { count } from "drizzle-orm";

export async function GET() {
  const userCount = await db.select({ value: count() }).from(users);
  const isFirstUser = userCount[0].value === 0;
  return NextResponse.json({ isFirstUser, userCount: userCount[0].value });
}
