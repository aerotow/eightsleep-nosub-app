import {drizzle as drizzleVercel, VercelPgDatabase} from 'drizzle-orm/vercel-postgres';
import {drizzle as drizzleNeon, NeonHttpDatabase} from 'drizzle-orm/neon-http';
import { sql } from "@vercel/postgres";

import {neon, neonConfig} from "@neondatabase/serverless";

let sqlClient;
let sqlDriver: NeonHttpDatabase | VercelPgDatabase;

// Swap to use Postgres driver if not in Vercel mode
if (process.env.LOCAL_DB) {
  console.log('Using neon');
  const port = process.env.POSTGRES_PORT || 54321;
  neonConfig.wsProxy = (host) => `${host}:${port}/v1`;
  neonConfig.useSecureWebSocket = false;
  neonConfig.pipelineTLS = false;
  neonConfig.pipelineConnect = false;
  sqlClient = neon(process.env.POSTGRES_URL!)
  sqlDriver = drizzleNeon(sqlClient)
} else {
  sqlClient = sql;
  sqlDriver = drizzleVercel(sql)
}

export const db = sqlDriver
