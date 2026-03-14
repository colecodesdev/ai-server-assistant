/**
 * Seed test users for Old Florida Fish House AI Server Assistant.
 *
 * Creates:
 *   - admin@ofhs.demo / Admin123! → role: admin
 *   - staff@ofhs.demo / Staff123! → role: staff
 *
 * Run with: npx tsx supabase/seed-users.ts
 *
 * Requires env vars:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local"
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

interface TestUser {
  email: string;
  password: string;
  role: "admin" | "staff";
}

const testUsers: TestUser[] = [
  { email: "admin@ofhs.demo", password: "Admin123!", role: "admin" },
  { email: "staff@ofhs.demo", password: "Staff123!", role: "staff" },
];

async function seedUsers() {
  console.log("🌱 Seeding test users…\n");

  for (const user of testUsers) {
    // 1. Create auth user (or find existing)
    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true, // auto-confirm for dev
      });

    if (authError) {
      // If user already exists, look them up
      if (authError.message?.includes("already been registered")) {
        console.log(`  ⏩ Auth user ${user.email} already exists, updating users table…`);

        // List users to find ID
        const { data: listData } = await supabase.auth.admin.listUsers();
        const existing = listData?.users?.find((u) => u.email === user.email);

        if (existing) {
          await upsertUserRecord(existing.id, user.email, user.role);
        } else {
          console.error(`  ❌ Could not find existing user ${user.email}`);
        }
        continue;
      }

      console.error(`  ❌ Failed to create ${user.email}:`, authError.message);
      continue;
    }

    const userId = authData.user.id;
    console.log(`  ✅ Created auth user: ${user.email} (${userId})`);

    // 2. Insert into users table with role
    await upsertUserRecord(userId, user.email, user.role);
  }

  console.log("\n✅ User seeding complete!\n");
  console.log("Test credentials:");
  console.log("  Admin: admin@ofhs.demo / Admin123!");
  console.log("  Staff: staff@ofhs.demo / Staff123!");
}

async function upsertUserRecord(
  id: string,
  email: string,
  role: "admin" | "staff"
) {
  const { error } = await supabase.from("users").upsert(
    { id, email, role },
    { onConflict: "id" }
  );

  if (error) {
    console.error(`  ❌ Failed to upsert users row for ${email}:`, error.message);
  } else {
    console.log(`  ✅ Users table: ${email} → role: ${role}`);
  }
}

seedUsers().catch(console.error);
