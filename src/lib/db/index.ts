import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import Database from "better-sqlite3";
import * as schema from "./schema";
import path from "path";
import fs from "fs";

const dbPath = process.env.DATABASE_PATH || "./data/location-manager.db";

const dir = path.dirname(dbPath);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema });

// Auto-run pending migrations on every boot. The 0000 baseline uses
// IF NOT EXISTS so it's a safe no-op against DBs that were originally
// provisioned via `drizzle-kit push`. Future migrations apply normally.
//
// Migrations live in ./drizzle at the project root; in the standalone
// build they're copied alongside server.js — see Dockerfile.
const migrationsFolder = process.env.DRIZZLE_MIGRATIONS_FOLDER
  ?? path.join(process.cwd(), "drizzle");

if (fs.existsSync(migrationsFolder)) {
  try {
    migrate(db, { migrationsFolder });
  } catch (err) {
    // Migrator failures are fatal — better to crash on boot than to serve
    // requests against a DB whose shape doesn't match the code.
    console.error("[db] migration failed:", err);
    throw err;
  }
} else {
  console.warn(`[db] migrations folder not found at ${migrationsFolder} — skipping`);
}
