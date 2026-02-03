# Memory Bank: TTB Label Verification App

**Last Updated:** February 3, 2026
**Purpose:** Quick-reference knowledge base for building the AI-Powered Alcohol Label Verification App. Contains all critical decisions, schemas, structures, and rules extracted from prd.md, architecture.md, and workflow-examples.md.

---

## 1. Project Identity

- **What:** Web app that simulates TTB (Alcohol and Tobacco Tax and Trade Bureau) alcohol label approval
- **How:** Users submit product info (mirroring TTB Form 5100.31) + label image. GPT-4o vision validates the label matches the form and meets 27 CFR regulations.
- **Two Portals:** User Portal (producers submit labels) and Admin Portal (reviewers manage flagged submissions)
- **Firebase Project:** `label-validation-449b0`

---

## 2. Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js (App Router) + React + TypeScript |
| Styling | Tailwind CSS |
| Backend | Next.js API Routes + Firebase Admin SDK |
| Database | Cloud Firestore (NoSQL) |
| Auth | Firebase Authentication (email/password) |
| File Storage | Firebase Cloud Storage |
| Background Jobs | Cloud Functions for Firebase (Firestore triggers) |
| AI/Vision | OpenAI GPT-4o API (vision + JSON mode) |
| Form Handling | React Hook Form + Zod |
| Deployment | Vercel (Next.js) + Firebase (services) |

---

## 3. User Roles

| Role | How Created | Permissions |
|------|------------|-------------|
| **User** (Applicant) | Self-registration | Create/read/edit own submissions; manage own profile |
| **Admin** (Reviewer) | Manual via `admin.auth().setCustomUserClaims(uid, { role: 'admin' })` | Read all submissions; approve/revise/reject; view AI reports; see all users |

Admin role is stored as Firebase Auth custom claim AND mirrored in Firestore `users/{uid}.role`.

---

## 4. Environment Variables

```
# Client-side (NEXT_PUBLIC_ prefix — safe to expose)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Server-side only (NEVER expose to client)
FIREBASE_ADMIN_PROJECT_ID=
FIREBASE_ADMIN_CLIENT_EMAIL=
FIREBASE_ADMIN_PRIVATE_KEY=
OPENAI_API_KEY=
```

---

## 5. Directory Structure

```
src/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Public auth pages
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   └── reset-password/page.tsx
│   ├── (user)/                   # Authenticated user pages
│   │   ├── layout.tsx            # Sidebar + header shell
│   │   ├── dashboard/page.tsx
│   │   ├── profile/page.tsx
│   │   ├── submissions/
│   │   │   ├── new/
│   │   │   │   ├── page.tsx      # Multi-step form orchestrator
│   │   │   │   ├── step-form.tsx
│   │   │   │   ├── step-upload.tsx
│   │   │   │   └── step-review.tsx
│   │   │   └── [id]/page.tsx     # Submission detail
│   │   └── settings/page.tsx
│   ├── (admin)/                  # Admin pages
│   │   ├── layout.tsx            # Admin shell (role guard)
│   │   ├── dashboard/page.tsx
│   │   └── submissions/
│   │       └── [id]/page.tsx     # Admin detail + review
│   └── api/                      # API routes
│       ├── profile/route.ts
│       ├── submissions/route.ts
│       ├── submissions/[id]/route.ts
│       ├── submissions/[id]/resubmit/route.ts
│       ├── admin/stats/route.ts
│       ├── admin/submissions/route.ts
│       └── admin/submissions/[id]/review/route.ts
│
├── components/
│   ├── ui/                       # Button, Input, Card, Badge, Modal, Toast, etc.
│   ├── forms/                    # Form field components
│   ├── submission/               # ValidationResultsPanel, FieldCheckRow, ImageUploader, StatusBadge
│   └── admin/                    # ReviewActionPanel, AiReportViewer
│
├── lib/
│   ├── firebase/
│   │   ├── client.ts             # Client SDK init
│   │   ├── admin.ts              # Admin SDK init (server only)
│   │   └── storage.ts            # Upload helpers
│   ├── auth/
│   │   ├── context.tsx           # AuthProvider + useAuth hook
│   │   └── guards.tsx            # RequireAuth, RequireProfile, RequireAdmin
│   ├── hooks/
│   │   ├── useSubmissions.ts     # onSnapshot for submission list
│   │   ├── useSubmission.ts      # onSnapshot for single submission
│   │   └── useAdminQueue.ts      # onSnapshot for needs-attention queue
│   └── validation/
│       └── formSchemas.ts        # Zod schemas (shared client/server)
│
├── types/
│   ├── submission.ts
│   ├── user.ts
│   └── validation.ts
│
└── styles/
    └── globals.css               # Tailwind directives
```

