import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";

// Detect if running in Cloudflare Workers environment
const isCloudflareWorker =
  typeof globalThis !== "undefined" && "Cloudflare" in globalThis;

// Database instance for Node.js environment
let dbInstance: ReturnType<typeof drizzle> | null = null;

export function db() {
  const databaseUrl = process.env.DATABASE_URL;
  
  // For development without database, return a mock object
  if (!databaseUrl) {
    console.warn("DATABASE_URL is not set, using mock database for development");
    return {
      select: () => ({ from: () => ({ where: () => Promise.resolve([]) }) }),
      insert: () => ({ values: () => Promise.resolve({ insertId: "mock" }) }),
      update: () => ({ set: () => ({ where: () => Promise.resolve() }) }),
      delete: () => ({ where: () => Promise.resolve() }),
    } as any;
  }

  // In Cloudflare Workers, create new connection each time
  if (isCloudflareWorker) {
    // Workers environment uses minimal configuration
    const connection = mysql.createConnection(databaseUrl);
    return drizzle(connection);
  }

  // In Node.js environment, use singleton pattern
  if (dbInstance) {
    return dbInstance;
  }

  // Node.js environment with connection pool configuration
  const pool = mysql.createPool({
    uri: databaseUrl,
    connectionLimit: 10, // Maximum connections in pool
    acquireTimeout: 10000, // Connection timeout (milliseconds)
    idleTimeout: 30000, // Idle connection timeout (milliseconds)
  });
  dbInstance = drizzle(pool);

  return dbInstance;
}
