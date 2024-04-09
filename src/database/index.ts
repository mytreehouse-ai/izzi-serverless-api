import { Pool, neon, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

export async function getPoolDb(databaseUrl: string) {
  const pool = new Pool({ connectionString: databaseUrl });
  pool.on("error", (err) => console.error(err)); // deal with e.g. re-connect
  const client = await pool.connect();
  return { client, pool };
}

export async function getDb(databaseUrl: string) {
  const sql = neon(databaseUrl);
  return sql;
}
