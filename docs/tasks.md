# TTB Label Verification App - Build Task List

**Generated:** February 1, 2026
**Last Updated:** February 2, 2026
**Source Documents:** prd.md, architecture.md, workflow-examples.md

---

## Phase 0: Project Initialization ✅

- [x] **0.1** Initialize Git repository
- [x] **0.2** Create Next.js project with App Router (`npx create-next-app@latest --typescript --tailwind --app`)
- [x] **0.3** Install core dependencies:
  - `firebase` (client SDK)
  - `firebase-admin` (server SDK)
  - `react-hook-form` + `@hookform/resolvers`
  - `zod` (schema validation)
  - `openai` (GPT-4o API client)
- [x] **0.4** Install dev dependencies:
  - `firebase-tools` (CLI + emulators)
- [x] **0.5** Create `.env.local` and `.env.example` with all required env vars:
  - `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`, `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`, `NEXT_PUBLIC_FIREBASE_APP_ID`
  - `FIREBASE_ADMIN_PROJECT_ID`, `FIREBASE_ADMIN_CLIENT_EMAIL`, `FIREBASE_ADMIN_PRIVATE_KEY`
  - `OPENAI_API_KEY`
- [x] **0.6** Create Firebase project in Firebase Console (or use existing)
- [x] **0.7** Enable Firebase Authentication (Email/Password provider)
- [x] **0.8** Create Firestore database
- [x] **0.9** Create Cloud Storage bucket
- [x] **0.10** Initialize Firebase in project (`firebase init` — Firestore, Storage, Functions, Emulators)
- [x] **0.11** Set up Firebase Emulator Suite for local dev (Firestore, Auth, Storage, Functions)
- [x] **0.12** Configure `firebase.json` for emulators
- [x] **0.13** Set up directory structure per architecture doc (see Memory Bank for full tree)
- [x] **0.14** Add `.gitignore` entries for `.env.local`, `node_modules`, `.firebase`, etc.

---

## Phase 1: Firebase Configuration & Shared Utilities ✅

- [x] **1.1** Create `src/lib/firebase/client.ts` — Firebase client SDK initialization (conditionally connect to emulators in dev)
- [x] **1.2** Create `src/lib/firebase/admin.ts` — Firebase Admin SDK initialization (server-side only, uses service account env vars)
- [x] **1.3** Create `src/lib/firebase/storage.ts` — Storage upload helper functions (upload file, get download URL, delete file)
- [x] **1.4** Create `src/types/user.ts` — TypeScript interfaces for User profile
- [x] **1.5** Create `src/types/submission.ts` — TypeScript interfaces for Submission, Image, ValidationResult, Review, History documents
- [x] **1.6** Create `src/types/validation.ts` — TypeScript interfaces for AI validation response (fieldResults, complianceWarnings, etc.)
- [x] **1.7** Create `src/lib/validation/formSchemas.ts` — Zod schemas for:
  - User profile form
  - Common submission fields
  - Distilled spirits-specific fields
  - Wine-specific fields (v1.1)
  - Malt beverage-specific fields (v1.1)
  - Image upload validation (file type, size)

---

## Phase 2: Authentication ✅

- [x] **2.1** Create `src/lib/auth/context.tsx` — AuthProvider wrapping `onAuthStateChanged`, exposes `user`, `role`, `loading` via `useAuth()` hook
- [x] **2.2** Create `src/lib/auth/guards.tsx` — Route protection:
  - `RequireAuth` — redirects to `/login` if not authenticated
  - `RequireProfile` — redirects to `/profile` if `profileComplete === false`
  - `RequireAdmin` — redirects to `/dashboard` if `role !== 'admin'`
- [x] **2.3** Create `src/app/(auth)/login/page.tsx` — Login page with email/password form, links to register and forgot password
- [x] **2.4** Create `src/app/(auth)/register/page.tsx` — Registration page (email, password, confirm password), redirect to profile setup on success
- [x] **2.5** Create `src/app/(auth)/reset-password/page.tsx` — Password reset page (fully functional with `sendPasswordResetEmail`)
- [x] **2.6** Create API middleware `src/app/api/_middleware/auth.ts`:
  - `verifyFirebaseIdToken()` — decodes Bearer token using Admin SDK
  - `checkAdminRole()` — returns 403 for non-admin users on admin routes
  - `isAuthError()` — type guard for middleware error responses
