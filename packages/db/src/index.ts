import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

const DATABASE_URL = process.env.DATABASE_URL;

let pool: pg.Pool | null = null;
let db: ReturnType<typeof drizzle<typeof schema>> | null = null;

if (DATABASE_URL) {
  pool = new Pool({ connectionString: DATABASE_URL });
  db = drizzle(pool, { schema });
} else {
  console.warn(
    "[Murivest DB] DATABASE_URL not set - database operations will fail. Please add a Supabase integration.",
  );
}

export { pool, db };
export * from "./schema";
