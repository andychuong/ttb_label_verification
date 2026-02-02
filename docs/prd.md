# Product Requirements Document: AI-Powered Alcohol Label Verification App

**Version:** 1.0
**Date:** February 1, 2026
**Status:** Draft

---

## 1. Overview

This application simulates the Alcohol and Tobacco Tax and Trade Bureau (TTB) label approval process. Alcohol producers submit product information mirroring TTB Form 5100.31 (Application for and Certification/Exemption of Label/Bottle Approval) alongside an image of their bottle label. The system uses GPT-4o to verify that the label image matches the submitted form data and meets federal labeling requirements defined in 27 CFR parts 4, 5, 7, and 16.

The app has two sides: a **User Portal** for producers/applicants to submit and track label verifications, and an **Admin Portal** for reviewers to manage submissions requiring human attention.

---

## 2. User Roles

### 2.1 User (Applicant)
Alcohol producers, bottlers, or importers who submit label applications for verification. They can create an account, manage their profile, submit new applications, and track the status of all their submissions.

### 2.2 Admin (Reviewer)
Internal reviewers who monitor all submissions across the platform. They see a global dashboard of submissions, receive flagged items that failed automated validation, and can manually approve or reject submissions.

---

## 3. Authentication & User Profile

### 3.1 Authentication
- **Firebase Authentication** with email/password provider.
- Password must be at least 6 characters (Firebase default minimum; can be increased via custom validation).
- Firebase handles session tokens, token refresh, and secure credential storage.
- "Forgot password" flow via Firebase's built-in `sendPasswordResetEmail`.
- Users are assigned the "user" role by default. Admin accounts are created by setting a custom claim (`role: "admin"`) via the Firebase Admin SDK (manually or through a seed script).

### 3.2 User Profile Setup
After registration, the user completes their profile with the following fields:

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Full Name | Text | Yes | Name of the applicant or authorized agent |
| Email | Email | Yes | Pre-filled from registration; editable |
| Phone Number | Text | Yes | Contact number for the application (maps to TTB Form Item 12) |
| Company Name | Text | Yes | Name as shown on plant registry, basic permit, or brewer's notice (maps to Item 8) |
| Company Address | Text | Yes | Street, City, State, ZIP (maps to Item 8) |
| Mailing Address | Text | No | If different from company address (maps to Item 8a) |
| Permit/Registry Number | Text | Yes | Plant Registry, Basic Permit, or Brewer's Notice number (maps to Item 2) |
| Representative ID | Text | No | If applicable (maps to Item 1) |

Profile can be edited at any time from a settings page.

---

## 4. User Portal

### 4.1 Dashboard
After login, the user lands on a dashboard showing:

- **Summary stats** at the top: total submissions, approved, pending, needs revision.
- **Submissions table** with columns:
  - Submission ID (auto-generated)
  - Brand Name
  - Product Type (Wine / Distilled Spirits / Malt Beverage)
  - Date Submitted
  - Status (Pending, Approved, Needs Revision)
- Sortable by date and status. Filterable by status and product type.
- Each row is clickable to view the full submission detail.
- A prominent **"New Submission"** button in the top-right area.

### 4.2 Submission Detail View
Shows the complete form data, uploaded label image, and validation results:

- All submitted form fields displayed read-only (unless status is Pending — see Section 4.4).
- The uploaded label image displayed at a viewable size.
- **Validation Results Panel**: a checklist of each verified field showing status (Matched / Mismatch / Not Found / Pending Verification).
- If the status is "Needs Revision," any admin notes or feedback are displayed.
- A **"Duplicate & Edit"** button to pre-fill a new submission with the same data (for resubmission after rejection).

### 4.3 New Submission Flow

The new submission is a multi-step form with two stages.

#### Step 1: Application Form Data

The form mirrors a simplified version of TTB Form 5100.31 with fields organized by section. The required fields vary based on the selected **Type of Product** (Item 5). All three product categories (Wine, Distilled Spirits, Malt Beverage) share some common fields but have category-specific fields as well.

##### Common Fields (All Product Types)

