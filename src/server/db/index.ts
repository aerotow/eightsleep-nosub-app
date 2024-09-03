import { drizzle } from 'drizzle-orm/vercel-postgres';
import { sql } from "@vercel/postgres";

import * as schema from "./schema";
import {neonConfig} from "@neondatabase/serverless";

// Swap to use Postgres driver if not in Vercel mode
if (process.env.LOCAL_DB) {
  neonConfig.wsProxy = (host) => `${host}:54321/v1`;
  neonConfig.useSecureWebSocket = false;
  neonConfig.pipelineTLS = false;
  neonConfig.pipelineConnect = false;
}

export const db = drizzle(sql, { schema })
