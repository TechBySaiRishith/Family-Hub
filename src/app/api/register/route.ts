import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, appSettings } from "@/lib/db/schema";
import { registerSchema } from "@/lib/validations";
import { eq, count } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { ulid } from "ulid";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { name, email, password, inviteCode } = parsed.data;

  // Hash outside the transaction — bcrypt is slow and we don't want to hold the
  // SQLite write lock for ~100ms.
  const passwordHash = await bcrypt.hash(password, 12);
  const id = ulid();

  try {
    const result = db.transaction((tx) => {
      const userCount = tx.select({ value: count() }).from(users).all();
      const isFirstUser = userCount[0].value === 0;

      if (!isFirstUser) {
        const setting = tx
          .select()
          .from(appSettings)
          .where(eq(appSettings.key, "invite_code"))
          .all()[0];
        if (!setting || setting.value !== inviteCode) {
          throw new RegisterError("Invalid invite code", 403);
        }
      }

      const existing = tx.select().from(users).where(eq(users.email, email)).all()[0];
      if (existing) throw new RegisterError("Email already registered", 409);

      const role = isFirstUser ? "admin" : "member";
      tx.insert(users).values({ id, name, email, passwordHash, role }).run();

      if (isFirstUser) {
        tx.insert(appSettings)
          .values({ key: "invite_code", value: ulid().slice(0, 8).toLowerCase() })
          .onConflictDoNothing()
          .run();
        tx.insert(appSettings)
          .values({ key: "map_provider", value: "osm" })
          .onConflictDoNothing()
          .run();
      }

      return { id, name, email, role };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    if (err instanceof RegisterError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}

class RegisterError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}