| Field | Type | Required | TTB Form Mapping | Notes |
|-------|------|----------|-----------------|-------|
| Serial Number | Text | Yes | Item 4 | Applicant's serial number for the submission |
| Type of Product | Dropdown | Yes | Item 5 | Options: Wine, Distilled Spirits, Malt Beverage. Determines conditional fields. |
| Source of Product | Radio | Yes | Item 3 | Domestic or Imported |
| Brand Name | Text | Yes | Item 6 | The name under which the product is sold (e.g., "GREY GOOSE") |
| Fanciful Name | Text | No | Item 7 | Optional additional name (e.g., "BERRY ROUGE") |
| Alcohol Content | Text | Yes | Label requirement per 27 CFR 4.36, 5.65, 7.71 | ABV percentage as shown on label. Accept formats like "40%", "40", "40% Alc./Vol." |
| Net Contents | Text | Yes | Label requirement per 27 CFR 4.37, 5.70, 7.70 | Volume (e.g., "750 mL", "12 fl oz", "1 L"). Must be a standard of fill. |
| Name and Address on Label | Text | Yes | 27 CFR 4.35, 5.66-5.68, 7.66-7.68 | The bottler/importer name and address as it appears on the label |
| Type of Application | Checkbox group | Yes | Item 14 | Certificate of Label Approval / Certificate of Exemption / Distinctive Liquor Bottle / Resubmission After Rejection |
| If Resubmission | Text | Conditional | Item 14d | Previous TTB ID number (shown only if "Resubmission" is checked) |
| Formula Number | Text | No | Item 9 | If the product requires a formula |
| Container Info (blown/branded/embossed) | Textarea | No | Item 15 | Any information on the container not appearing on affixed labels |

##### Distilled Spirits–Specific Fields

| Field | Type | Required | Regulatory Basis | Notes |
|-------|------|----------|-----------------|-------|
| Class/Type Designation | Text | Yes | 27 CFR 5.165, 5.141 | e.g., "Vodka," "Kentucky Straight Bourbon Whiskey," "Chocolate Flavored Brandy" |
| Statement of Composition | Text | Conditional | 27 CFR 5.141 | Required if using a fanciful name instead of a standard class/type |
| Age Statement | Text | No | 27 CFR 5.74 | Required for: whisky aged < 4 years, brandy aged < 2 years, products with distillation date or age references |
| Country of Origin | Text | Conditional | 19 CFR 134.11, 27 CFR 5.69 | Required if Source = Imported |
| State of Distillation | Text | Conditional | 27 CFR 5.66(f) | Required for certain whisky types if distilled outside the state in the label address |
| Commodity Statement | Text | No | 27 CFR 5.71 | e.g., "Distilled from Grain" — required for neutral spirits, gin, or blends with neutral spirits |
| Presence of Coloring Materials | Text | No | 27 CFR 5.63(c)(6) | e.g., "Colored with Caramel" — required if coloring materials were used |
| FD&C Yellow #5 Declaration | Checkbox | No | 27 CFR 5.63(c)(5) | Must be disclosed on label if used |
| Cochineal/Carmine Declaration | Checkbox | No | 27 CFR 5.63(c)(6) | Must be disclosed on label if used |
| Sulfite Declaration | Checkbox | No | 27 CFR 5.63(c)(7) | Required if ≥ 10 ppm sulfur dioxide |

##### Wine-Specific Fields

| Field | Type | Required | Regulatory Basis | Notes |
|-------|------|----------|-----------------|-------|
| Class/Type Designation | Text | Yes | 27 CFR 4.21, 4.34 | e.g., "Red Wine," "Sparkling Wine," "Chardonnay" |
| Grape Varietal(s) | Text | Conditional | Item 10, 27 CFR 4.91 | Required if varietal appears on label |
| Appellation of Origin | Text | Conditional | Item 11, 27 CFR 4.25 | Required if label shows varietal, vintage date, or semi-generic type |
| Vintage Date | Text | No | 27 CFR 4.27 | Year of harvest if shown on label |
| Country of Origin | Text | Conditional | 19 CFR 134.11 | Required if Source = Imported |
| Sulfite Declaration | Checkbox | Yes (default checked) | 27 CFR 4.32(e) | Required if ≥ 10 ppm sulfur dioxide. Most wines require this. |
| FD&C Yellow #5 Declaration | Checkbox | No | 27 CFR 4.32(c) | Must be disclosed on label if used |
| Cochineal/Carmine Declaration | Checkbox | No | 27 CFR 4.32(d) | Must be disclosed on label if used |
| Percentage of Foreign Wine | Text | Conditional | 27 CFR 4.32(a)(4) | Required for blends of American and foreign wine if label references foreign wine |