---

## 6. Firestore Data Model

### 6.1 `users/{uid}`

```
email: string
fullName: string
phoneNumber: string
companyName: string
companyAddress: string
mailingAddress: string | null
permitRegistryNumber: string
representativeId: string | null
role: "user" | "admin"
profileComplete: boolean
createdAt: Timestamp
updatedAt: Timestamp
```

### 6.2 `submissions/{submissionId}`

```
userId: string (FK → users/{uid})
productType: "wine" | "distilled_spirits" | "malt_beverage"
source: "domestic" | "imported"
brandName: string
classTypeDesignation: string
alcoholContent: string
netContents: string
nameAddressOnLabel: string
countryOfOrigin: string | null           # required if imported
healthWarningConfirmed: boolean
status: "pending" | "approved" | "needs_revision" | "rejected"
needsAttention: boolean                  # flag for admin queue
validationInProgress: boolean            # lock for race conditions
version: number                          # optimistic locking counter
createdAt: Timestamp
updatedAt: Timestamp
```

### 6.3 Subcollections of `submissions/{submissionId}`

**`images/{imageId}`**
```
imageType: "brand_front" | "back" | "other"
storagePath: string
downloadUrl: string
originalFilename: string
mimeType: string
fileSize: number (bytes)
createdAt: Timestamp
```

**`validationResults/{resultId}`**
```
extractedText: string
fieldResults: array [{ fieldName, formValue, labelValue, matchStatus, notes }]
complianceWarnings: array
overallPass: boolean
confidence: "high" | "medium" | "low"
rawAiResponse: map
processedAt: Timestamp
createdAt: Timestamp
```

**`reviews/{reviewId}`**
```
adminId: string
action: "approved" | "needs_revision" | "rejected"
feedbackToUser: string | null
internalNotes: string | null
createdAt: Timestamp
```

**`history/{historyId}`**
```
version: number
changes: map
changedBy: string
createdAt: Timestamp
```

---

## 7. API Routes

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/profile` | User | Get own profile |
| PUT | `/api/profile` | User | Update profile |
| GET | `/api/submissions` | User | List own submissions (paginated, filterable) |
| POST | `/api/submissions` | User | Create new submission |
| GET | `/api/submissions/:id` | User/Admin | Get submission detail + validation results |
| PUT | `/api/submissions/:id` | User | Edit pending submission (lock + version check) |
| POST | `/api/submissions/:id/resubmit` | User | Resubmit after Needs Revision |
| GET | `/api/admin/submissions` | Admin | List all submissions (paginated, filterable) |
| GET | `/api/admin/submissions/:id` | Admin | Get full detail with raw AI response |
| POST | `/api/admin/submissions/:id/review` | Admin | Submit review (approve/revise/reject + notes) |
| GET | `/api/admin/stats` | Admin | Dashboard summary statistics |

### API Response Envelope

```json
{ "success": true, "data": { ... }, "error": null, "pagination": { "cursor": "...", "hasMore": true, "total": 47 } }
```

### Error Response

```json
{ "success": false, "data": null, "error": { "code": "VALIDATION_IN_PROGRESS", "message": "...", "details": {} } }
```

### HTTP Status Codes

| Code | When |
|------|------|
| 200 | Reads, updates |
| 201 | New submission, new review |
| 400 | Validation error |
| 401 | Missing/invalid Firebase ID token |
| 403 | Unauthorized role access |
| 404 | Submission not found |
| 409 | Version conflict (optimistic locking) |
| 423 | Validation in progress, edit blocked |
| 500 | Unexpected error |

---

## 8. Status Flow

```
User Submits → [Pending]
                  │
                  ▼
          Backend AI Validation
                  │
         ┌────────┴────────┐
         ▼                 ▼
   All checks pass    One+ checks fail
         │                 │
         ▼                 ▼
   [Approved]        [Pending] + needsAttention=true
   (auto)                  │
                           ▼
                    Admin Reviews
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
         [Approved]  [Needs Revision] [Rejected]
                           │
                           ▼
                    User Revises → [Pending] → (cycle repeats)
