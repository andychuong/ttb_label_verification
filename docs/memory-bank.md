# Memory Bank: TTB Label Verification App

**Last Updated:** February 1, 2026
**Purpose:** Quick-reference knowledge base for building the AI-Powered Alcohol Label Verification App. Contains all critical decisions, schemas, structures, and rules extracted from prd.md, architecture.md, and workflow-examples.md.

---

## 1. Project Identity

- **What:** Web app that simulates TTB (Alcohol and Tobacco Tax and Trade Bureau) alcohol label approval
- **How:** Users submit product info (mirroring TTB Form 5100.31) + label image. GPT-4o vision validates the label matches the form and meets 27 CFR regulations.
- **Two Portals:** User Portal (producers submit labels) and Admin Portal (reviewers manage flagged submissions)
- **No existing code** — greenfield build from documentation specs

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
serialNumber: string
productType: "wine" | "distilled_spirits" | "malt_beverage"
source: "domestic" | "imported"
brandName: string
fancifulName: string | null
classTypeDesignation: string
statementOfComposition: string | null
alcoholContent: string
netContents: string
nameAddressOnLabel: string
applicationType: string[]
resubmissionTtbId: string | null
formulaNumber: string | null
containerInfo: string | null
grapeVarietals: string | null           # wine only
appellationOfOrigin: string | null       # wine only
vintageDate: string | null               # wine only
countryOfOrigin: string | null           # imported only
ageStatement: string | null              # spirits only
stateOfDistillation: string | null       # spirits only
commodityStatement: string | null        # spirits only
coloringMaterials: string | null         # spirits only
fdncYellow5: boolean
cochinealCarmine: boolean
sulfiteDeclaration: boolean
healthWarningConfirmed: boolean
foreignWinePercentage: string | null     # wine only
applicantNotes: string | null
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

### Tier 2 Conditional Checks (based on product type)
Fanciful Name, Appellation, Varietal, Vintage, Sulfites, Country of Origin, Age Statement, State of Distillation, Commodity Statement, Coloring Materials, FD&C Yellow #5, Cochineal/Carmine

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

## 14. Form Fields by Product Type

### Common (All Types)
Serial Number, Type of Product, Source (Domestic/Imported), Brand Name, Fanciful Name*, Alcohol Content, Net Contents, Name & Address, Application Type, Resubmission TTB ID*, Formula Number*, Container Info*, Health Warning Confirmed

### Distilled Spirits (Additional)
Class/Type Designation, Statement of Composition*, Age Statement*, Country of Origin (if imported), State of Distillation*, Commodity Statement*, Coloring Materials*, FD&C Yellow #5*, Cochineal/Carmine*, Sulfite Declaration*

### Wine (Additional)
Class/Type Designation, Grape Varietal(s)*, Appellation of Origin*, Vintage Date*, Country of Origin (if imported), Sulfite Declaration (default checked), FD&C Yellow #5*, Cochineal/Carmine*, Foreign Wine Percentage*

### Malt Beverage (Additional)
Class/Type Designation, Country of Origin (if imported)

*Fields marked with asterisk are optional or conditional*

---

## 15. Validation Rules (Form)

- Alcohol Content: valid number 0–100
- Net Contents: numeric value + unit
- Resubmission TTB ID: required if "Resubmission After Rejection" application type is checked
- Country of Origin: required if Source = Imported
- Appellation of Origin (wine): required if varietal or vintage appears on label
- All required fields must be filled before proceeding to image upload
- Image: JPEG, PNG, WebP, TIFF only; max 10 MB; at least one required

---

## 16. Version Roadmap Summary

| Version | Focus | Key Features |
|---------|-------|-------------|
| **v1.0** | Core MVP | Auth, profile, distilled spirits form, single image upload, GPT-4o Tier 1 checks, user+admin dashboards, basic detail view, deployment |
| **v1.1** | Polish | Wine + malt beverage types, multi-image, edit/resubmit flows, real-time listeners, race condition handling, Tier 2 checks, pagination, forgot password |
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
