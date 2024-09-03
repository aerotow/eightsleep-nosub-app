import { drizzle as vercelDrizzle } from 'drizzle-orm/vercel-postgres';
import { drizzle as postgresDrizzle } from 'drizzle-orm/postgres-js';
import { sql } from "@vercel/postgres";

import * as schema from "./schema";
import postgres from "postgres";

let client;

// Swap to use Postgres driver if not in Vercel mode
if (process.env.LOCAL_DB) {
  console.log('Using Docker')
  console.log(process.env.POSTGRES_URL)
  const psql = postgres(String(process.env.POSTGRES_URL), {
    idle_timeout: 10000,
  });
  client = postgresDrizzle(psql, { schema })
} else {
  client = vercelDrizzle(sql, { schema })
}

export const db = client