##### Malt Beverage–Specific Fields

| Field | Type | Required | Regulatory Basis | Notes |
|-------|------|----------|-----------------|-------|
| Class/Type Designation | Text | Yes | 27 CFR 7.63 | e.g., "Ale," "Lager," "IPA," "Stout" |
| Country of Origin | Text | Conditional | 19 CFR 134.11 | Required if Source = Imported |

##### Health Warning Statement (All Product Types)

| Field | Type | Required | Regulatory Basis | Notes |
|-------|------|----------|-----------------|-------|
| Health Warning Included on Label | Checkbox | Yes (default checked) | 27 CFR Part 16 | The applicant confirms the government warning will appear on the label. Required for all beverages ≥ 0.5% ABV. |

The exact mandated warning text is:

> GOVERNMENT WARNING: (1) According to the Surgeon General, women should not drink alcoholic beverages during pregnancy because of the risk of birth defects. (2) Consumption of alcoholic beverages impairs your ability to drive a car or operate machinery, and may cause health problems.

**Form Validation Rules:**
- All required fields must be filled before proceeding to Step 2.
- Alcohol Content must be a valid number or numeric string (0–100 range).
- Net Contents must include a numeric value and a unit.
- If "Resubmission After Rejection" is selected, the previous TTB ID field becomes required.
- Conditional fields appear/disappear dynamically based on Product Type and Source selections.

#### Step 2: Label Image Upload

- The user uploads one or more images of the label (front, back, and any supplemental labels).
- Accepted formats: JPEG, PNG, WebP, TIFF. Max file size: 10 MB per image.
- A preview of each uploaded image is displayed.
- A drag-and-drop zone plus a standard file picker button.
- At least one image is required to proceed.
- The user can add optional notes about the label (e.g., "Net contents is blown into glass, not on label").

#### Submission

- A **"Review & Submit"** summary screen shows all entered data and uploaded images for the user to confirm.
- On submit, the submission is created with status **"Pending"** and added to both the user's dashboard and the admin dashboard.
- Backend validation kicks off asynchronously (see Section 6).

### 4.4 Editing a Pending Submission

If a submission has status **"Pending"** and the backend validation has **not yet started or completed**, the user can edit the form fields and re-upload the label image.

**Race condition handling:**
- When the user opens a submission for editing, the backend checks the `validationInProgress` flag within a **Firestore transaction**.
- If validation is already running, the edit button is disabled and a message reads: *"This submission is currently being validated. Please wait for the results before editing."*
- If the user saves edits while a validation job is queued but not started, the queued job is cancelled (the Cloud Function checks `version` before processing — if it changed, it aborts) and a new validation cycle is triggered.
- An optimistic locking mechanism (`version` field incremented in a Firestore transaction) prevents stale writes. The transaction fails if another write occurred between read and write.

### 4.5 Resubmission After Needs Revision

If a submission is marked "Needs Revision" by an admin:
- The user sees admin feedback/notes on the detail view.
- The user clicks **"Revise & Resubmit"**, which opens the form pre-filled with existing data.
- They correct the flagged issues and re-upload the label if needed.
- On submit, the status resets to **"Pending"** and a new validation cycle begins.
- The submission history (original + revisions) is preserved as a version trail.

---

## 5. Admin Portal

### 5.1 Admin Dashboard

- **Summary stats**: total submissions across all users, approved, pending, needs attention.
- **Submissions table** with columns:
  - Submission ID
  - User / Company Name
  - Brand Name
  - Product Type
  - Date Submitted
  - Status (Pending, Approved, Needs Attention, Rejected)
- **Needs Attention tab**: filtered view showing only submissions that failed automated validation and require admin review.
- Sortable and filterable by status, product type, date, and user/company.

### 5.2 Admin Submission Detail View

Shows everything the user sees plus:
- **Full AI Validation Report** — the detailed GPT-4o analysis output including:
  - Per-field comparison results (form value vs. extracted label text).
  - Confidence scores or notes from the AI for each field.
  - Any OCR/extraction issues noted.
  - The raw extracted text from the label image.
- **Admin Actions**:
  - **Approve**: Sets status to "Approved" on both admin and user dashboards.
  - **Needs Revision**: Sets status to "Needs Revision" on the user dashboard. Admin must provide notes explaining the issues.
  - **Reject**: Sets status to "Rejected." Admin must provide a reason.