- [x] **2.7** Create `scripts/set-admin.ts` — Seed script to set `role: 'admin'` custom claim on a user UID via Admin SDK
- [x] **2.8** Wire `AuthProvider` into root layout (`src/app/layout.tsx`)

---

## Phase 3: User Profile ✅

- [x] **3.1** Create `src/app/api/profile/route.ts` — GET (read profile) and PUT (update profile) endpoints with auth middleware
- [x] **3.2** Create `src/app/(user)/profile/page.tsx` — Profile setup/edit form:
  - Full Name, Email (pre-filled, read-only), Phone Number, Company Name, Company Address, Mailing Address (optional), Permit/Registry Number, Representative ID (optional)
  - On save: update Firestore `users/{uid}`, set `profileComplete: true`
  - React Hook Form + Zod validation with inline error messages
- [x] **3.3** Create `src/app/(user)/settings/page.tsx` — Settings page with email, role display, edit profile link, and sign out

---

## Phase 4: Layout & Navigation ✅

- [x] **4.1** Create `src/app/(user)/layout.tsx` — Authenticated user shell:
  - Sidebar with nav links: Dashboard, New Submission, Profile, Settings
  - Header with user email and sign out button
  - Mobile-responsive nav bar for small screens
  - Wraps children with `RequireAuth` and `RequireProfile` guards
- [x] **4.2** Create `src/app/(admin)/layout.tsx` — Admin shell:
  - Sidebar with nav links: Admin Dashboard
  - Header with purple Admin badge, email, and sign out
  - Wraps children with `RequireAuth` and `RequireAdmin` guards
- [x] **4.3** Create shared UI components in `src/components/ui/`:
  - `Button.tsx` (primary, secondary, danger, ghost variants)
  - `Input.tsx` (text input with label, error message, helper text)
  - `Select.tsx` (dropdown with placeholder)
  - `Checkbox.tsx`
  - `RadioGroup.tsx`
  - `Textarea.tsx`
  - `Card.tsx` + `CardHeader.tsx`
  - `StatusBadge.tsx` (Pending, Approved, Needs Revision, Rejected)
  - `Table.tsx` (generic, sortable columns, clickable rows)
  - `Modal.tsx` (confirmation dialogs with Escape + overlay dismiss)
  - `Toast.tsx` (ToastProvider + useToast hook, auto-dismiss)
  - `Spinner.tsx` + `LoadingState.tsx`
  - `index.ts` barrel export

---

## Phase 5: Submission Form (Multi-Step) ✅

- [x] **5.1** Create `src/app/(user)/submissions/new/page.tsx` — Multi-step form orchestrator (manages step state, step navigation, submits to API + uploads image)
- [x] **5.2** Create `src/app/(user)/submissions/new/step-form.tsx` — Step 1: Application Form
  - Product type dropdown (Wine, Distilled Spirits, Malt Beverage) controlling conditional field visibility
  - All common fields: Serial Number, Source, Brand Name, Fanciful Name, Alcohol Content, Net Contents, Name & Address, Application Type checkboxes, Formula Number, Container Info
  - Distilled spirits fields: Class/Type, Statement of Composition, Age Statement, Country of Origin (if imported), State of Distillation, Commodity Statement, Coloring Materials, FD&C Yellow #5, Cochineal/Carmine, Sulfite Declaration
  - Wine fields: Class/Type, Grape Varietal(s), Appellation of Origin, Vintage Date, Country of Origin (if imported), Sulfite Declaration, FD&C Yellow #5, Cochineal/Carmine, Foreign Wine Percentage
  - Malt beverage fields: Class/Type, Country of Origin (if imported)
  - Health Warning confirmation checkbox
  - Conditional field rendering based on Product Type and Source
  - Resubmission TTB ID field (conditional on Application Type selection)
  - React Hook Form + Zod validation
