/**
 * Cloudflare D1 is accessed via `env.rent` (the binding defined in wrangler.toml).
 * We wrap it with Drizzle ORM so we can write type-safe queries instead of raw SQL.
 *
 * WHY A FACTORY FUNCTION?
 * Cloudflare Workers don't have a persistent process — each request gets a fresh
 * execution context. So we create a new Drizzle instance per request by passing
 * `env.rent` into this function from the route handler.
 *
 * Usage:
 *   import { createDb } from "../db/client";
 *   const db = createDb(env.rent);
 *   const users = await db.select().from(usersTable);
 */

import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

export function createDb(d1: D1Database) {
    return drizzle(d1, { schema });
}

// Convenience type alias — use this when you need to type the `db` variable
export type DrizzleDb = ReturnType<typeof createDb>;