- **Admin Notes field**: free-text area for internal notes (visible only to admins) and revision feedback (visible to user when status = Needs Revision).

### 5.3 Status Flow

```
User Submits → [Pending]
                  │
                  ▼
          Backend AI Validation
                  │
         ┌────────┴────────┐
         ▼                 ▼
   All checks pass    One or more checks fail
         │                 │
         ▼                 ▼
   [Approved]        [Needs Attention] (admin dashboard)
   (auto-updated     Status remains [Pending] for user
    on both sides)         │
                           ▼
                    Admin Reviews
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
         [Approved]  [Needs Revision] [Rejected]
                           │
                           ▼
                    User Revises & Resubmits
                           │
                           ▼
                       [Pending] → (cycle repeats)
```

---

## 6. Backend AI Validation (GPT-4o)

### 6.1 Processing Pipeline

When a submission enters the queue:

1. **Image Pre-processing**: The uploaded label image(s) are sent to GPT-4o's vision capability.
2. **Data Extraction**: GPT-4o is prompted to extract all visible text and information from the label image, structured into categories (brand name, class/type, alcohol content, net contents, bottler/importer info, health warning, etc.).
3. **Field-by-Field Comparison**: Each extracted value is compared against the corresponding form field.
4. **Compliance Checks**: Additional checks are run for regulatory compliance beyond simple matching.
5. **Result Generation**: A structured validation report is produced.

### 6.2 Validation Checks

The following checks are performed, organized by priority:

#### Tier 1: Critical Checks (must all pass for auto-approval)

| Check | Description | Matching Logic |
|-------|-------------|----------------|
| Brand Name Match | Brand name on label matches form field | Case-insensitive comparison. Fuzzy match with ≥ 90% similarity threshold (Levenshtein/Jaro-Winkler). Flag if mismatch. |
| Class/Type Designation Match | Class/type on label matches form field | Case-insensitive. Allow common abbreviations and variations (e.g., "Bourbon Whiskey" vs "Kentucky Straight Bourbon Whiskey" flags a mismatch since the full designation matters). |
| Alcohol Content Match | ABV on label matches form field | Extract numeric value from both. Must match exactly as a number (e.g., form says "40" and label shows "40% Alc./Vol." → match). Tolerance: ±0.0 (exact numeric match). |
| Net Contents Match | Volume on label matches form field | Normalize units before comparison (e.g., "750 mL" = "750 ML" = "750ml"). Must match. If user noted net contents are blown into glass, skip this check. |
| Health Warning Statement Present | The government warning text appears on the label | Check that "GOVERNMENT WARNING" appears. Verify key phrases from the mandated text are present: "Surgeon General," "women should not drink," "pregnancy," "birth defects," "impairs your ability to drive," "operate machinery." |
| Name and Address Present | Bottler/importer name and address on label | Verify the label contains a name and address following an appropriate phrase like "Bottled By," "Produced By," "Imported By," etc. Compare against the form entry. |

#### Tier 2: Conditional Checks (based on product type and form data)

| Check | Applies To | Description |
|-------|-----------|-------------|
| Fanciful Name Match | All (if provided) | If a fanciful name was entered, verify it appears on the label. |
| Appellation of Origin | Wine | If entered on form, verify it appears on the brand label alongside the designation. |
| Grape Varietal Match | Wine | If entered on form, verify the varietal(s) appear on the label. |
| Vintage Date Match | Wine | If entered on form, verify the year appears on the label. |
| Sulfite Declaration | Wine, Spirits | If indicated on form, verify "Contains Sulfites" or equivalent appears on label. |
| Country of Origin | Imported products | Verify a country of origin statement is present on the label. |
| Age Statement | Spirits | If provided on form, verify it appears on the label. |
| State of Distillation | Spirits | If provided on form, verify it appears on the label. |
| Commodity Statement | Spirits | If provided on form, verify it appears on the label. |
| Coloring Materials Disclosure | Spirits | If indicated on form, verify declaration is on label. |
| FD&C Yellow #5 | All (if indicated) | If checked on form, verify disclosure appears on label. |
| Cochineal/Carmine | All (if indicated) | If checked on form, verify disclosure appears on label. |

#### Tier 3: Compliance Warnings (informational, do not block auto-approval)