- [x] **5.3** Create `src/app/(user)/submissions/new/step-upload.tsx` — Step 2: Image Upload
  - Uses reusable ImageUploader component
  - v1.0: Single image upload
- [x] **5.4** Create `src/app/(user)/submissions/new/step-review.tsx` — Step 3: Review & Submit
  - Read-only summary of all form data (two-column layout)
  - Image thumbnail preview
  - Confirm & Submit button → POST /api/submissions + upload to Storage
- [x] **5.5** Create `src/components/submission/ImageUploader.tsx` — Reusable image upload component with drag-and-drop, file picker, validation, preview, remove

---

## Phase 6: Submission API Endpoints ✅

- [x] **6.1** Create `src/app/api/submissions/route.ts`:
  - `GET` — List submissions for authenticated user (cursor pagination, filterable by status & productType)
  - `POST` — Create new submission (Zod validation, write to Firestore, return submissionId)
- [x] **6.2** Create `src/app/api/submissions/[id]/route.ts`:
  - `GET` — Get submission detail + subcollections (images, validationResults, reviews); verifies ownership or admin
  - `PUT` — Edit pending submission (status check, validationInProgress lock, Firestore transaction with optimistic locking, version increment, history log)
- [x] **6.3** Create `src/app/api/submissions/[id]/resubmit/route.ts`:
  - `POST` — Resubmit after Needs Revision (reset status to pending, increment version, history log, transaction)

---

## Phase 7: User Dashboard ✅

- [x] **7.1** Create `src/app/(user)/dashboard/page.tsx`:
  - Summary stats cards: Total, Approved, Pending, Needs Revision
  - Submissions table: ID (truncated), Brand Name, Product Type, Date, Status
  - Sortable by date and status (click column headers)
  - Filterable by status and product type (dropdown selects)
  - Clickable rows → `/submissions/{id}`
  - "New Submission" button (top-right)
- [x] **7.2** Create `src/lib/hooks/useSubmissions.ts` — Firestore `onSnapshot` hook for real-time user submissions
- [x] **7.3** Cursor-based pagination available via API (GET /api/submissions); dashboard uses real-time onSnapshot for the full list with client-side filtering

---

## Phase 8: Submission Detail View (User) ✅

- [x] **8.1** Create `src/app/(user)/submissions/[id]/page.tsx`:
  - Display all form fields (read-only)
  - Display uploaded label image(s)
  - Validation Results Panel: checklist of each field with Match/Mismatch/Not Found/Pending status
  - Admin feedback banner (if status = Needs Revision)
  - Rejection banner with reason (if status = Rejected)
  - "Edit Submission" button (if status = Pending and validationInProgress = false)
  - "Revise & Resubmit" button (if status = Needs Revision)
  - "Duplicate & Edit" button (for rejected or any submission)
- [x] **8.2** Create `src/components/submission/ValidationResultsPanel.tsx` — Per-field checklist component
- [x] **8.3** Create `src/components/submission/FieldCheckRow.tsx` — Single field match/mismatch row
- [x] **8.4** Create `src/components/submission/StatusBadge.tsx` — Color-coded status badges (reuses existing `src/components/ui/StatusBadge.tsx`)
- [x] **8.5** Create `src/lib/hooks/useSubmission.ts` — Firestore `onSnapshot` hook for single submission document + subcollections (real-time)

---

## Phase 9: AI Validation Pipeline ✅

- [x] **9.1** Create `functions/src/index.ts` — Firebase Cloud Functions entry point
- [x] **9.2** Implement `onSubmissionCreated` Cloud Function:
  - Firestore `onCreate` trigger on `submissions/{id}`
  - Set `validationInProgress: true`
  - Fetch image(s) from Cloud Storage
  - Build GPT-4o prompt (system prompt with TTB rules + form data JSON + base64 image)
  - Call OpenAI API with retry (3x, exponential backoff: 2s, 4s, 8s; 60s timeout per attempt)
  - Parse structured JSON response
  - Validate response structure
  - Write results to `validationResults` subcollection
  - If all Tier 1 checks pass → set `status: 'approved'`
  - If any check fails → set `needsAttention: true`, leave status as `pending`
  - If confidence is LOW → set `needsAttention: true`
  - Set `validationInProgress: false`
