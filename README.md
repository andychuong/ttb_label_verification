# TTB Label Verification App

AI-powered alcohol label verification prototype that automates the TTB (Alcohol and Tobacco Tax and Trade Bureau) label compliance review process. Producers submit product data and a label image; GPT-4o-mini extracts text from the label and validates it against the submitted form fields and federal labeling requirements.

**Live demo:** <https://ttblabel.vercel.app>

## Approach

The core insight from the stakeholder interviews is that most of what compliance agents do is **matching** — verifying that what's on the label matches the application. This prototype automates that matching step with a vision-language model, freeing agents to focus on edge cases that require human judgment.

**Architecture decisions:**

- **Next.js App Router** for the frontend and API layer. Server-side API routes handle Firebase Admin operations (auth verification, Firestore writes) so credentials never reach the client.
- **Firebase** (Auth, Firestore, Storage, Cloud Functions) for the backend. Firestore's real-time listeners give instant UI updates when validation completes — no polling required on the client.
- **Cloud Functions triggers** instead of synchronous API calls. When a label image is uploaded, an `onDocumentCreated` trigger on the images subcollection fires and runs validation asynchronously. This keeps the submission flow fast and lets validation run in the background.
- **GPT-4o-mini** for label analysis. It handles varied image quality (angles, lighting, glare) and returns structured JSON with per-field match results. The `detail: "auto"` setting lets the model choose the right resolution, balancing speed and accuracy.
- **Two-tier outcome logic:** If all 6 critical fields pass with high confidence, the submission auto-approves. Otherwise it's flagged for admin review. This keeps agents in the loop for ambiguous cases (like Dave's "STONE'S THROW" vs "Stone's Throw" example).

**Trade-offs and limitations:**

- No batch upload support (mentioned by Janet). Would be a natural next step — the data model supports it, just needs a multi-file upload UI.
- No integration with the existing COLA system (out of scope per Marcus).
- Image validation depends on OpenAI API availability. If the API is down, submissions are flagged for manual admin review with an error message.
- The government warning check relies on the AI detecting the warning text in the image. Very small font or poor image quality may cause false negatives.

## Tech Stack

| Layer | Technology |
| ----- | ---------- |
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4 |
| Backend | Next.js API Routes, Firebase Admin SDK |
| Database | Cloud Firestore (real-time listeners) |
| Auth | Firebase Authentication (email/password) |
| Storage | Firebase Cloud Storage |
| AI | OpenAI GPT-4o-mini Vision API |
| Background Jobs | Cloud Functions for Firebase (v2) |
| Hosting | Vercel (frontend), Firebase (functions/rules) |
| Validation | Zod (form schemas), React Hook Form |

## Getting Started

### Prerequisites

- Node.js 18+
- Java 21+ (for Firebase emulators)
- Firebase CLI (`npm install -g firebase-tools`)
- A Firebase project with Auth, Firestore, and Storage enabled
- An OpenAI API key

### Setup

```bash
# Clone and install dependencies
git clone <repo-url>
cd ttb_label
npm install
cd functions && npm install && cd ..

# Configure environment variables
cp .env.example .env.local
# Fill in your Firebase and OpenAI credentials (see .env.example for required vars)
```

### Running locally with emulators

```bash
# Terminal 1: Start Firebase emulators
JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home \
  npx firebase emulators:start --project <your-project-id>

# Terminal 2: Start Next.js dev server
FIREBASE_AUTH_EMULATOR_HOST="127.0.0.1:9099" \
  FIRESTORE_EMULATOR_HOST="127.0.0.1:8080" \
  FIREBASE_STORAGE_EMULATOR_HOST="127.0.0.1:9199" \
  npx next dev --port 3000
```

Open [http://localhost:3000](http://localhost:3000). The emulator UI is at [http://localhost:4000](http://localhost:4000).

### Deploying

```bash
# Deploy Cloud Functions, Firestore rules, Storage rules
firebase deploy --only functions,firestore,storage

# Deploy frontend to Vercel
vercel --prod
```

### Setting up an admin user

After creating a user account through the app, grant admin access via the Firebase console or CLI:

```bash
# Using the Firebase Admin SDK or Cloud Shell
node -e "
  const admin = require('firebase-admin');
  admin.initializeApp();
  admin.auth().setCustomUserClaims('<user-uid>', { role: 'admin' });
"
```

## Features

### User Portal

- **Multi-step submission form** — Product info, image upload, and review steps with conditional fields by product type (wine, spirits, malt beverage)
- **Real-time validation status** — Dashboard updates instantly when AI validation completes
- **Revise & resubmit** — When an admin requests revisions, users can edit and resubmit without creating a new submission
- **Persistent auth** — Sessions survive browser restarts

### Admin Portal

- **Review queue** — Flagged submissions sorted by priority, with "Needs Attention" tab for items requiring human review
- **AI validation report** — Per-field match/mismatch results, compliance warnings, extracted text, and confidence level
- **Review actions** — Approve, request revisions (with feedback), or reject with required reasoning
- **Dashboard stats** — Aggregated counts by status

### AI Validation Pipeline

- **Trigger:** `onDocumentCreated` on `submissions/{id}/images/{imageId}` — starts validation as soon as an image is uploaded
- **Re-trigger:** `onDocumentUpdated` on `submissions/{id}` — re-validates on resubmit or edit
- **Deduplication:** Skips if `validationInProgress` is already true (handles multi-image uploads)
- **Version checking:** Discards stale results if the submission was modified during validation
- **Error recovery:** Flags submission for admin review on API failures

**Tier 1 critical checks** (all must pass for auto-approval):
- Brand Name match
- Class/Type Designation match
- Alcohol Content numeric match
- Net Contents match (with unit normalization)
- Health Warning Statement present
- Name & Address present

## Project Structure

```
src/
├── app/
│   ├── (auth)/            # Login, Register, Reset Password
│   ├── (user)/            # Dashboard, Submissions, Profile
│   ├── (admin)/admin/     # Admin Dashboard, Submission Review
│   └── api/               # REST API Routes
├── components/
│   ├── ui/                # Reusable UI components (Button, Modal, etc.)
│   ├── submission/        # ValidationResultsPanel, ImageUploader, FieldCheckRow
│   └── admin/             # ReviewActionPanel, AiReportViewer
├── lib/
│   ├── firebase/          # Client SDK init, Admin SDK init, Storage helpers
│   ├── auth/              # AuthContext provider, RequireAuth/RequireAdmin guards
│   ├── hooks/             # Real-time Firestore hooks (useSubmission, useAdminQueue)
│   └── validation/        # Zod form schemas
└── types/                 # TypeScript interfaces (submission, validation)

functions/
└── src/
    ├── index.ts           # Cloud Functions (onImageCreated, onSubmissionUpdated, setAdminClaim)
    └── prompt.ts          # GPT-4o system prompt with TTB regulatory rules

examples/                  # Sample label images (SVG + PNG) for testing
```

## Sample Labels

The `examples/` directory contains sample labels for each product type that can be used for testing:

- `sample-wine-label` — Wine (Cabernet Sauvignon, 14.5% ABV, 750 mL)
- `sample-spirits-label` — Spirits (Bourbon Whiskey, 45% ABV, 750 mL)
- `sample-malt-label` — Malt Beverage (IPA, 6.8% ABV, 12 FL OZ)