```

---

## 9. AI Validation Pipeline

### Trigger
Cloud Function `onSubmissionCreated` fires on Firestore `onCreate` on `submissions/{id}`.

### Steps
1. Set `validationInProgress: true`
2. Fetch image(s) from Cloud Storage
3. Build GPT-4o prompt (system prompt + form data JSON + base64 image)
4. Call OpenAI API (JSON mode, `gpt-4o`, max 4096 tokens)
5. Parse response, validate JSON structure
6. If `overallPass: true` → `status: 'approved'`
7. If `overallPass: false` → `needsAttention: true`, status stays `pending`
8. Write results to `validationResults` subcollection
9. Set `validationInProgress: false`

### Retry Strategy
- 3 attempts, 60s timeout each
- Backoff: 2s → 4s → 8s
- After 3 failures: flag for admin, write error to validationResults

### GPT-4o Response Schema

```json
{
  "extractedText": "...",
  "fieldResults": [
    { "fieldName": "brandName", "formValue": "...", "labelValue": "...", "matchStatus": "MATCH|MISMATCH|NOT_FOUND|NOT_APPLICABLE", "notes": "..." }
  ],
  "complianceWarnings": [
    { "check": "...", "message": "...", "severity": "info|warning" }
  ],
  "overallPass": true,
  "confidence": "high|medium|low"
}
```

### Tier 1 Critical Checks (must all pass for auto-approval)

| Check | Logic |
|-------|-------|
| Brand Name | Case-insensitive, >=90% similarity (Levenshtein/Jaro-Winkler) |
| Class/Type | Case-insensitive, full designation must match |
| Alcohol Content | Exact numeric match (extract number from both) |
| Net Contents | Unit normalization (750 mL = 750 ML = 750ml) |
| Health Warning | "GOVERNMENT WARNING" + key phrases present |
| Name & Address | Label contains name+address with phrase like "Bottled By" |

### Tier 2 Conditional Checks

Country of Origin (imported products only)

### Tier 3 Compliance Warnings (informational only)
Same field of vision, Health warning formatting, Designation consistency, Standard of fill

---

## 10. Concurrency & Race Conditions

### Optimistic Locking
- Every submission has a `version` field (starts at 1)
- All edits use Firestore transactions that check `version` matches expected
- On mismatch → return 409 Conflict

### Validation Lock
- `validationInProgress: boolean` prevents edits during AI processing
- Edit attempts during validation → return 423 Locked
- Cloud Function checks version at start AND end of processing; aborts if version changed

---

## 11. Authentication Flow

1. Client uses Firebase Auth SDK (email/password)
2. Client gets ID token (JWT) automatically
3. All API calls send token in `Authorization: Bearer {token}`
4. Server middleware verifies token via `admin.auth().verifyIdToken(token)`
5. Role extracted from `decodedToken.role` custom claim

### Route Protection
- Client: AuthContext + role check → redirect if unauthorized
- API: Middleware → 401/403 if unauthorized
- Firestore: Security Rules → deny if unauthorized
- Storage: Security Rules → auth required

---

## 12. Storage Paths

```
gs://{bucket}/submissions/{submissionId}/images/{imageId}_{imageType}.{ext}
```

Upload: Client uploads directly via Firebase Storage SDK (uses auth token).
Security: Authenticated users can upload (image/*, <10 MB). Authenticated users can read.

---

## 13. Firestore Indexes Required

| Collection | Fields | Purpose |
|-----------|--------|---------|
| submissions | userId ASC, createdAt DESC | User dashboard |
| submissions | userId ASC, status ASC, createdAt DESC | User filter by status |
| submissions | status ASC, createdAt DESC | Admin filter by status |
| submissions | productType ASC, createdAt DESC | Admin filter by type |
| submissions | needsAttention ASC, createdAt ASC | Admin queue |

---

## 14. Submission Form Fields

All product types use the same flat set of 9 fields:

| Field | Required | Notes |
| ----- | -------- | ----- |
| Product Type | Yes | wine / distilled_spirits / malt_beverage |
| Source | Yes | domestic / imported |
| Brand Name | Yes | Core TTB field |
| Class/Type Designation | Yes | Core TTB field |
| Alcohol Content | Yes | ABV percentage (0-100) |
| Net Contents | Yes | e.g. "750 mL" |
| Name & Address on Label | Yes | Bottler/producer as shown on label |
| Country of Origin | Conditional | Required if source = imported |
| Health Warning Confirmed | Yes | Confirms label includes government warning |

No product-type-specific conditional fields. The AI validation prompt handles product-type-specific compliance rules internally.

---

## 15. Validation Rules (Form)

- Alcohol Content: valid number 0-100
- Net Contents: numeric value + unit
- Country of Origin: required if Source = Imported
- All required fields must be filled before proceeding to image upload
- Image: JPEG, PNG, WebP, TIFF only; max 10 MB

---

## 16. Version Roadmap Summary

| Version | Focus | Key Features |
|---------|-------|-------------|
| **v1.0** | Core MVP | Auth, profile, simplified 9-field form, single image upload, GPT-4o Tier 1 checks, user+admin dashboards, basic detail view, deployment |
| **v1.1** | Polish | Multi-image, edit/resubmit flows, real-time listeners, race condition handling, pagination, forgot password |
| **v2.0** | Enhanced | Tier 3 warnings, fuzzy matching, admin notes, history timeline, search, CSV export, skeletons, toasts, responsive, auto-save drafts, zoomable images |
| **v3.0** | Scale | Image highlighting, email notifications, batch submissions, PDF generation, automated tests, audit trail, analytics, rate limiting, multi-tenant |

---

## 17. Key Architectural Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| Database | Firestore (not Postgres) | Free tier, no server mgmt, real-time listeners, flexible doc model |
| Submissions as top-level collection | Not nested under users | Admin needs cross-user queries; simpler pagination |
| Auth | Firebase Auth (not Auth0/Clerk) | Native Firestore/Storage security rules integration |
| AI | GPT-4o single call (not OCR + matching) | Handles extraction AND comparison in one call |
| Async validation | Cloud Functions trigger (not polling) | Event-driven, auto-scales, free tier |
| State management | Firestore onSnapshot + React Context | No need for Redux/React Query — Firestore is the cache |
| Forms | React Hook Form + Zod | Performance for complex forms; schemas shared with server |

---

## 18. Firebase Spark Plan Limits

| Service | Free Limit |
|---------|-----------|
| Firestore | 1 GiB stored, 50K reads/day, 20K writes/day |
| Auth | Unlimited email/password users |
| Storage | 5 GB stored, 1 GB/day download |
| Functions | 125K invocations/month, 40K GB-seconds/month |

Budget: ~1,200 submissions/day before hitting read limits. Sufficient for demo/evaluation.

---

## 19. Critical Workflow Patterns

### Happy Path (Auto-Approve)
User submits → Cloud Function validates → all Tier 1 pass → status = approved → dashboard updates in real-time

### Flagged for Admin
User submits → validation finds mismatches → needsAttention = true → admin reviews → approve/revise/reject

### Edit During Validation
User tries edit → API checks validationInProgress → if true: return 423 Locked → UI disables edit button → after validation completes: onSnapshot updates UI → edit re-enabled

### Resubmission
Admin sets Needs Revision + feedback → user sees feedback → clicks Revise & Resubmit → form pre-filled → user fixes → resubmit → version incremented → validation re-runs

### Rejection → New Submission
Admin rejects with reason → user sees rejection → clicks Duplicate & Edit → new submission pre-filled → application type auto-set to "Resubmission" → user uploads correct label → submits as new

---

## 20. Build Progress

### Completed Phases

| Phase | Status | Date |
|-------|--------|------|
| **Phase 0: Project Initialization** | ✅ Complete | Feb 2, 2026 |
| **Phase 1: Firebase Config & Shared Utilities** | ✅ Complete | Feb 2, 2026 |
| **Phase 2: Authentication** | ✅ Complete | Feb 2, 2026 |
| **Phase 3: User Profile** | ✅ Complete | Feb 2, 2026 |
| **Phase 4: Layout & Navigation** | ✅ Complete | Feb 2, 2026 |
| **Phase 5: Submission Form** | ✅ Complete | Feb 2, 2026 |
| **Phase 6: Submission API** | ✅ Complete | Feb 2, 2026 |
| **Phase 7: User Dashboard** | ✅ Complete | Feb 2, 2026 |
| **Phase 8: Submission Detail View** | ✅ Complete | Feb 2, 2026 |
| **Phase 9: AI Validation Pipeline** | ✅ Complete | Feb 2, 2026 |
| **Phase 10: Admin Portal** | ✅ Complete | Feb 2, 2026 |
| **Phase 11: Firestore Security Rules & Indexes** | ✅ Complete | Feb 3, 2026 |

### Phase 0 Notes
- Next.js 16.1.6 with App Router, TypeScript, Tailwind CSS
- Zod v4.3.6 installed (uses `message` instead of `required_error` on `z.enum`)
- Firebase emulators configured: Auth :9099, Firestore :8080, Storage :9199, Functions :5001, UI :4000
- Firestore security rules, indexes, and Storage rules written and ready to deploy
- Cloud Functions scaffolded in `functions/` with TypeScript
- `.gitignore` uses `node_modules/` (not `/node_modules`) to cover both root and `functions/node_modules`

### Phase 1 Notes
- `src/lib/firebase/client.ts` — auto-connects to emulators when running on localhost in dev mode
- `src/lib/firebase/admin.ts` — uses `FIREBASE_ADMIN_PRIVATE_KEY` env var with `\\n` → `\n` replacement for private key parsing
- `src/lib/firebase/storage.ts` — exports `uploadImage`, `getImageUrl`, `deleteImage` helpers
- `src/types/` — full TypeScript interfaces for `UserProfile`, `Submission`, `SubmissionImage`, `Review`, `HistoryEntry`, `ValidationResult`, `FieldResult`, `ComplianceWarning` plus all union types
- `src/lib/validation/formSchemas.ts` — Zod schema for 9-field submission form with superRefine for conditional country of origin validation
- All schemas use Zod v4 API (no `required_error`, use `message` instead)

### Phase 2 Notes
- `src/lib/auth/context.tsx` — AuthProvider uses `onAuthStateChanged` + `getIdTokenResult` for role from custom claims + Firestore `getDoc` for `profileComplete` status. Exposes `useAuth()` hook returning `{ user, role, profileComplete, loading, signOut }`
- `src/lib/auth/guards.tsx` — Three client-side guard components: `RequireAuth` (→ /login), `RequireProfile` (→ /profile), `RequireAdmin` (→ /dashboard). Each shows a loading spinner while auth state resolves
- `src/app/(auth)/login/page.tsx` — Email/password login with error handling for `invalid-credential` and `too-many-requests`. Links to /register and /reset-password
- `src/app/(auth)/register/page.tsx` — Registration with email, password, confirm password. Client-side validation (password match, min 6 chars). Redirects to /profile on success
- `src/app/(auth)/reset-password/page.tsx` — Fully functional password reset using `sendPasswordResetEmail` (not just a stub). Shows success message after sending
- `src/app/api/_middleware/auth.ts` — Server-side auth middleware: `verifyFirebaseIdToken()` decodes Bearer token via Admin SDK, `checkAdminRole()` returns 403 for non-admins, `isAuthError()` type guard. Exports `AuthenticatedRequest` interface with `uid`, `email`, `role`, `token`
- `scripts/set-admin.ts` — Admin seed script using `dotenv` + `firebase-admin`. Usage: `npx tsx scripts/set-admin.ts <USER_UID>`
- `src/app/layout.tsx` — Root layout wraps children with `<AuthProvider>`. Metadata updated to "TTB Label Verification"
- Dev dependencies added: `dotenv`, `tsx` (for running TypeScript scripts directly)

### Phase 3 Notes
- `src/app/api/profile/route.ts` — GET returns user profile from Firestore (or email + `profileComplete: false` if no doc exists). PUT validates body with `userProfileSchema`, writes to Firestore with `merge: true`, sets `profileComplete: true`. Preserves existing `role` field. Uses `FieldValue.serverTimestamp()` for `createdAt`/`updatedAt`
- `src/app/(user)/profile/page.tsx` — React Hook Form + Zod profile form. Fetches existing profile on mount via GET `/api/profile`. Email field is pre-filled and read-only. Two-column grid layout. On save redirects to `/dashboard` after 1.5s
- `src/app/(user)/settings/page.tsx` — Shows email, role, links to edit profile, and sign out button. Links back to dashboard

### Phase 4 Notes
- `src/app/(user)/layout.tsx` — User shell with desktop sidebar (Dashboard, New Submission, Profile, Settings) + mobile horizontal nav. Header shows email + sign out. Wraps children with `RequireAuth` + `RequireProfile`
- `src/app/(admin)/layout.tsx` — Admin shell with sidebar (Admin Dashboard). Header shows purple Admin badge + email + sign out. Wraps with `RequireAuth` + `RequireAdmin`
- 12 shared UI components in `src/components/ui/`: Button (4 variants), Input, Select, Checkbox, RadioGroup, Textarea, Card + CardHeader, StatusBadge (4 statuses), Table (generic + sortable), Modal (Escape + overlay dismiss), Toast (provider + hook, auto-dismiss 4s), Spinner + LoadingState
- All components use `forwardRef` where applicable for React Hook Form compatibility
- Barrel export via `src/components/ui/index.ts`

### Phase 5 Notes
- `src/app/(user)/submissions/new/page.tsx` — Multi-step orchestrator. Manages step state (0/1/2), stores form data + image file in state. On submit: POST to `/api/submissions` → get submissionId → upload image to Firebase Storage → navigate to detail page. Wrapped with `RequireProfile`
- `src/app/(user)/submissions/new/step-form.tsx` — Simplified 9-field form with React Hook Form + Zod `submissionSchema`. Country of Origin shown conditionally when source=imported. No product-type-specific field sections. Required `zodResolver` type cast (`as Resolver<SubmissionFormData>`) due to Zod v4 + @hookform/resolvers type mismatch
- `src/app/(user)/submissions/new/step-upload.tsx` — Single image upload step using `ImageUploader` component. Validates file is selected before allowing next
- `src/app/(user)/submissions/new/step-review.tsx` — Read-only two-column summary of all 9 form fields. Shows image preview thumbnail. Confirm & Submit button
- `src/components/submission/ImageUploader.tsx` — Reusable drag-and-drop + click-to-upload component. Client-side validation (JPEG/PNG/WebP/TIFF, max 10 MB). Shows preview thumbnail with filename, size, and remove button
- **Bug fix:** Removed `RequireProfile` from `(user)/layout.tsx` to prevent redirect loop on `/profile`. `RequireProfile` now applied per-page (dashboard, submissions) instead of at layout level
- `src/app/(user)/dashboard/page.tsx` — Placeholder page with `RequireProfile` guard (will be replaced in Phase 7)

### Phase 6 Notes
- `src/app/api/submissions/route.ts` — GET lists user's submissions with cursor-based pagination (fetches limit+1 for `hasMore`), filterable by `status` and `productType` query params. POST validates with `submissionSchema`, normalizes nullable fields, writes to Firestore with `status: "pending"`, `version: 1`, `validationInProgress: false`
- `src/app/api/submissions/[id]/route.ts` — GET fetches submission doc + subcollections (images, validationResults, reviews) in parallel; checks user owns it or is admin. PUT uses Firestore transaction with optimistic locking: checks `status === "pending"`, `validationInProgress === false`, version match; increments version; logs to history subcollection
- `src/app/api/submissions/[id]/resubmit/route.ts` — POST resubmit: Firestore transaction checks `status === "needs_revision"` and ownership; resets status to `pending`, clears `needsAttention`, increments version, logs history
- All routes use standard response envelope `{ success, data, error }` and HTTP status codes per architecture doc (200, 201, 400, 401, 403, 404, 409, 423, 500)
- Next.js 16 async params pattern used: `{ params }: { params: Promise<{ id: string }> }`

### Phase 7 Notes
- `src/lib/hooks/useSubmissions.ts` — Real-time Firestore `onSnapshot` hook. Queries `submissions` where `userId == user.uid` ordered by `createdAt` desc. Returns `{ submissions, loading, error }`. Exports `SubmissionListItem` interface
- `src/app/(user)/dashboard/page.tsx` — Full dashboard with: (1) summary stats cards (Total, Approved, Pending, Needs Revision) computed via `useMemo`, (2) status + product type filter dropdowns, (3) submissions table with sortable Date/Status columns, truncated IDs, clickable rows → `/submissions/{id}`, (4) "New Submission" button. Uses `useSubmissions` hook for real-time data. Wrapped with `RequireProfile`
- Dashboard uses client-side filtering/sorting on the real-time snapshot data rather than API pagination — simpler for typical user volumes; cursor pagination still available via GET `/api/submissions` for programmatic use

### Phase 8 Notes
- `src/lib/hooks/useSubmission.ts` — Real-time Firestore `onSnapshot` hook for a single submission. Subscribes to main document + three subcollections (images, validationResults, reviews) in parallel. Uses `loadedCount` pattern to set loading=false only after all 4 listeners have fired. Exports `SubmissionDetail`, `SubmissionImageDoc`, `ValidationResultDoc`, `ReviewDoc` interfaces
- `src/components/submission/FieldCheckRow.tsx` — Single validation field row showing field name, form value, label value, match status badge (MATCH/MISMATCH/NOT_FOUND/NOT_APPLICABLE with color-coded icons), and notes
- `src/components/submission/ValidationResultsPanel.tsx` — Full validation results display: overall pass/fail badge, confidence level badge, per-field checklist using FieldCheckRow, compliance warnings with severity coloring, extracted label text in scrollable area
- `src/app/(user)/submissions/[id]/page.tsx` — Full submission detail page with: (1) header with brand name + status badge + metadata, (2) conditional action buttons (Edit if pending+not validating, Revise & Resubmit if needs_revision, Duplicate & Edit always), (3) validation-in-progress banner with spinner, (4) needs_revision feedback banner, (5) rejection banner with reason, (6) ValidationResultsPanel, (7) label images grid with thumbnails, (8) read-only form data in two-column grid with product-type-specific sections, (9) review history timeline. Uses `useSubmission` hook for real-time data. Wrapped with `RequireProfile`
- Task 8.4 (StatusBadge) already covered by existing `src/components/ui/StatusBadge.tsx`

### Phase 9 Notes
- `functions/src/prompt.ts` — GPT-4o system prompt with detailed TTB regulatory references (27 CFR Parts 4, 5, 7, 16). Defines matching rules per field (brand name ≥90% similarity, alcohol content exact numeric, net contents unit normalization, health warning key phrases). Exports `SYSTEM_PROMPT`, `FormDataForPrompt` interface, and `buildUserMessage()` helper
- `functions/src/index.ts` — Three Cloud Functions:
  - `onSubmissionCreated` — Firestore onCreate trigger on `submissions/{id}`. Sets `validationInProgress: true`, polls for images (3 attempts × 3s delay), downloads image from Cloud Storage as base64, calls GPT-4o Vision API with JSON mode, validates response structure, checks version hasn't changed (stale detection), determines outcome (auto-approve if all Tier 1 pass + overallPass, flag for admin otherwise), writes to `validationResults` subcollection
  - `onSubmissionUpdated` — Firestore onUpdate trigger. Only re-triggers validation on resubmits (`needs_revision` → `pending`). All other updates ignored to prevent infinite loops. Stale validation handled by version check in `runValidation`
  - `setAdminClaim` — Callable function. Requires caller to be existing admin. Sets `role: "admin"` custom claim via Auth + updates Firestore profile
- Retry strategy: 3 attempts with exponential backoff (2s, 4s, 8s). On all failures: sets `needsAttention: true`, writes error to `validationResults` subcollection
- Tier 1 critical checks: brandName, classTypeDesignation, alcoholContent, netContents, healthWarning, nameAndAddress — all must MATCH or NOT_APPLICABLE for auto-approval
- Low confidence always flags for admin regardless of field results
- Image polling: onCreate trigger polls up to 3 times (3s intervals) for images in subcollection since images are uploaded after document creation
- Functions config: 512MiB memory, 300s timeout, OPENAI_API_KEY via `defineSecret` (Cloud Secret Manager in production, `.secret.local` for emulators)
- Functions build: Node 18 target (CommonJS), compiles to `functions/lib/`. Both `tsc` build and Next.js root build pass cleanly

### Phase 10 Notes
- Admin pages use URL prefix `/admin/` via nested route: `src/app/(admin)/admin/dashboard/` and `src/app/(admin)/admin/submissions/[id]/`. The `(admin)` route group provides the admin layout wrapper while `admin/` adds the URL segment
- `src/app/api/admin/submissions/route.ts` — GET lists all submissions across all users. Cursor-based pagination (limit+1 pattern), filterable by `status`, `productType`, `needsAttention`. Requires admin role via `checkAdminRole()`
- `src/app/api/admin/submissions/[id]/review/route.ts` — POST submits admin review. Firestore transaction writes review doc, logs history, updates submission status, clears `needsAttention`. Validates: action must be approve/needs_revision/rejected, feedback required for needs_revision and rejected. Returns 423 if validation in progress
- `src/app/api/admin/stats/route.ts` — GET returns dashboard summary: total, pending, approved, needsRevision, rejected, needsAttention counts. Aggregated server-side from full submissions collection
- `src/lib/hooks/useAdminQueue.ts` — Two hooks: `useAdminSubmissions()` (all submissions ordered by createdAt desc) and `useNeedsAttentionQueue()` (where needsAttention==true ordered by createdAt asc). Both use real-time `onSnapshot`
- `src/components/admin/ReviewActionPanel.tsx` — Three action buttons (Approve, Request Revision, Reject). Each opens confirmation modal with feedback textarea (required for revision/rejection), optional internal notes textarea. Posts to review API endpoint. Disabled during validation
- `src/components/admin/AiReportViewer.tsx` — Full AI validation report: confidence badge, overall pass/fail, per-field analysis using FieldCheckRow, compliance warnings with severity colors, extracted label text in pre block, collapsible raw AI response (JSON debug view)
- `src/app/(admin)/admin/dashboard/page.tsx` — Admin dashboard with 6 stats cards, tabbed interface (Needs Attention with count badge / All Submissions), status+product type filters, sortable table with ID/Brand/Type/Date/Status/Flags columns, clickable rows → admin detail
- `src/app/(admin)/admin/submissions/[id]/page.tsx` — Admin submission detail with: ReviewActionPanel, AiReportViewer, ValidationResultsPanel, label images, full form data, review history with internal notes visible. Uses `useSubmission` hook for real-time data

### Field Simplification (Feb 3, 2026)

- Reduced submission form from ~29 fields to 9 fields: productType, source, brandName, classTypeDesignation, alcoholContent, netContents, nameAddressOnLabel, countryOfOrigin (conditional), healthWarningConfirmed
- Removed all product-type-specific conditional fields (grapeVarietals, appellationOfOrigin, vintageDate, ageStatement, stateOfDistillation, commodityStatement, coloringMaterials, etc.)
- Removed serialNumber, fancifulName, applicationType, resubmissionTtbId, formulaNumber, containerInfo, statementOfComposition, fdncYellow5, cochinealCarmine, sulfiteDeclaration, foreignWinePercentage, applicantNotes
- All product types (wine, distilled_spirits, malt_beverage) now use the same flat field set
- AI validation prompt handles product-type-specific compliance rules internally
- Updated Firestore schema, Zod validation schema, form components, and review page accordingly

### Phase 11 Notes

- `firestore.rules` — Written during Phase 0, verified and deployed. Users can read/write own profile; admins read all. Submissions: users read own, admins read all; users create with own userId; users update only if pending & not validating; admins update all. Subcollections inherit parent access via `get()` lookups on parent submission
- `firestore.indexes.json` — 5 composite indexes deployed: userId+createdAt, userId+status+createdAt, status+createdAt, productType+createdAt, needsAttention+createdAt
- `storage.rules` — Authenticated users can upload images (image/*, <10 MB) and read images
- `.firebaserc` — Created with default project `label-validation-449b0`
- All rules compiled and deployed successfully via `firebase deploy --only firestore:rules,firestore:indexes,storage`

### Key Dependency Versions
| Package | Version |
|---------|---------|
| next | 16.1.6 |
| react | 19.x |
| firebase | latest |
| firebase-admin | latest |
| zod | 4.3.6 |
| react-hook-form | latest |
| openai | latest |
| typescript | 5.x |
