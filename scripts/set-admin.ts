/**
 * Admin Seed Script
 *
 * Sets the `role: 'admin'` custom claim on a Firebase Auth user.
 *
 * Usage:
 *   npx tsx scripts/set-admin.ts <USER_UID>
 *
 * Requires FIREBASE_ADMIN_* env vars to be set in .env.local
 */

import { initializeApp, cert, type ServiceAccount } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { config } from "dotenv";

config({ path: ".env.local" });

const uid = process.argv[2];

if (!uid) {
  console.error("Usage: npx tsx scripts/set-admin.ts <USER_UID>");
  process.exit(1);
}

const serviceAccount: ServiceAccount = {
  projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
  clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n"),
};

const app = initializeApp({ credential: cert(serviceAccount) });
const adminAuth = getAuth(app);

async function setAdmin() {
  try {
    await adminAuth.setCustomUserClaims(uid, { role: "admin" });
    const user = await adminAuth.getUser(uid);
    console.log(`Admin claim set for user: ${user.email} (${uid})`);
    console.log("Custom claims:", user.customClaims);
  } catch (err) {
    console.error("Failed to set admin claim:", err);
    process.exit(1);
  }
}

setAdmin();