- [x] **9.3** Implement `onSubmissionUpdated` Cloud Function:
  - Detect version changes (user edited during validation)
  - If version changed, abort stale validation
  - If resubmit occurred, re-trigger validation
- [x] **9.4** Create the GPT-4o system prompt:
  - Instructions to extract all visible text from label
  - Form data provided as JSON for comparison
  - Detailed matching rules per field (case-insensitive, numeric extraction, fuzzy thresholds)
  - Output schema specification (extractedText, fieldResults[], complianceWarnings[], overallPass, confidence)
  - TTB regulatory references (27 CFR parts 4, 5, 7, 16)
- [x] **9.5** Implement Tier 1 critical checks:
  - Brand Name Match (case-insensitive, >=90% similarity)
  - Class/Type Designation Match
  - Alcohol Content Match (exact numeric)
  - Net Contents Match (unit normalization)
  - Health Warning Statement Present (key phrases check)
  - Name and Address Present
- [x] **9.6** Create `setAdminClaim` callable Cloud Function (sets `role: 'admin'` custom claim)
- [x] **9.7** Handle error scenarios:
  - GPT-4o timeout/error → retry 3x → flag for admin
  - Low confidence → flag for admin with note
  - Corrupt/invalid image → reject before enqueue

---

## Phase 10: Admin Portal ✅

- [x] **10.1** Create `src/app/api/admin/submissions/route.ts`:
  - `GET` — List all submissions across all users (paginated, filterable by status, product type, date)
- [x] **10.2** Create `src/app/api/admin/submissions/[id]/review/route.ts`:
  - `POST` — Submit admin review (action: approve/needs_revision/reject, feedbackToUser, internalNotes)
  - Firestore transaction: write review doc, update submission status, clear needsAttention flag
- [x] **10.3** Create `src/app/api/admin/stats/route.ts`:
  - `GET` — Dashboard summary stats (total, approved, pending, needs attention, rejected counts)
- [x] **10.4** Create `src/app/(admin)/admin/dashboard/page.tsx` — Admin Dashboard:
  - Summary stats cards
  - Tabbed table: "All Submissions" / "Needs Attention"
  - Columns: Submission ID, User/Company Name, Brand Name, Product Type, Date, Status
  - Sortable and filterable
  - Needs Attention tab badge with count
- [x] **10.5** Create `src/app/(admin)/admin/submissions/[id]/page.tsx` — Admin Submission Detail:
  - Everything from user detail view
  - Full AI Validation Report (per-field results with confidence, raw extracted text)
  - Admin action buttons: Approve, Needs Revision, Reject
  - Feedback to User textarea (required for Needs Revision)
  - Rejection Reason textarea (required for Reject)
  - Internal Notes textarea (admin-only, optional)
  - Confirmation modals for each action
- [x] **10.6** Create `src/components/admin/ReviewActionPanel.tsx` — Admin action buttons + modals
- [x] **10.7** Create `src/components/admin/AiReportViewer.tsx` — Full AI validation report display
- [x] **10.8** Create `src/lib/hooks/useAdminQueue.ts` — Firestore `onSnapshot` hook for needs-attention submissions

---

## Phase 11: Firestore Security Rules & Indexes

- [ ] **11.1** Write `firestore.rules`:
  - Users: read/write own profile; admins read all
  - Submissions: users read own; admins read all; users create with own userId; users update only if pending & not validating; admins update all
  - Subcollections: inherit parent access patterns
- [ ] **11.2** Write `firestore.indexes.json` — composite indexes:
  - `submissions`: `userId` ASC + `createdAt` DESC
  - `submissions`: `userId` ASC + `status` ASC + `createdAt` DESC
  - `submissions`: `status` ASC + `createdAt` DESC
  - `submissions`: `productType` ASC + `createdAt` DESC
  - `submissions`: `needsAttention` ASC + `createdAt` ASC (for admin queue)
