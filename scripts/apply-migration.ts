import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { readFile } from "node:fs/promises";
import path from "node:path";

config({ path: ".env.local" });

/**
 * Runs a single numbered file from drizzle/migrations against DATABASE_URL.
 *
 * `drizzle-kit push` only diffs the schema, so it silently skips the data
 * steps some migrations need (backfills, de-duplication before a new unique
 * index). Use this when a migration file has to run verbatim.
 *
 *   npm run db:migrate 0011_booking_waitlist
 *
 * The Neon HTTP driver sends one statement per request, so the file is split
 * on semicolons. That means migrations run here must not contain semicolons
 * inside string literals or dollar-quoted function bodies.
 */
function splitStatements(sql: string) {
  return sql
    .split(";")
    .map((statement) => statement.trim())
    .filter((statement) => {
      if (statement.length === 0) {
        return false;
      }

      // Skip chunks that are nothing but comments.
      return statement
        .split("\n")
        .some((line) => line.trim() && !line.trim().startsWith("--"));
    });
}

async function main() {
  const name = process.argv[2];

  if (!name) {
    console.error("Usage: npm run db:migrate <migration-name>");
    console.error("Example: npm run db:migrate 0011_booking_waitlist");
    process.exit(1);
  }

  if (!process.env.DATABASE_URL) {
    console.error("Missing DATABASE_URL in .env.local");
    process.exit(1);
  }

  const file = path.join(
    process.cwd(),
    "drizzle",
    "migrations",
    name.endsWith(".sql") ? name : `${name}.sql`,
  );

  const contents = await readFile(file, "utf8");
  const statements = splitStatements(contents);

  console.log(`Applying ${path.basename(file)} (${statements.length} statements)`);

  const sql = neon(process.env.DATABASE_URL);

  for (const [index, statement] of statements.entries()) {
    const preview = statement.replace(/\s+/g, " ").slice(0, 90);
    process.stdout.write(`  [${index + 1}/${statements.length}] ${preview}… `);

    try {
      await sql.query(statement);
      console.log("ok");
    } catch (error) {
      console.log("failed");
      throw error;
    }
  }

  console.log("Migration applied.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
