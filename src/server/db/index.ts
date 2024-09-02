import { drizzle } from 'drizzle-orm/vercel-postgres';
import {createClient, sql} from "@vercel/postgres";

import * as schema from "./schema";

let client;
client = sql

if (process.env.LOCAL_DB) {
  console.log('Using Docker')
  client = createClient({
    // MY GOD VERCEL Y DO U DO DIS
    connectionString: process.env.POSTGRES_URL,
  })
}

export const db = drizzle(client, { schema })