- [ ] **11.3** Write `storage.rules`:
  - Authenticated users can upload images (valid image types, <10 MB)
  - Authenticated users can read images
- [ ] **11.4** Deploy rules and indexes to Firebase

---

## Phase 12: Deployment

- [ ] **12.1** Connect GitHub repo to Vercel
- [ ] **12.2** Configure Vercel environment variables (all Firebase + OpenAI keys)
- [ ] **12.3** Deploy Cloud Functions (`firebase deploy --only functions`)
- [ ] **12.4** Deploy Firestore rules and indexes (`firebase deploy --only firestore`)
- [ ] **12.5** Deploy Storage rules (`firebase deploy --only storage`)
- [ ] **12.6** Verify production deployment end-to-end
- [ ] **12.7** Seed at least one admin account in production

---

## Phase 13: v1.1 — Polish & Stability (Post-MVP)

- [ ] **13.1** Add Wine product type with all conditional fields
- [ ] **13.2** Add Malt Beverage product type with all conditional fields
- [ ] **13.3** Multi-image upload (front, back, other) with image type tagging
- [ ] **13.4** Edit pending submission flow (with validationInProgress lock check and optimistic locking)
- [ ] **13.5** Resubmission flow ("Revise & Resubmit" button, pre-fill form, version history)
- [ ] **13.6** Duplicate & Edit flow (create new submission from rejected one)
- [ ] **13.7** Real-time Firestore `onSnapshot` listeners on dashboards and detail pages
- [ ] **13.8** Race condition handling (Cloud Function version check, 409/423 responses)
- [ ] **13.9** Tier 2 conditional validation checks (fanciful name, appellation, varietal, vintage, sulfites, country of origin, age statement, state of distillation, commodity statement, coloring materials, FD&C Yellow #5, cochineal/carmine)
- [ ] **13.10** Cursor-based pagination on both dashboards
- [ ] **13.11** Forgot password flow (Firebase `sendPasswordResetEmail`)
- [ ] **13.12** Status and product type filtering on dashboards

---

## Phase 14: v2.0 — Enhanced Validation & UX (Future)

- [ ] **14.1** Tier 3 compliance warnings (same field of vision, health warning formatting, designation consistency, standard of fill)
- [ ] **14.2** Fuzzy matching improvements (Levenshtein/Jaro-Winkler scoring, configurable threshold)
- [ ] **14.3** Admin internal notes (separate from user-visible feedback)
- [ ] **14.4** Submission history timeline view
- [ ] **14.5** Dashboard search bar (admin)
- [ ] **14.6** CSV export for submissions list
- [ ] **14.7** Loading skeleton screens
- [ ] **14.8** Toast notifications for all actions
- [ ] **14.9** Confirmation modals for destructive actions
- [ ] **14.10** Responsive layout (tablet/mobile)
- [ ] **14.11** Form auto-save drafts (localStorage)
- [ ] **14.12** Field helper tooltips with TTB references
- [ ] **14.13** Zoomable image viewer
- [ ] **14.14** Simplified user-facing validation report

---

## Phase 15: v3.0 — Scale & Integration (Future)

- [ ] **15.1** Image highlighting (bounding boxes from GPT-4o)
- [ ] **15.2** Email notifications (SendGrid/Firebase Extensions)
- [ ] **15.3** Batch submissions (CSV + ZIP upload)
- [ ] **15.4** PDF generation (TTB Form 5100.31)
- [ ] **15.5** Automated tests (unit, integration, E2E with Playwright)
- [ ] **15.6** Audit trail (comprehensive activity logging)
- [ ] **15.7** Analytics dashboard (Recharts)
- [ ] **15.8** Rate limiting (per-user API limits, Cloud Function concurrency)
- [ ] **15.9** Multi-tenant support (company entities, company admin role)
- [ ] **15.10** TTB COLAs Online integration (aspirational)