| Check | Description |
|-------|-------------|
| Same Field of Vision | For spirits: brand name, alcohol content, and class/type should appear in the same field of vision. GPT-4o can assess whether these are visually on the same side of the container. |
| Health Warning Formatting | "GOVERNMENT WARNING" should appear in all caps and bold. "Surgeon" and "General" should be capitalized. Warning should be separate from other text. |
| Designation Consistency | No conflicting or inconsistent designations on the label (e.g., "vodka with natural flavors" vs. just "vodka"). |
| Standard of Fill | Verify net contents matches a TTB-approved standard of fill (e.g., 50 mL, 100 mL, 200 mL, 375 mL, 750 mL, 1 L, 1.75 L for spirits). |

### 6.3 GPT-4o Prompt Structure

The system sends the label image(s) plus the form data to GPT-4o with a structured prompt that:

1. Instructs the model to extract all visible text from the label image.
2. Provides the form data as a JSON object for comparison.
3. Asks for a structured JSON response with:
   - `extracted_text`: the full raw text found on the label.
   - `field_results`: an array of objects, each with `field_name`, `form_value`, `label_value`, `match_status` (MATCH / MISMATCH / NOT_FOUND / NOT_APPLICABLE), and `notes`.
   - `compliance_warnings`: an array of informational warnings.
   - `overall_pass`: boolean — true only if all Tier 1 and applicable Tier 2 checks pass.
   - `confidence`: a general confidence rating (HIGH / MEDIUM / LOW) reflecting image quality and extraction reliability.
4. If image quality is too low or unreadable, the model should return `confidence: LOW` with a note, and the system treats this as a failure requiring admin review.

### 6.4 Error Handling

| Scenario | System Behavior |
|----------|-----------------|
| GPT-4o returns low confidence | Status remains Pending; item flagged for admin review with note: "Image quality too low for reliable extraction." |
| GPT-4o API timeout or error | Retry up to 3 times with exponential backoff. If all retries fail, flag for admin with note: "Automated validation failed due to a processing error. Manual review required." |
| Image is corrupt or unsupported format | Return an immediate error to the user before submission completes. Do not enqueue for validation. |
| GPT-4o returns ambiguous results | Flag for admin review. Do not auto-approve if any field has uncertain extraction. |

### 6.5 Async Processing

- Validation runs as an async background job triggered by a **Firebase Cloud Function** (Firestore `onCreate` trigger on the `submissions` collection) or, alternatively, via a Next.js API route called immediately after submission that processes in the background.
- The user is not blocked after submission; they return to their dashboard where the submission shows as "Pending."
- When validation completes, the Cloud Function (or API route) writes results to the `validationResults` subcollection and updates the submission's `status` field:
  - If all checks pass → status auto-updates to **Approved**.
  - If any check fails → status remains **Pending** and a `needsAttention: true` flag is set so the admin dashboard can filter for it.
- The user's dashboard reflects status changes in real-time via Firestore's `onSnapshot` listener (no manual refresh needed).

---

## 7. Data Model (Firestore Collections)

