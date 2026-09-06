import { config } from "dotenv";
import { spawnSync } from "node:child_process";

config({ path: ".env.local" });

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("Missing DATABASE_URL in .env.local");
    console.error("");
    console.error("1. Copy your Neon connection string from Vercel → Settings → Environment Variables");
    console.error("2. Create .env.local with:");
    console.error("   DATABASE_URL=postgresql://...");
    console.error("   AUTH_SECRET=your-vercel-auth-secret");
    console.error("3. Run: npm run db:setup");
    process.exit(1);
  }

  console.log("Pushing schema to Neon...");
  const push = spawnSync("npx", ["drizzle-kit", "push", "--force"], {
    stdio: "inherit",
    shell: true,
    env: process.env,
  });

  if (push.status !== 0) {
    process.exit(push.status ?? 1);
  }

  console.log("Seeding demo data...");
  const seed = spawnSync("npx", ["tsx", "scripts/seed.ts"], {
    stdio: "inherit",
    shell: true,
    env: process.env,
  });

  if (seed.status !== 0) {
    process.exit(seed.status ?? 1);
  }

  console.log("");
  console.log("Setup complete. You can log in with:");
  console.log("  Gym slug: demo-gym");
  console.log("  Email:    owner@demo.gymsynk.net");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
