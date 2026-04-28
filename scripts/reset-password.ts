import Database from "better-sqlite3";
import bcrypt from "bcryptjs";

const [, , email, newPassword] = process.argv;

if (!email || !newPassword) {
  console.error("Usage: pnpm exec tsx scripts/reset-password.ts <email> <new-password>");
  process.exit(1);
}

const db = new Database("data/location-manager.db");
const hash = bcrypt.hashSync(newPassword, 12);
const result = db.prepare("UPDATE users SET password_hash = ? WHERE email = ?").run(hash, email);

if (result.changes === 0) {
  console.error(`No user found with email: ${email}`);
  process.exit(1);
}

console.log(`Password reset for ${email}`);