The data layer uses **Cloud Firestore** (Firebase's NoSQL document database). Data is organized into top-level collections and subcollections. Firestore's document model naturally supports the nested/flexible fields needed for product-type-specific data without requiring migrations.

### 7.1 `users` Collection

Each document ID is the Firebase Auth UID.

```
users/{uid}
├── email: string (required)
├── fullName: string (required)
├── phoneNumber: string (required)
├── companyName: string (required)
├── companyAddress: string (required)
├── mailingAddress: string | null
├── permitRegistryNumber: string (required)
├── representativeId: string | null
├── role: "user" | "admin"
├── profileComplete: boolean
├── createdAt: Timestamp
└── updatedAt: Timestamp
```

**Notes:**
- Password management is handled entirely by Firebase Authentication — no password hashes are stored in Firestore.
- The `role` field is also mirrored as a Firebase Auth custom claim for use in Firestore Security Rules and server-side checks.
- `profileComplete` is false until the user fills in all required profile fields post-registration.

### 7.2 `submissions` Collection

```
submissions/{submissionId}
├── userId: string (FK → users/{uid})
├── serialNumber: string
├── productType: "wine" | "distilled_spirits" | "malt_beverage"
├── source: "domestic" | "imported"
├── brandName: string (required)
├── fancifulName: string | null
├── classTypeDesignation: string (required)
├── statementOfComposition: string | null
├── alcoholContent: string (required)
├── netContents: string (required)
├── nameAddressOnLabel: string (required)
├── applicationType: string[] (e.g., ["cola", "resubmission"])
├── resubmissionTtbId: string | null
├── formulaNumber: string | null
├── containerInfo: string | null
├── grapeVarietals: string | null           # wine only
├── appellationOfOrigin: string | null       # wine only
├── vintageDate: string | null               # wine only
├── countryOfOrigin: string | null           # imported only
├── ageStatement: string | null              # spirits only
├── stateOfDistillation: string | null       # spirits only
├── commodityStatement: string | null        # spirits only
├── coloringMaterials: string | null         # spirits only
├── fdncYellow5: boolean (default false)
├── cochinealCarmine: boolean (default false)
├── sulfiteDeclaration: boolean (default false)
├── healthWarningConfirmed: boolean (default true)
├── foreignWinePercentage: string | null     # wine only
├── applicantNotes: string | null
├── status: "pending" | "approved" | "needs_revision" | "rejected"
├── validationInProgress: boolean            # lock flag for race conditions
├── version: number                          # optimistic locking counter
├── createdAt: Timestamp
├── updatedAt: Timestamp
│
├── images/ (subcollection)
│   └── {imageId}
│       ├── imageType: "brand_front" | "back" | "other"
│       ├── storagePath: string              # Firebase Storage path
│       ├── downloadUrl: string              # Public or signed URL
│       ├── originalFilename: string
│       ├── mimeType: string
│       ├── fileSize: number (bytes)
│       └── createdAt: Timestamp
│
├── validationResults/ (subcollection)
│   └── {resultId}
│       ├── extractedText: string            # raw text from label
│       ├── fieldResults: array              # per-field comparison objects
│       │   └── [{ fieldName, formValue, labelValue, matchStatus, notes }]
│       ├── complianceWarnings: array        # warning objects
│       ├── overallPass: boolean
│       ├── confidence: "high" | "medium" | "low"
│       ├── rawAiResponse: map               # full GPT-4o response
│       ├── processedAt: Timestamp
│       └── createdAt: Timestamp
│
├── reviews/ (subcollection)
│   └── {reviewId}
│       ├── adminId: string (FK → users/{uid})
│       ├── action: "approved" | "needs_revision" | "rejected"
│       ├── feedbackToUser: string | null    # visible to user
│       ├── internalNotes: string | null     # admin-only
│       └── createdAt: Timestamp
│
└── history/ (subcollection)
    └── {historyId}
        ├── version: number
        ├── changes: map                     # snapshot of changed fields
        ├── changedBy: string (FK → users/{uid})
        └── createdAt: Timestamp
```

**Notes:**
- Subcollections (`images`, `validationResults`, `reviews`, `history`) keep related data co-located with each submission while avoiding bloated documents.
- `validationInProgress` + `version` together handle race conditions: the backend checks `validationInProgress` before starting a job, and uses Firestore transactions with the `version` field for optimistic locking on edits.
- Firestore Security Rules enforce that users can only read/write their own submissions, while admins can read/write all submissions.

### 7.3 Firestore Security Rules (Summary)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Users: read/write own profile; admins read all
    match /users/{uid} {
      allow read, write: if request.auth.uid == uid;
      allow read: if request.auth.token.role == 'admin';
    }

    // Submissions: users see own; admins see all
    match /submissions/{submissionId} {
      allow read: if request.auth.uid == resource.data.userId
                  || request.auth.token.role == 'admin';
      allow create: if request.auth.uid == request.resource.data.userId;
      allow update: if request.auth.uid == resource.data.userId
                    && resource.data.status == 'pending'
                    && resource.data.validationInProgress == false;
      allow update: if request.auth.token.role == 'admin';

      // Subcollections inherit parent access patterns
      match /{subcollection}/{docId} {
        allow read: if request.auth.uid == get(/databases/$(database)/documents/submissions/$(submissionId)).data.userId
                    || request.auth.token.role == 'admin';
        allow write: if request.auth.token.role == 'admin'
                     || request.auth.uid == get(/databases/$(database)/documents/submissions/$(submissionId)).data.userId;
      }
    }
  }
}
```

### 7.4 Firestore Indexes

The following composite indexes are needed for dashboard queries:

| Collection | Fields | Purpose |
|-----------|--------|---------|
| `submissions` | `userId` ASC, `createdAt` DESC | User dashboard: list own submissions sorted by date |
| `submissions` | `userId` ASC, `status` ASC, `createdAt` DESC | User dashboard: filter by status |
| `submissions` | `status` ASC, `createdAt` DESC | Admin dashboard: filter all submissions by status |
| `submissions` | `productType` ASC, `createdAt` DESC | Admin dashboard: filter by product type |

---

## 8. API Endpoints

### 8.1 Authentication (Firebase Client SDK — no custom API endpoints needed)

| Firebase Method | Description |
|----------------|-------------|
| `createUserWithEmailAndPassword` | Create a new user account |
| `signInWithEmailAndPassword` | Authenticate and receive an ID token |
| `signOut` | Sign out and clear the session |
| `sendPasswordResetEmail` | Send password reset email |
| `confirmPasswordReset` | Reset password with code from email |

Authentication is handled entirely by the Firebase Client SDK. No custom backend endpoints are needed for auth. The Firebase ID token is passed as a `Bearer` token in the `Authorization` header for all subsequent API calls. Server-side middleware verifies the token using the Firebase Admin SDK.

### 8.2 User Profile

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/profile` | Get current user's profile |
| PUT | `/api/profile` | Update profile fields |

