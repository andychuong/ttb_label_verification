# Architecture Document: AI-Powered Alcohol Label Verification App

**Companion to:** prd.md, workflow-examples.md
**Date:** February 1, 2026
**Status:** Draft

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [High-Level Architecture Diagram](#2-high-level-architecture-diagram)
3. [Component Breakdown](#3-component-breakdown)
4. [Data Flow](#4-data-flow)
5. [Firestore Data Model](#5-firestore-data-model)
6. [Authentication & Authorization](#6-authentication--authorization)
7. [AI Validation Pipeline](#7-ai-validation-pipeline)
8. [File Storage Architecture](#8-file-storage-architecture)
9. [Real-Time Updates](#9-real-time-updates)
10. [Concurrency & Race Condition Handling](#10-concurrency--race-condition-handling)
11. [API Layer](#11-api-layer)
12. [Frontend Architecture](#12-frontend-architecture)
13. [Error Handling Strategy](#13-error-handling-strategy)
14. [Security Architecture](#14-security-architecture)
15. [Infrastructure & Deployment](#15-infrastructure--deployment)
16. [Version Roadmap](#16-version-roadmap)
    - v1.0 — Core MVP
    - v1.1 — Polish & Stability
    - v2.0 — Enhanced Validation & UX
    - v3.0 — Scale & Integration

---

## 1. System Overview

The application is a full-stack web platform with two portals (User and Admin) that automates the TTB alcohol label verification process. The architecture follows a serverless-first approach built on Firebase services with a Next.js frontend/backend, and OpenAI GPT-4o for AI-powered label analysis.

**Key architectural decisions:**

- **Serverless**: No self-managed servers. Firebase handles auth, database, storage, and background functions. Vercel handles the web application and API routes.
- **Real-time**: Firestore's `onSnapshot` listeners push status changes to user dashboards instantly — no polling, no WebSocket setup.
- **Single codebase**: Next.js unifies the frontend (React) and backend (API routes) in one repository, simplifying deployment and development.
- **Async validation**: Label verification is decoupled from the request/response cycle. Users submit and leave; the system processes in the background and updates status automatically.

---

## 2. High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                           CLIENTS                                   │
│                                                                     │
│   ┌──────────────────┐              ┌──────────────────┐            │
│   │   User Portal    │              │   Admin Portal   │            │
│   │   (React/Next)   │              │   (React/Next)   │            │
│   └────────┬─────────┘              └────────┬─────────┘            │
│            │                                  │                      │
│            │    Firebase Client SDK            │                      │
│            │    (Auth, Firestore,              │                      │
│            │     Storage listeners)            │                      │
└────────────┼──────────────────────────────────┼──────────────────────┘
             │                                  │
             ▼                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        VERCEL EDGE / SERVERLESS                     │
│                                                                     │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │                    Next.js Application                       │   │
│   │                                                              │   │
│   │   ┌──────────────┐  ┌──────────────┐  ┌────────────────┐   │   │
│   │   │  Pages/App   │  │  API Routes  │  │  Middleware     │   │   │
│   │   │  (SSR + CSR) │  │  /api/*      │  │  (Auth Guard)  │   │   │
│   │   └──────────────┘  └──────┬───────┘  └────────────────┘   │   │
│   │                            │                                 │   │
│   └────────────────────────────┼─────────────────────────────────┘   │
│                                │                                     │
└────────────────────────────────┼─────────────────────────────────────┘
                                 │
                    ┌────────────┼────────────┐
                    ▼            ▼            ▼
┌──────────────────────┐ ┌────────────┐ ┌──────────────────────┐
│   FIREBASE SERVICES  │ │  OPENAI    │ │  FIREBASE FUNCTIONS  │
│                      │ │  API       │ │                      │
│  ┌────────────────┐  │ │            │ │  ┌────────────────┐  │
│  │ Authentication │  │ │  GPT-4o    │ │  │ onSubmission    │  │
│  │ (Email/Pass)   │  │ │  (Vision)  │ │  │ Create         │  │
│  └────────────────┘  │ │            │ │  │ ─────────────  │  │
│  ┌────────────────┐  │ └────────────┘ │  │ Triggers AI    │  │
│  │ Cloud          │  │                │  │ validation     │  │
│  │ Firestore      │  │                │  │ pipeline       │  │
│  │ (Database)     │  │                │  └────────────────┘  │
│  └────────────────┘  │                │  ┌────────────────┐  │
│  ┌────────────────┐  │                │  │ onUpdate        │  │
│  │ Cloud          │  │                │  │ (version check) │  │
│  │ Storage        │  │                │  └────────────────┘  │
│  │ (Images)       │  │                │                      │
│  └────────────────┘  │                │                      │
└──────────────────────┘                └──────────────────────┘
```

---

## 3. Component Breakdown

### 3.1 Frontend (Next.js — App Router)

| Component | Responsibility |
|-----------|---------------|
| **Pages (App Router)** | Route-level components for each screen: login, register, profile, dashboard, submission form (steps 1–3), submission detail, admin dashboard, admin detail. |
| **Layout Components** | Shared shell with sidebar navigation, header with user info, and role-based nav items (user vs. admin). |
| **Form Engine** | Multi-step form for new submissions with core TTB label verification fields, inline validation, and step navigation. |
| **Image Uploader** | Drag-and-drop + file picker component. Handles client-side file type/size validation, preview generation, and direct upload to Firebase Storage. |
| **Real-Time Listeners** | Firestore `onSnapshot` subscriptions on the user's submissions query and individual submission documents for live status updates. |
| **Auth Context** | React context wrapping `firebase/auth` state. Provides current user, role, loading state, and guards for protected routes. |
| **Admin Components** | Submission review panel with AI report display, action buttons (approve/revision/reject), and notes fields. Only rendered for users with `role: "admin"`. |

### 3.2 Backend (Next.js API Routes)

| Route | Responsibility |
|-------|---------------|
| `POST /api/submissions` | Validates form data, writes submission document to Firestore, returns submission ID. Image upload is handled separately via Firebase Storage client SDK. |
| `PUT /api/submissions/:id` | Validates edit permissions (checks `status`, `validationInProgress`, `version`), updates document in a Firestore transaction. |
| `POST /api/submissions/:id/resubmit` | Resets status to `pending`, increments version, logs to history subcollection, triggers new validation. |
| `POST /api/admin/submissions/:id/review` | Admin-only. Writes review document, updates submission status. |
| `GET /api/profile`, `PUT /api/profile` | Read/update user profile document. |
| `POST /api/validate` | (Internal) Called by Cloud Function or directly after submission. Orchestrates the GPT-4o validation pipeline. |

**Middleware stack (applied to all `/api/*` routes):**

```
Request
  → verifyFirebaseIdToken()      // Decodes & validates the Bearer token
  → attachUserRole()             // Reads custom claims, attaches role to request
  → checkAdminRole()             // For /api/admin/* routes only
  → handler()
```

### 3.3 Firebase Cloud Functions

| Function | Trigger | Responsibility |
|----------|---------|---------------|
| `onSubmissionCreated` | Firestore `onCreate` on `submissions/{id}` | Sets `validationInProgress: true`, downloads images from Storage, calls GPT-4o API, writes results to `validationResults` subcollection, updates submission `status` and `validationInProgress`. |
| `onSubmissionUpdated` | Firestore `onUpdate` on `submissions/{id}` | Detects version changes (user edit). If `validationInProgress` was true but version changed, aborts current pipeline. If a resubmit occurred, re-triggers validation. |
| `setAdminClaim` | HTTPS callable | Admin seed function. Takes a UID and sets the `role: "admin"` custom claim. Called manually or via a seed script. |

### 3.4 External Services

| Service | Usage | Rate Limits |
|---------|-------|-------------|
| **OpenAI GPT-4o** | Vision API for label image analysis and text extraction. Single API call per submission sends image(s) + form data, receives structured JSON response. | Standard OpenAI rate limits. ~30s per call. |

---

## 4. Data Flow

### 4.1 Submission & Validation Flow

```
User (Browser)                  Vercel (API)              Firebase                    OpenAI
     │                              │                        │                          │
     │  1. Fill form + upload       │                        │                          │
     │     images to Storage ──────────────────────────────► │ (Cloud Storage)          │
     │                              │                        │                          │
     │  2. POST /api/submissions ──►│                        │                          │
     │                              │  3. Write submission   │                          │
     │                              │     to Firestore ────► │ (Firestore)              │
     │                              │                        │                          │
     │  4. Response: 201 Created ◄──│                        │                          │
     │     (submissionId)           │                        │                          │
     │                              │                        │                          │
     │  5. Redirect to dashboard    │                        │  6. onCreate trigger     │
     │     + onSnapshot listener    │                        │     fires Cloud Function │
     │                              │                        │          │                │
     │                              │                        │          ▼                │
     │                              │                        │  7. Set validationIn-    │
     │                              │                        │     Progress = true      │
     │                              │                        │          │                │
     │                              │                        │          │  8. Send image │
     │                              │                        │          │  + form data   │
     │                              │                        │          │ ──────────────►│
     │                              │                        │          │                │
     │                              │                        │          │  9. GPT-4o     │
     │                              │                        │          │  analyzes &    │
     │                              │                        │          │  returns JSON  │
     │                              │                        │          │ ◄──────────────│
     │                              │                        │          │                │
     │                              │                        │  10. Write validation    │
     │                              │                        │      results to          │
     │                              │                        │      subcollection       │
     │                              │                        │          │                │
     │                              │                        │  11. Update status       │
     │                              │                        │      (approved or        │
     │                              │                        │       needsAttention)    │
     │                              │                        │      + set validation-   │
     │                              │                        │      InProgress = false  │
     │                              │                        │          │                │
     │  12. onSnapshot fires ◄──────────────────────────────────────────┘                │
     │      Dashboard updates       │                        │                          │
     │      in real-time            │                        │                          │
```

### 4.2 Admin Review Flow

```
Admin (Browser)                 Vercel (API)              Firebase
     │                              │                        │
     │  1. View Needs Attention     │                        │
     │     (onSnapshot query:       │                        │
     │      needsAttention=true) ◄──────────────────────────►│
     │                              │                        │
     │  2. Open submission detail   │                        │
     │     (reads submission +      │                        │
     │      validationResults +     │                        │
     │      images)                 │                        │
     │                              │                        │
     │  3. POST /api/admin/         │                        │
     │     submissions/:id/review ─►│                        │
     │     { action, feedback,      │  4. Firestore          │
     │       internalNotes }        │     transaction:       │
     │                              │     - Write review doc │
     │                              │     - Update status  ─►│
     │                              │     - Clear needs-     │
     │                              │       Attention flag    │
     │                              │                        │
     │  5. Response: 200 OK ◄───────│                        │
     │                              │                        │
     │                              │                        │
User (Browser)                      │                        │
     │  6. onSnapshot fires ◄───────────────────────────────►│
     │     Status updates to        │                        │
     │     approved/needs_revision  │                        │
```

### 4.3 Edit-During-Validation Flow (Race Condition)

```
User (Browser)                  Vercel (API)              Firebase                    Cloud Function
     │                              │                        │                          │
     │                              │                        │  (validation running)    │
     │                              │                        │  validationInProgress    │
     │                              │                        │  = true, version = 1    │
     │                              │                        │          │                │
     │  1. PUT /api/submissions/    │                        │          │ (processing    │
     │     :id (edit request) ─────►│                        │          │  GPT-4o call)  │
     │                              │  2. Firestore          │          │                │
     │                              │     transaction:       │          │                │
     │                              │     read submission    │          │                │
     │                              │     ──────────────────►│          │                │
     │                              │                        │          │                │
     │                              │  3. Check: validation- │          │                │
     │                              │     InProgress = true  │          │                │
     │                              │                        │          │                │
     │  4. Response: 409 Conflict ◄─│                        │          │                │
     │     "Validation in progress" │                        │          │                │
     │                              │                        │          │                │
     │  5. UI disables edit button  │                        │          │                │
     │     Shows: "Currently being  │                        │          │                │
     │     validated..."            │                        │          │                │
     │                              │                        │          │                │
     │                              │                        │  6. Validation completes │
     │                              │                        │     validationInProgress │
     │                              │                        │     = false              │
     │                              │                        │          │                │
     │  7. onSnapshot fires         │                        │          │                │
     │     Edit button re-enabled   │                        │          │                │
```

---

## 5. Firestore Data Model

Detailed schema is in `prd.md` Section 7. Below is the structural overview focused on relationships and access patterns.

### 5.1 Collection Hierarchy

```
firestore-root/
│
├── users/                          # Top-level collection
│   └── {uid}/                      # Document per user (ID = Firebase Auth UID)
│
└── submissions/                    # Top-level collection
    └── {submissionId}/             # Document per submission
        ├── images/                 # Subcollection
        │   └── {imageId}/
        ├── validationResults/      # Subcollection
        │   └── {resultId}/
        ├── reviews/                # Subcollection
        │   └── {reviewId}/
        └── history/                # Subcollection
            └── {historyId}/
```

### 5.2 Why Top-Level `submissions` (Not a Subcollection of `users`)

Submissions are a top-level collection rather than nested under `users/{uid}/submissions` because:

1. **Admin queries**: Admins need to query all submissions across all users. Firestore collection group queries can do this with subcollections, but a top-level collection is simpler and avoids needing collection group indexes for every filter combination.
2. **Pagination**: Paginated queries with compound filters (status + date, productType + date) are more straightforward on a single top-level collection.
3. **User scoping**: User submissions are scoped via a `userId` field + composite index (`userId` + `createdAt`), which Firestore handles efficiently.

### 5.3 Document Size Considerations

- Submission documents contain form fields only (strings, booleans, timestamps) — well under Firestore's 1 MiB document limit.
- Large data (images, raw AI responses) is stored either in Cloud Storage (images) or in subcollection documents (validation results), preventing main document bloat.
- The `rawAiResponse` field in `validationResults` could be large (~5–20 KB JSON). Stored in a subcollection document to keep the parent submission document lean for list queries.

---

## 6. Authentication & Authorization

### 6.1 Authentication Flow

```
┌────────────┐     ┌──────────────────┐     ┌───────────────┐
│   Browser   │────►│ Firebase Auth SDK │────►│ Firebase Auth │
│   (Client)  │◄────│ (Client-side)    │◄────│ (Google)      │
└──────┬──────┘     └──────────────────┘     └───────────────┘
       │
       │  ID Token (JWT)
       │  in Authorization header
       ▼
┌──────────────┐     ┌────────────────────┐
│  Next.js API │────►│ Firebase Admin SDK │
│  Routes      │◄────│ verifyIdToken()    │
└──────────────┘     └────────────────────┘
```

### 6.2 Role-Based Access Control

| Layer | Mechanism | How |
|-------|-----------|-----|
| **Client-side routing** | Auth Context + role check | React context reads `user.getIdTokenResult()` and checks `claims.role`. Admin routes redirect non-admins. |
| **API routes** | Middleware | `verifyIdToken()` decodes the JWT; middleware checks `decodedToken.role === 'admin'` for admin endpoints. Returns 403 if unauthorized. |
| **Firestore** | Security Rules | Rules check `request.auth.token.role == 'admin'` for admin access and `request.auth.uid == resource.data.userId` for user access. |
| **Cloud Storage** | Security Rules | Rules ensure uploads go to the correct path and are from authenticated users. Downloads restricted to submission owner or admin. |

### 6.3 Admin Provisioning

Admin accounts are not self-service. They are created by:

1. A seed script (`scripts/set-admin.ts`) that calls `admin.auth().setCustomUserClaims(uid, { role: 'admin' })`.
2. The `setAdminClaim` Cloud Function (HTTPS callable, restricted to existing admins or a bootstrap secret).

---

## 7. AI Validation Pipeline

### 7.1 Pipeline Architecture

```
┌─────────────────────────────────────────────────────────┐
│                 Cloud Function: onSubmissionCreated       │
│                                                          │
│  ┌──────────┐    ┌──────────┐    ┌──────────────────┐   │
│  │ 1. Lock  │───►│ 2. Fetch │───►│ 3. Build GPT-4o  │   │
│  │ Set      │    │ Images   │    │    Prompt         │   │
│  │ validat- │    │ from     │    │                   │   │
│  │ ionIn-   │    │ Storage  │    │  - System prompt  │   │
│  │ Progress │    │          │    │    (TTB rules)    │   │
│  │ = true   │    │          │    │  - Form data JSON │   │
│  └──────────┘    └──────────┘    │  - Image(s)      │   │
│                                  │  - Output schema  │   │
│                                  └────────┬──────────┘   │
│                                           │              │
│                                           ▼              │
│                                  ┌──────────────────┐   │
│                                  │ 4. Call OpenAI    │   │
│                                  │    GPT-4o API     │   │
│                                  │    (with retry)   │   │
│                                  └────────┬──────────┘   │
│                                           │              │
│                                           ▼              │
│                                  ┌──────────────────┐   │
│                                  │ 5. Parse          │   │
│                                  │    Response       │   │
│                                  │    (validate JSON │   │
│                                  │     structure)    │   │
│                                  └────────┬──────────┘   │
│                                           │              │
│                           ┌───────────────┼──────────┐   │
│                           ▼               ▼          │   │
│                  ┌──────────────┐  ┌────────────┐   │   │
│                  │ 6a. All pass │  │ 6b. Fail   │   │   │
│                  │ status =     │  │ needsAtten │   │   │
│                  │ "approved"   │  │ = true     │   │   │
│                  └──────┬───────┘  └─────┬──────┘   │   │
│                         │                │          │   │
│                         ▼                ▼          │   │
│                  ┌──────────────────────────────┐   │   │
│                  │ 7. Write validationResults   │   │   │
│                  │    Update submission status   │   │   │
│                  │    Set validationInProgress   │   │   │
│                  │    = false                    │   │   │
│                  └──────────────────────────────┘   │   │
│                                                     │   │
└─────────────────────────────────────────────────────────┘
```

### 7.2 GPT-4o Request Structure

```json
{
  "model": "gpt-4o",
  "max_tokens": 4096,
  "messages": [
    {
      "role": "system",
      "content": "You are a TTB label compliance analyst. Extract all visible text from the provided alcohol label image and compare it against the submitted form data. Return a structured JSON response... [full system prompt with TTB rules, expected output schema, and matching logic instructions]"
    },
    {
      "role": "user",
      "content": [
        {
          "type": "image_url",
          "image_url": { "url": "data:image/jpeg;base64,{base64_image}" }
        },
        {
          "type": "text",
          "text": "Form data: {\"brandName\": \"Old Tom Distillery\", \"classTypeDesignation\": \"Kentucky Straight Bourbon Whiskey\", \"alcoholContent\": \"45\", \"netContents\": \"750 mL\", \"nameAddressOnLabel\": \"Bottled By Old Tom Distillery, Louisville, KY 40202\", \"productType\": \"distilled_spirits\", \"source\": \"domestic\"}"
        }
      ]
    }
  ],
  "response_format": { "type": "json_object" }
}
```

### 7.3 Expected Response Schema

```json
{
  "extractedText": "OLD TOM DISTILLERY Kentucky Straight Bourbon Whiskey 45% Alc./Vol...",
  "fieldResults": [
    {
      "fieldName": "brandName",
      "formValue": "Old Tom Distillery",
      "labelValue": "OLD TOM DISTILLERY",
      "matchStatus": "MATCH",
      "notes": "Case-insensitive match. Exact text found."
    },
    {
      "fieldName": "alcoholContent",
      "formValue": "45",
      "labelValue": "45% Alc./Vol. (90 Proof)",
      "matchStatus": "MATCH",
      "notes": "Numeric value 45 extracted, matches form."
    }
  ],
  "complianceWarnings": [
    {
      "check": "standardOfFill",
      "message": "750 mL is an approved standard of fill.",
      "severity": "info"
    }
  ],
  "overallPass": true,
  "confidence": "high"
}
```

### 7.4 Retry & Timeout Strategy

```
Attempt 1  →  timeout 60s  →  fail  →  wait 2s
Attempt 2  →  timeout 60s  →  fail  →  wait 4s
Attempt 3  →  timeout 60s  →  fail  →  flag for admin
                                         (write error to validationResults,
                                          set needsAttention = true,
                                          set validationInProgress = false)
```

---

## 8. File Storage Architecture

### 8.1 Storage Path Convention

```
gs://{bucket}/
└── submissions/
    └── {submissionId}/
        └── images/
            ├── {imageId}_brand_front.jpg
            ├── {imageId}_back.jpg
            └── {imageId}_other.png
```

### 8.2 Upload Flow

```
Browser                           Firebase Storage           Firestore
  │                                     │                       │
  │  1. Upload file directly via        │                       │
  │     Firebase Storage SDK ──────────►│                       │
  │     (uses auth token for rules)     │                       │
  │                                     │                       │
  │  2. Receive download URL ◄──────────│                       │
  │                                     │                       │
  │  3. Write image metadata            │                       │
  │     (downloadUrl, path,             │                       │
  │      size, type) to                 │                       │
  │     Firestore subcollection ────────────────────────────────►│
  │                                     │                       │
```

### 8.3 Storage Security Rules

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /submissions/{submissionId}/images/{imageFile} {

      // Allow upload if authenticated and file is a valid image under 10MB
      allow write: if request.auth != null
                   && request.resource.size < 10 * 1024 * 1024
                   && request.resource.contentType.matches('image/.*');

      // Allow read if user owns the submission or is admin
      // (verified server-side; storage rules use auth token)
      allow read: if request.auth != null;
    }
  }
}
```

---

## 9. Real-Time Updates

### 9.1 Listener Architecture

The frontend uses Firestore's `onSnapshot` for three key real-time features:

| Listener | Location | Query | Purpose |
|----------|----------|-------|---------|
| **Dashboard list** | User dashboard page | `submissions` where `userId == currentUser.uid` ordered by `createdAt DESC` with pagination | Live status updates across all submissions — table rows update in place when status changes. |
| **Submission detail** | Submission detail page | Single document `submissions/{id}` + subcollections | Individual submission status, `validationInProgress` flag (controls edit button state), validation results appearing after processing. |
| **Admin queue** | Admin dashboard | `submissions` where `needsAttention == true` ordered by `createdAt ASC` | New flagged items appear automatically. Resolved items disappear from queue in real-time. |

### 9.2 Listener Lifecycle

```
Page Mount → subscribe (onSnapshot)
             │
             ├─► onNext: update React state
             │
             ├─► onError: show error toast, retry
             │
Page Unmount → unsubscribe (cleanup)
```

All listeners are attached in `useEffect` hooks with cleanup functions to prevent memory leaks and orphaned listeners.

---

## 10. Concurrency & Race Condition Handling

### 10.1 Optimistic Locking

Every submission document has a `version` field (integer, starts at 1). All writes that modify submission content use a Firestore transaction:

```typescript
await runTransaction(db, async (transaction) => {
  const doc = await transaction.get(submissionRef);
  const currentVersion = doc.data().version;

  if (currentVersion !== expectedVersion) {
    throw new Error('VERSION_CONFLICT');
    // Another write occurred since the client read the document.
    // Client should re-read and retry or show a conflict message.
  }

  transaction.update(submissionRef, {
    ...updatedFields,
    version: currentVersion + 1,
    updatedAt: serverTimestamp(),
  });
});
```

### 10.2 Validation Lock

The `validationInProgress` boolean prevents edits during AI processing:

| State | `validationInProgress` | `version` | User Can Edit? | Cloud Function Behavior |
|-------|----------------------|-----------|---------------|------------------------|
| Just submitted | `true` | 1 | No | Processes normally |
| Validation complete | `false` | 1 | Yes (if status = pending) | — |
| User edits | `false` → `true` (new validation queued) | 1 → 2 | No (new validation starting) | New function instance checks version matches |
| Stale function sees version mismatch | — | — | — | Aborts without writing results |

### 10.3 Cloud Function Version Check

```typescript
// At the START of the Cloud Function (before calling GPT-4o):
const submissionSnap = await submissionRef.get();
const versionAtStart = submissionSnap.data().version;

// ... (call GPT-4o, process results) ...

// At the END (before writing results):
await runTransaction(db, async (transaction) => {
  const currentDoc = await transaction.get(submissionRef);
  if (currentDoc.data().version !== versionAtStart) {
    // User edited while we were processing. Abort — don't overwrite.
    console.log('Version mismatch. Aborting stale validation.');
    return;
  }
  transaction.update(submissionRef, { status, validationInProgress: false });
  // Write validation results...
});
```

---

## 11. API Layer

### 11.1 Route Map

```
/api
├── /profile
│   ├── GET     → getProfile
│   └── PUT     → updateProfile
│
├── /submissions
│   ├── GET     → listUserSubmissions (paginated, filterable)
│   ├── POST    → createSubmission
│   └── /:id
│       ├── GET     → getSubmission (includes validation results)
│       ├── PUT     → editSubmission (checks lock + version)
│       └── /resubmit
│           └── POST → resubmitSubmission
│
├── /admin
│   ├── /stats
│   │   └── GET     → getAdminStats
│   └── /submissions
│       ├── GET     → listAllSubmissions (paginated, filterable)
│       └── /:id
│           ├── GET     → getSubmissionAdmin (includes raw AI response)
│           └── /review
│               └── POST → reviewSubmission (approve/revise/reject)
│
└── /validate (internal)
    └── POST    → triggerValidation (called by Cloud Function or internally)
```

### 11.2 Common Response Envelope

```json
{
  "success": true,
  "data": { ... },
  "error": null,
  "pagination": {
    "cursor": "abc123",
    "hasMore": true,
    "total": 47
  }
}
```

### 11.3 Error Response Format

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "VALIDATION_IN_PROGRESS",
    "message": "This submission is currently being validated. Please wait for the results before editing.",
    "details": {}
  }
}
```

### 11.4 Pagination Strategy

All list endpoints use **cursor-based pagination** via Firestore's `startAfter`:

- Client sends `?cursor={lastDocId}&limit=20&status=pending`.
- Server queries Firestore with `orderBy('createdAt', 'desc').startAfter(cursorDoc).limit(limit)`.
- Response includes `pagination.cursor` (last document ID) and `pagination.hasMore`.

---

## 12. Frontend Architecture

### 12.1 Directory Structure

```
src/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Route group: public auth pages
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   └── reset-password/page.tsx
│   ├── (user)/                   # Route group: authenticated user pages
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
│   ├── (admin)/                  # Route group: admin pages
│   │   ├── layout.tsx            # Admin shell (with role guard)
│   │   ├── dashboard/page.tsx
│   │   └── submissions/
│   │       └── [id]/page.tsx     # Admin submission detail + review
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
│   ├── ui/                       # Generic UI primitives (Button, Input, Card, etc.)
│   ├── forms/                    # Form field components, validation schemas
│   ├── submission/               # Submission-specific components
│   │   ├── ValidationResultsPanel.tsx
│   │   ├── FieldCheckRow.tsx
│   │   ├── ImageUploader.tsx
│   │   └── StatusBadge.tsx
│   └── admin/                    # Admin-specific components
│       ├── ReviewActionPanel.tsx
│       └── AiReportViewer.tsx
│
├── lib/
│   ├── firebase/
│   │   ├── client.ts             # Firebase client SDK init
│   │   ├── admin.ts              # Firebase Admin SDK init (server only)
│   │   └── storage.ts            # Storage upload helpers
│   ├── auth/
│   │   ├── context.tsx           # AuthProvider + useAuth hook
│   │   └── guards.tsx            # Route protection HOCs
│   ├── hooks/
│   │   ├── useSubmissions.ts     # Firestore listener for submission list
│   │   ├── useSubmission.ts      # Firestore listener for single submission
│   │   └── useAdminQueue.ts      # Firestore listener for needs-attention queue
│   └── validation/
│       └── formSchemas.ts        # Zod schemas for form validation (shared client/server)
│
├── types/
│   ├── submission.ts             # TypeScript interfaces
│   ├── user.ts
│   └── validation.ts
│
└── styles/
    └── globals.css               # Tailwind directives + custom tokens
```

### 12.2 State Management

| State Type | Solution | Rationale |
|-----------|----------|-----------|
| **Auth state** | React Context (`AuthProvider`) | Global, needed everywhere. Wraps Firebase Auth `onAuthStateChanged`. |
| **Server data (submissions, profiles)** | Firestore `onSnapshot` via custom hooks | Real-time by default. No need for React Query or SWR — Firestore listeners handle caching, updates, and re-fetching. |
| **Form state** | React Hook Form + Zod | Multi-step form with validation. `useForm` persists across steps. Zod schemas shared with server for consistent validation. |
| **UI state** | Component-local `useState` | Modals, dropdowns, loading indicators — no global store needed. |

---

## 13. Error Handling Strategy

### 13.1 Error Layers

| Layer | Strategy |
|-------|----------|
| **Client form validation** | Zod schemas validate on blur and on submit. Errors displayed inline beneath fields. Prevents invalid submissions from reaching the server. |
| **API route validation** | Same Zod schemas re-validate on the server. Returns 400 with field-level error details. |
| **Firestore transaction failures** | Caught in try/catch. Version conflicts return 409. Lock conflicts return 423. Client shows appropriate message and prompts retry. |
| **Cloud Function failures** | Wrapped in try/catch. On GPT-4o error: retry up to 3x. On final failure: write error to `validationResults`, set `needsAttention: true`, release lock. |
| **Image upload failures** | Firebase Storage SDK errors caught client-side. User shown toast with retry option. Submission not created until at least one image uploads successfully. |
| **Network errors** | Client-side fetch wrapper catches network errors. Shows "Connection lost" banner with auto-retry. Firestore listeners auto-reconnect. |

### 13.2 HTTP Status Code Usage

| Code | Meaning | When Used |
|------|---------|-----------|
| 200 | Success | Reads, updates |
| 201 | Created | New submission, new review |
| 400 | Bad Request | Validation error (missing/invalid fields) |
| 401 | Unauthorized | Missing or invalid Firebase ID token |
| 403 | Forbidden | User accessing admin route, or accessing another user's submission |
| 404 | Not Found | Submission ID doesn't exist |
| 409 | Conflict | Version mismatch (optimistic locking) |
| 423 | Locked | Validation in progress, edit not allowed |
| 500 | Server Error | Unexpected error |

---

## 14. Security Architecture

### 14.1 Defense in Depth

```
Layer 1: Client-Side
  ├── Route guards (role-based)
  ├── File type/size validation before upload
  └── Form input sanitization

Layer 2: Network
  ├── HTTPS enforced (Vercel + Firebase default)
  └── CORS restricted to app domain

Layer 3: API Routes (Vercel)
  ├── Firebase ID token verification on every request
  ├── Role-based middleware for admin routes
  ├── Input validation (Zod schemas)
  └── Rate limiting (Vercel built-in)

Layer 4: Firebase Services
  ├── Firestore Security Rules (user scoping, role checks, status checks)
  ├── Storage Security Rules (auth required, file type/size enforcement)
  └── Custom claims for admin role (cannot be self-assigned)

Layer 5: External APIs
  └── OpenAI API key stored in environment variables (server-side only)
      Never sent to client. Called only from Cloud Functions or API routes.
```

### 14.2 Sensitive Data Handling

| Data | Where Stored | Protection |
|------|-------------|------------|
| User passwords | Firebase Auth (Google infra) | Hashed by Google; never in Firestore |
| OpenAI API key | Vercel env vars + Cloud Functions config | Server-side only; never in client bundle |
| Firebase Admin credentials | Vercel env vars | Server-side only; never in client bundle |
| Label images | Firebase Cloud Storage | Access controlled by Storage Security Rules |
| User PII (name, email, phone, address) | Firestore `users` collection | Firestore Security Rules restrict access to owner + admins |

---

## 15. Infrastructure & Deployment

### 15.1 Deployment Architecture

```
┌──────────────────────────────────────────┐
│              GitHub Repository            │
│         (main branch = production)        │
└──────────────┬───────────────────────────┘
               │  push / merge to main
               ▼
┌──────────────────────────┐    ┌─────────────────────────┐
│       Vercel              │    │    Firebase CLI          │
│                           │    │    (manual deploy or     │
│  • Builds Next.js app     │    │     CI/CD pipeline)      │
│  • Deploys to edge        │    │                          │
│  • Hosts API routes       │    │  • Deploys Cloud         │
│  • Auto-SSL               │    │    Functions              │
│  • Preview deployments    │    │  • Deploys Firestore     │
│    for PRs                │    │    Rules + Indexes        │
│                           │    │  • Deploys Storage Rules  │
└──────────────────────────┘    └─────────────────────────┘
         │                                  │
         ▼                                  ▼
┌──────────────────────────┐    ┌─────────────────────────┐
│   Vercel Edge Network     │    │   Firebase Project       │
│                           │    │                          │
│  app.example.com          │    │  • Firestore database    │
│  api.example.com/api/*    │    │  • Cloud Storage bucket  │
│                           │    │  • Auth service          │
│                           │    │  • Cloud Functions       │
└──────────────────────────┘    └─────────────────────────┘
```

### 15.2 Environment Tiers

| Tier | Vercel | Firebase | Purpose |
|------|--------|----------|---------|
| **Local dev** | `next dev` on localhost:3000 | Firebase Emulator Suite (Firestore, Auth, Storage, Functions) | Development and testing with no cloud costs |
| **Preview** | Vercel preview deployment (per PR) | Dev Firebase project | PR review and integration testing |
| **Production** | Vercel production deployment | Production Firebase project | Live application |

### 15.3 Local Development Setup

```bash
# 1. Clone and install
git clone <repo-url> && cd label-verification-app
npm install

# 2. Environment variables
cp .env.example .env.local
# Fill in Firebase client config, admin credentials, OpenAI key

# 3. Start Firebase Emulators
npx firebase emulators:start

# 4. Start Next.js dev server
npm run dev

# 5. Seed admin user (one-time)
npm run seed:admin
```

---

## 16. Version Roadmap

### v1.0 — Core MVP

**Goal:** Deliver a working end-to-end application that meets all core requirements from the project brief. A user can register, submit a label, and see pass/fail results. An admin can review flagged submissions.

**Scope:**

| Area | What's Included |
|------|----------------|
| **Auth** | Email/password registration and login via Firebase Auth. Profile setup with all required fields (name, email, phone, company, address, permit number). Role-based routing (user vs. admin). |
| **Submission Form** | Multi-step form: Step 1 (9 core TTB fields) → Step 2 (image upload) → Step 3 (review & submit). Single flat form — no product-type-specific conditional fields. |
| **Image Upload** | Single image upload (front label) via Firebase Storage. File type and size validation (JPEG, PNG, ≤ 10 MB). Preview display. |
| **AI Validation** | GPT-4o vision integration via Cloud Function. Tier 1 critical checks: brand name, class/type designation, alcohol content, net contents, health warning, name & address. Structured JSON response parsing. |
| **Status Flow** | Pending → Approved (auto) or Pending + needsAttention (flagged). Admin can approve, send for revision, or reject. User sees status on dashboard. |
| **User Dashboard** | Submissions table with status, sorted by date. Click to view detail. Summary stat counts. |
| **Admin Dashboard** | All submissions table. "Needs Attention" filtered tab. Click into detail to see AI report and take action. |
| **Submission Detail** | Form data display, label image, validation results checklist (match/mismatch/not found per field). Admin feedback banner when applicable. |
| **Error Handling** | GPT-4o retry (3x with backoff). Low-confidence flagging. Corrupt image rejection at upload time. |
| **Deployment** | Vercel (Next.js) + Firebase (Firestore, Auth, Storage, Functions). Live URL accessible. |

**Not in v1.0:** Multi-image upload, submission editing, revision/resubmission flow, real-time listeners, Tier 2/3 checks, optimistic locking.

**Estimated effort:** 1 day.

---

### v1.1 — Polish & Stability

**Goal:** Add the editing/resubmission workflows, real-time updates, and race condition handling. Harden the experience with proper concurrency controls.

**Scope:**

| Area | What's Added |
|------|-------------|
| **Multi-Image Upload** | Support front, back, and supplemental label images. Image type tagging (brand_front, back, other). Drag-and-drop zone. |
| **Edit Pending Submission** | Edit button on pending submissions. `validationInProgress` lock check. Firestore transaction with optimistic locking (`version` field). Re-triggers validation on save. |
| **Resubmission Flow** | "Needs Revision" status with admin feedback display. "Revise & Resubmit" button that pre-fills the form with existing data. Version history tracked in `history` subcollection. |
| **Duplicate & Edit** | "Duplicate & Edit" button on rejected submissions. Creates a new submission pre-filled from the old one with "Resubmission" application type auto-checked. |
| **Real-Time Updates** | Firestore `onSnapshot` listeners on user dashboard, submission detail, and admin queue. Status changes appear instantly without page refresh. |
| **Race Condition Handling** | Cloud Function version check before writing results. Edit blocked when `validationInProgress` is true. 409/423 error responses with user-friendly messages. |
| **Pagination** | Cursor-based pagination on both user and admin dashboards. Status and product type filtering. |
| **Forgot Password** | Firebase `sendPasswordResetEmail` integration. Reset password page. |

**Not in v1.1:** Tier 3 compliance warnings, advanced fuzzy matching, image highlighting, email notifications, automated tests.

**Estimated effort:** 1–2 days.

---

### v2.0 — Enhanced Validation & UX

**Goal:** Deepen the validation quality, add compliance warnings, improve the admin experience, and polish the UI. This version represents a "feature-complete" product.

**Scope:**

| Area | What's Added |
|------|-------------|
| **Tier 3 Compliance Warnings** | Informational checks that don't block approval: same field of vision (spirits), health warning formatting (all caps, bold), designation consistency, standard of fill verification. Displayed in a separate "Warnings" section on the detail page. |
| **Fuzzy Matching Improvements** | Levenshtein/Jaro-Winkler similarity scoring displayed per field. Configurable threshold (default 90%). Admin can see similarity percentage alongside match/mismatch status. Handles common OCR-like substitutions (O/0, I/1). |
| **Admin Internal Notes** | Separate "Internal Notes" field (admin-only, not visible to user) alongside "Feedback to User" (visible). Internal notes persist across review cycles for audit trail. |
| **Submission History Timeline** | Version history displayed as a timeline on the detail page. Each entry shows what changed, who changed it, and when. Admin reviews shown in the timeline alongside user edits. |
| **Dashboard Enhancements** | Search bar on admin dashboard (search by brand name, company name, submission ID). Column sorting on all table columns. Export submissions list as CSV. |
| **UI Polish** | Loading skeleton screens while data loads. Toast notifications for actions (submit, edit, review). Confirmation modals for destructive actions (reject). Responsive layout for tablet/mobile. Status badge color coding (green/yellow/red/gray). |
| **Form UX** | Auto-save draft as user fills in the form (saved to `localStorage`, not Firestore). Helper tooltips on complex fields with TTB regulatory references. Field-level error messages with specific guidance. |
| **Image Viewer** | Zoomable image viewer on detail pages. Side-by-side view of form data and label image. |
| **Validation Report for User** | Simplified, user-friendly version of the AI report on the user's detail page (no raw AI response or confidence scores — just clear match/mismatch/missing per field with plain-language explanations). |

**Not in v2.0:** Image highlighting/bounding boxes, email notifications, batch submissions, PDF generation, automated tests.

**Estimated effort:** 3–5 days.

---

### v3.0 — Scale & Integration

**Goal:** Production-hardening, advanced features, and integrations that would be needed for a real TTB-adjacent tool. This version goes beyond the take-home requirements into a production-ready product.

**Scope:**

| Area | What's Added |
|------|-------------|
| **Image Highlighting** | GPT-4o prompt updated to return approximate bounding box coordinates for each detected field. Frontend overlays translucent colored rectangles on the label image showing where brand name, ABV, warnings, etc. were found. Clickable highlights link to the corresponding field check result. |
| **Email Notifications** | Firebase Cloud Functions trigger emails (via SendGrid or Firebase Extensions) on status changes: submission received (user), validation complete (user), needs attention (admin), revision requested (user), approved (user). User can configure notification preferences in settings. |
| **Batch Submissions** | Upload a CSV of form data + a ZIP of label images. System creates one submission per row, matches images by filename convention. Batch status overview page. |
| **PDF Generation** | Auto-generate a filled TTB Form 5100.31 PDF from submitted form data. Downloadable from the submission detail page. Uses a PDF template with field mapping. |
| **Automated Testing** | Unit tests for validation logic (field matching, normalization). Integration tests for API routes (using Firebase Emulator Suite). E2E tests with Playwright for critical user flows (registration, submission, admin review). CI pipeline runs tests on every PR. |
| **Audit Trail** | Comprehensive activity logging: every read, write, status change, admin action logged with timestamp, actor, and IP. Viewable by admins in a dedicated audit log page. Exportable for compliance purposes. |
| **Analytics Dashboard** | Admin stats page with charts: submissions over time, approval rate, average validation time, most common failure reasons, submissions by product type. Built with Recharts. |
| **Rate Limiting** | API-level rate limiting per user to prevent abuse. Cloud Function concurrency controls to manage OpenAI API spend. Admin-configurable daily submission limits per user. |
| **Multi-Tenant Support** | Companies as first-class entities. Company admin role (can manage company users and see company submissions). Super-admin role (platform-level). Company-scoped dashboards. |
| **TTB COLAs Online Integration** | (Future/aspirational) API integration with TTB's COLAs Online system to submit approved labels directly. Would require TTB partnership and API access. |

**Not in v3.0:** Mobile native apps, offline support, multi-language support.

**Estimated effort:** 2–4 weeks.

---

## Appendix A: Technology Decisions Log

| Decision | Chosen | Alternatives Considered | Rationale |
|----------|--------|------------------------|-----------|
| Database | Cloud Firestore | PostgreSQL (Supabase), MongoDB Atlas, PlanetScale | Free tier, no server management, real-time listeners built-in, flexible document model matches variable product-type fields. |
| Auth | Firebase Auth | Auth0, Clerk, NextAuth.js | Native integration with Firestore + Storage security rules, free tier, handles password management entirely. |
| AI/Vision | GPT-4o (single multi-modal call) | Tesseract OCR + manual matching, Google Vision API, AWS Textract | GPT-4o handles extraction AND comparison in a single call, understands layout/context, returns structured JSON. Simpler pipeline than OCR + separate matching logic. |
| File storage | Firebase Cloud Storage | AWS S3, Cloudflare R2, Vercel Blob | Native Firebase integration, security rules tied to auth, free tier sufficient, direct client-side uploads. |
| Async processing | Cloud Functions (Firestore trigger) | BullMQ + Redis, Vercel Cron, manual polling | Event-driven (no polling), auto-scales, free tier sufficient. Direct Firestore integration for reading/writing results. |
| Frontend framework | Next.js (App Router) | Vite + React, Remix, SvelteKit | SSR for auth-protected pages, API routes in same codebase, excellent Vercel deployment, largest React ecosystem. |
| Styling | Tailwind CSS | CSS Modules, Styled Components, Chakra UI | Utility-first for rapid development, small bundle, good defaults, no runtime overhead. |
| Form handling | React Hook Form + Zod | Formik + Yup, native React state | Best performance for complex multi-step forms, Zod schemas shared with server for consistent validation. |
| Deployment | Vercel + Firebase | Railway, Render, AWS Amplify, Fly.io | Vercel optimized for Next.js with zero-config deploys. Firebase complements with managed backend services. Both have generous free tiers. |

---

## Appendix B: Firestore Read/Write Budget Estimation (v1.0)

Per submission lifecycle (submit → validate → admin review → user views result):

| Operation | Reads | Writes |
|-----------|-------|--------|
| Create submission | 1 (user profile check) | 2 (submission doc + image doc) |
| Cloud Function validation | 3 (submission + image + version check) | 3 (validation result + status update + lock release) |
| User views dashboard (20 items) | 20 | 0 |
| User views detail | 4 (submission + image + result + review) | 0 |
| Admin views queue (10 items) | 10 | 0 |
| Admin reviews | 2 (submission + result) | 3 (review doc + status update + clear flag) |
| Real-time listener (per status change) | 1 | 0 |

**Total per submission lifecycle:** ~41 reads, ~8 writes

**Spark plan budget (50K reads/day, 20K writes/day):** ~1,200 submissions/day before hitting read limits. Far exceeds demo/evaluation needs.
