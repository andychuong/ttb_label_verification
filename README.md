# TTB Label Verification App

AI-Powered Alcohol Label Verification App built with Next.js, Firebase, and OpenAI GPT-4o.

## Overview

This application simulates the TTB (Alcohol and Tobacco Tax and Trade Bureau) alcohol label approval process. Producers submit product information and a label image. The system uses GPT-4o to verify the label matches the submitted data and meets federal labeling requirements.

**Two portals:**
- **User Portal** — Submit labels, track status, respond to revision requests
- **Admin Portal** — Review flagged submissions, approve/reject/request revisions

## Submission Fields

The form captures the core fields required for TTB label verification:

| Field | Required | Notes |
|-------|----------|-------|
| Product Type | Yes | Wine, Distilled Spirits, or Malt Beverage |
| Source | Yes | Domestic or Imported |
| Brand Name | Yes | As shown on label |
| Class/Type Designation | Yes | e.g. "Vodka", "Chardonnay", "IPA" |
| Alcohol Content | Yes | ABV percentage |
| Net Contents | Yes | e.g. "750 mL" |
| Name & Address on Label | Yes | Bottler/producer name and address |
| Country of Origin | Conditional | Required if imported |
| Health Warning Confirmed | Yes | Confirms government warning is on label |

## Tech Stack

- **Frontend:** Next.js 16 (App Router) + React + TypeScript + Tailwind CSS
- **Backend:** Next.js API Routes + Firebase Admin SDK
- **Database:** Cloud Firestore
- **Auth:** Firebase Authentication (email/password)
- **Storage:** Firebase Cloud Storage
- **AI:** OpenAI GPT-4o Vision API
- **Background Jobs:** Cloud Functions for Firebase

## Getting Started

```bash
# Install dependencies
npm install
cd functions && npm install && cd ..

# Set up environment variables
cp .env.example .env.local
# Fill in Firebase and OpenAI credentials

# Start Firebase Emulators (requires Java 21+)
JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home \
  npx firebase emulators:start --project label-validation-449b0

# Start dev server (in a separate terminal)
FIREBASE_AUTH_EMULATOR_HOST="127.0.0.1:9099" \
  FIRESTORE_EMULATOR_HOST="127.0.0.1:8080" \
  FIREBASE_STORAGE_EMULATOR_HOST="127.0.0.1:9199" \
  npx next dev --port 3000
```

Open [http://localhost:3000](http://localhost:3000) to use the app.

## AI Validation

When a submission is created, a Cloud Function triggers GPT-4o to:

1. Extract all visible text from the label image
2. Compare each field against the submitted form data
3. Check for required elements (health warning, name/address)
4. Return a structured pass/fail result

**Tier 1 Critical Checks** (must all pass for auto-approval):
- Brand Name match
- Class/Type Designation match
- Alcohol Content exact numeric match
- Net Contents match (with unit normalization)
- Health Warning Statement present
- Name & Address present

If all checks pass, the submission is auto-approved. Otherwise, it's flagged for admin review.

## Project Structure

```
src/
├── app/
│   ├── (auth)/          # Login, Register, Reset Password
│   ├── (user)/          # Dashboard, Submissions, Profile
│   ├── (admin)/         # Admin Dashboard, Submission Review
│   └── api/             # API Routes
├── components/
│   ├── ui/              # Shared UI components
│   ├── submission/      # Validation results, image upload
│   └── admin/           # Review panel, AI report viewer
├── lib/
│   ├── firebase/        # Client & Admin SDK setup
│   ├── auth/            # Auth context & route guards
│   ├── hooks/           # Firestore real-time hooks
│   └── validation/      # Zod schemas
└── types/               # TypeScript interfaces

functions/
└── src/
    ├── index.ts          # Cloud Functions (validation triggers)
    └── prompt.ts         # GPT-4o system prompt
```

## Documentation

- [PRD](docs/prd.md) — Product requirements
- [Architecture](docs/architecture.md) — System design & data flow
- [Workflow Examples](docs/workflow-examples.md) — User & admin workflow scenarios
- [Tasks](docs/tasks.md) — Build task list with phase tracking
