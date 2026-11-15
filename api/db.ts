import { createClient } from "@libsql/client";

let dbInstance: any = null;

export function getDb() {
  if (dbInstance) return dbInstance;

  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url || url.trim() === "") {
    console.log("[Database] TURSO_DATABASE_URL is not set. Falling back to local SQLite file: who_hand_hygiene.db");
    dbInstance = createClient({ url: "file:who_hand_hygiene.db" });
  } else {
    console.log("[Database] Connecting to Turso Database...");
    dbInstance = createClient({ url, authToken });
  }

  return dbInstance;
}
