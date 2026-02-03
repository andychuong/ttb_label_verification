/**
 * Seed Script: Create test user + test admin in Firebase Auth & Firestore
 *
 * Usage:
 *   npx tsx scripts/seed-users.ts
 *
 * Creates:
 *   - smoketest@example.com (TestPass123) — regular user
 *   - admin@example.com (AdminPass123) — admin user with custom claim
 *
 * Requires FIREBASE_ADMIN_* env vars in .env.local
 */

import { initializeApp, cert, type ServiceAccount } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { config } from "dotenv";

config({ path: ".env.local" });

const serviceAccount: ServiceAccount = {
  projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
  clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n"),
};

const app = initializeApp({ credential: cert(serviceAccount) });
const auth = getAuth(app);
const db = getFirestore(app);

interface SeedUser {
  email: string;
  password: string;
  displayName: string;
  isAdmin: boolean;
  profile: {
    fullName: string;
    phoneNumber: string;
    companyName: string;
    companyAddress: string;
    mailingAddress: string | null;
    permitRegistryNumber: string;
    representativeId: string | null;
  };
}

const users: SeedUser[] = [
  {
    email: "smoketest@example.com",
    password: "TestPass123",
    displayName: "Smoke Test User",
    isAdmin: false,
    profile: {
      fullName: "Smoke Test User",
      phoneNumber: "555-0100",
      companyName: "Test Winery LLC",
      companyAddress: "123 Vine St, Napa, CA 94558",
      mailingAddress: null,
      permitRegistryNumber: "BWN-CA-12345",
      representativeId: null,
    },
  },
  {
    email: "admin@example.com",
    password: "AdminPass123",
    displayName: "Test Admin",
    isAdmin: true,
    profile: {
      fullName: "Test Admin",
      phoneNumber: "555-0200",
      companyName: "TTB Review Office",
      companyAddress: "1310 G St NW, Washington, DC 20005",
      mailingAddress: null,
      permitRegistryNumber: "TTB-ADMIN-001",
      representativeId: "ADM-001",
    },
  },
];

async function createOrUpdateUser(seed: SeedUser) {
  let uid: string;

  try {
    // Check if user already exists
    const existing = await auth.getUserByEmail(seed.email);
    uid = existing.uid;
    console.log(`  Found existing user: ${seed.email} (${uid})`);
  } catch {
    // User doesn't exist — create it
    const created = await auth.createUser({
      email: seed.email,
      password: seed.password,
      displayName: seed.displayName,
      emailVerified: true,
    });
    uid = created.uid;
    console.log(`  Created user: ${seed.email} (${uid})`);
  }

  // Set custom claims
  if (seed.isAdmin) {
    await auth.setCustomUserClaims(uid, { role: "admin" });
    console.log(`  Set admin claim for ${seed.email}`);
  }

  // Write Firestore profile
  await db.doc(`users/${uid}`).set(
    {
      email: seed.email,
      ...seed.profile,
      role: seed.isAdmin ? "admin" : "user",
      profileComplete: true,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
  console.log(`  Wrote Firestore profile for ${seed.email}`);

  return uid;
}

async function main() {
  console.log("Seeding users to Firebase project:", process.env.FIREBASE_ADMIN_PROJECT_ID);
  console.log("");

  for (const seed of users) {
    console.log(`[${seed.isAdmin ? "ADMIN" : "USER"}] ${seed.email}`);
    await createOrUpdateUser(seed);
    console.log("");
  }

  console.log("Done! You can now log in with:");
  console.log("  User:  smoketest@example.com / TestPass123");
  console.log("  Admin: admin@example.com / AdminPass123");
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
