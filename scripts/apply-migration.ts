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
 * index, DO blocks). Use this when a migration file has to run verbatim.
 *
 *   npm run db:migrate 0011_booking_waitlist
 *
 * The Neon HTTP driver sends one statement per request, so the file has to be
 * split locally. Semicolons inside string literals, comments, and dollar-quoted
 * blocks are ignored so `DO $$ ... END $$;` survives intact.
 */
function splitStatements(sql: string) {
  const statements: string[] = [];
  let current = "";
  let index = 0;

  while (index < sql.length) {
    const rest = sql.slice(index);

    // Line comment.
    if (rest.startsWith("--")) {
      const newline = sql.indexOf("\n", index);
      const end = newline === -1 ? sql.length : newline;
      current += sql.slice(index, end);
      index = end;
      continue;
    }

    // Block comment.
    if (rest.startsWith("/*")) {
      const close = sql.indexOf("*/", index + 2);
      const end = close === -1 ? sql.length : close + 2;
      current += sql.slice(index, end);
      index = end;
      continue;
    }

    // Single-quoted string, including '' escapes.
    if (rest.startsWith("'")) {
      let cursor = index + 1;

      while (cursor < sql.length) {
        if (sql[cursor] === "'") {
          if (sql[cursor + 1] === "'") {
            cursor += 2;
            continue;
          }
          cursor += 1;
          break;
        }
        cursor += 1;
      }

      current += sql.slice(index, cursor);
      index = cursor;
      continue;
    }

    // Dollar-quoted block: $$ ... $$ or $tag$ ... $tag$.
    const dollarTag = /^\$[A-Za-z_]*\$/.exec(rest);

    if (dollarTag) {
      const tag = dollarTag[0];
      const close = sql.indexOf(tag, index + tag.length);
      const end = close === -1 ? sql.length : close + tag.length;
      current += sql.slice(index, end);
      index = end;
      continue;
    }

    if (sql[index] === ";") {
      statements.push(current);
      current = "";
      index += 1;
      continue;
    }

    current += sql[index];
    index += 1;
  }

  statements.push(current);

  return statements
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
