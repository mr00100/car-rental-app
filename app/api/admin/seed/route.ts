import { jsonOk, jsonError, handleApiError } from "@/lib/api";
import { db } from "@/db";
import { users } from "@/db/schema";
import { sql } from "drizzle-orm";

// Protected seed endpoint for initial setup only
export async function POST() {
  try {
    const [count] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(users);

    // Only allow seed if no users exist OR SEED_SECRET matches
    const seedSecret = process.env.SEED_SECRET;
    // Allow if empty DB
    if ((count?.count ?? 0) > 0 && process.env.ALLOW_RESEED !== "true") {
      return jsonError("Database already seeded", 400);
    }

    // Dynamically import and run seed
    const { execSync } = await import("child_process");
    execSync("npx tsx src/db/seed.ts", {
      stdio: "inherit",
      env: process.env as NodeJS.ProcessEnv,
    });

    return jsonOk({ message: "Database seeded successfully" });
  } catch (err) {
    return handleApiError(err);
  }
}
