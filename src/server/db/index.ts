import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { env } from "~/env";
import * as schema from "./schema";

const client = postgres(env.POSTGRES_URL, { prepare: false, max: 1 });

export const db = drizzle(client, { schema });