### 8.3 Submissions (User)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/submissions` | List all submissions for the authenticated user (paginated, filterable) |
| GET | `/api/submissions/:id` | Get submission detail including validation results |
| POST | `/api/submissions` | Create a new submission (form data + images via multipart) |
| PUT | `/api/submissions/:id` | Edit a pending submission (checks lock/validation state) |
| POST | `/api/submissions/:id/resubmit` | Resubmit after "Needs Revision" status |
| GET | `/api/submissions/:id/images/:imageId` | Retrieve a specific uploaded image |

### 8.4 Admin

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/submissions` | List all submissions across all users (paginated, filterable) |
| GET | `/api/admin/submissions/:id` | Get full submission detail with AI report |
| POST | `/api/admin/submissions/:id/review` | Submit an admin review action (approve/needs_revision/reject) with notes |
| GET | `/api/admin/stats` | Dashboard summary statistics |

---

## 9. User Interface Pages

### 9.1 Public Pages
- **Login Page**: Email and password fields, link to registration, forgot password link.
- **Registration Page**: Email, password, confirm password. After registration, redirect to profile setup.
- **Password Reset Page**: Enter new password with token from email.

### 9.2 User Pages
- **Profile Setup / Edit**: Form with all profile fields from Section 3.2.
- **Dashboard**: Submission summary stats + submissions table + new submission button.
- **New Submission — Step 1 (Form)**: Dynamic form based on Product Type selection. Clear field labels, helper text for complex fields, inline validation.
- **New Submission — Step 2 (Image Upload)**: Drag-and-drop zone, image previews, notes field.
- **New Submission — Review & Submit**: Read-only summary of all data and images with a Submit button.
- **Submission Detail**: Full form data, label images, validation results checklist, admin feedback (if any), edit/resubmit buttons (when applicable).

### 9.3 Admin Pages
- **Admin Dashboard**: Stats cards + tabbed table (All Submissions / Needs Attention).
- **Admin Submission Detail**: Everything from user detail view + full AI validation report + raw extracted text + admin action buttons (Approve / Needs Revision / Reject) + notes fields.

---

## 10. Non-Functional Requirements

### 10.1 Performance
- Image uploads should complete in under 10 seconds for files ≤ 10 MB.
- GPT-4o validation should complete within 30–60 seconds per submission.
- Dashboard pages should load in under 2 seconds.

### 10.2 Security
- Password management handled entirely by Firebase Authentication (hashing, salting, and storage are managed by Google's infrastructure).
- All API endpoints require a valid Firebase Auth ID token except public routes (login, register, reset password).
- Admin endpoints enforce role-based access via Firebase custom claims (`role: "admin"`) checked in both Firestore Security Rules and server-side middleware.
- Image uploads validated for file type and size on both client and server. Firebase Storage Security Rules restrict uploads to authenticated users and enforce max file size.
- No API keys exposed in client-side code; all GPT-4o calls made server-side via Next.js API routes or Cloud Functions using the Firebase Admin SDK for auth verification.
- HTTPS enforced in production (both Vercel and Firebase default to HTTPS).

### 10.3 Scalability
- Image files stored in **Firebase Cloud Storage** with security rules tied to user authentication. Storage paths follow the pattern `submissions/{submissionId}/images/{imageId}`.
- Validation jobs processed asynchronously via Cloud Functions or background API routes to avoid blocking the web server.
- Firestore queries use pagination via `startAfter` cursors for all list endpoints. Composite indexes ensure efficient filtering and sorting.

### 10.4 Reliability
- GPT-4o API calls retried up to 3 times with exponential backoff on failure.
- **Firestore transactions** used for submission creation, status updates, and edit-save operations to prevent race conditions.
- Optimistic locking via the `version` field prevents lost updates during concurrent edits — the transaction checks that the document's `version` matches the expected value before writing.

---

## 11. Technical Stack (Recommended)

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Frontend | React (Next.js) | Component-based, SSR support, excellent Firebase SDK integration |
| Styling | Tailwind CSS | Rapid UI development, clean defaults |
| Backend | Next.js API Routes + Firebase Admin SDK | Keeps everything in one codebase; API routes handle GPT-4o calls server-side |
| Database | **Cloud Firestore (Firebase)** | Free Spark plan: 1 GiB storage, 50K reads/20K writes/20K deletes per day. NoSQL document model maps naturally to flexible submission data. No migrations needed. |
| Authentication | **Firebase Authentication** | Free tier: unlimited email/password users. Handles registration, login, password reset, session management. Custom claims for admin role. |
| File Storage | **Firebase Cloud Storage** | Free Spark plan: 5 GB storage, 1 GB/day download. Stores label images with security rules tied to auth. |
| Task Queue | **Cloud Functions for Firebase** (or a simple polling worker) | Free Spark plan: 125K invocations/month. Firestore `onCreate` trigger kicks off GPT-4o validation automatically when a submission is created. For local dev or if exceeding free tier, a simple setInterval polling worker on the backend is an alternative. |
| AI/Vision | OpenAI GPT-4o API (vision) | Multi-modal — handles both text extraction and image understanding in one call |
| Deployment | **Vercel** (frontend + API routes) + **Firebase** (Firestore, Auth, Storage, Functions) | Vercel free tier for the Next.js app; Firebase Spark plan for all backend services. Both have generous free tiers. |

### 11.1 Firebase Spark Plan Limits (Free Tier)

| Service | Free Limit | Notes |
|---------|-----------|-------|
| Firestore | 1 GiB stored, 50K reads/day, 20K writes/day, 20K deletes/day | More than sufficient for a demo/evaluation app |
| Authentication | Unlimited email/password users | No cost for auth |
| Cloud Storage | 5 GB stored, 1 GB/day download, 20K uploads/day | Easily handles label images |
| Cloud Functions | 125K invocations/month, 40K GB-seconds/month | Enough for async validation triggers |

### 11.2 Environment Variables

```
# Firebase (client-side — safe to expose)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Firebase Admin (server-side only — never expose)
FIREBASE_ADMIN_PROJECT_ID=
FIREBASE_ADMIN_CLIENT_EMAIL=
FIREBASE_ADMIN_PRIVATE_KEY=

