import * as schema from "./schema";

// Only initialize database if POSTGRES_URL is configured
let db: ReturnType<typeof import("drizzle-orm/vercel-postgres").drizzle> | null =
  null;

if (process.env.POSTGRES_URL) {
  // Dynamic import to avoid errors when no connection string is set
  const { sql } = await import("@vercel/postgres");
  const { drizzle } = await import("drizzle-orm/vercel-postgres");
  db = drizzle({
    client: sql,
    schema,
    casing: "snake_case",
  });
}

export { db };