# OpenAI (server-side only)
OPENAI_API_KEY=
```

---

## 12. Deployment & Deliverables

- The app must be deployed to a live URL accessible via browser.
- A GitHub repository containing all source code with a clear README covering:
  - How to run the app locally (setup steps, install commands, environment variables).
  - Which AI tools/libraries are used and why.
  - Key assumptions and decisions made.
  - Known limitations.
- Environment variables documented (see Section 11.2: Firebase client config, Firebase Admin credentials, and `OPENAI_API_KEY`).
- Sample test evidence (screenshots or short video of the app handling match, mismatch, and error cases).

---

## 13. Future Enhancements (Out of Scope for MVP)

- **Image highlighting**: Draw bounding boxes on the label image showing where each piece of information was detected.
- **OCR confidence visualization**: Show heat maps or highlights of low-confidence text regions.
- **Email notifications**: Notify users when their submission status changes.
- **Batch submissions**: Allow uploading multiple products at once via CSV + image zip.
- **Full TTB Form 5100.31 PDF generation**: Auto-generate a filled PDF of the official form from submitted data.
- **Audit trail**: Comprehensive activity logging for compliance purposes.
- **Multi-tenant support**: Support multiple companies with separate admin hierarchies.
- **Fuzzy matching configuration**: Allow admins to tune matching thresholds per field.
- **Integration with TTB COLAs Online**: Submit approved applications directly to TTB's system.
