# Workflow Examples: AI-Powered Alcohol Label Verification App

**Companion to:** prd.md
**Date:** February 1, 2026

---

## Table of Contents

1. [User Workflows](#1-user-workflows)
   - 1.1 Registration & Profile Setup
   - 1.2 First-Time Submission — Happy Path (Auto-Approved)
   - 1.3 Submission with Mismatches — Flagged for Admin
   - 1.4 Editing a Pending Submission
   - 1.5 Editing Blocked by In-Progress Validation
   - 1.6 Revising After Admin Feedback
   - 1.7 Resubmission After Rejection
   - 1.8 Submitting an Imported Product
   - 1.9 Submitting a Wine Label
   - 1.10 Low-Quality Image Upload
2. [Admin Workflows](#2-admin-workflows)
   - 2.1 Reviewing a Flagged Submission — Approve After Review
   - 2.2 Sending a Submission Back for Revision
   - 2.3 Rejecting a Submission
   - 2.4 Handling a Low-Confidence AI Result
   - 2.5 Monitoring the Dashboard & Filtering
   - 2.6 Admin Reviews a Resubmission

---

## 1. User Workflows

---

### 1.1 Registration & Profile Setup

**Actor:** Maria Lopez, compliance manager at Sunset Spirits LLC
**Goal:** Create an account and set up her company profile so she can begin submitting labels.

**Steps:**

| Step | User Action | System Response |
|------|-------------|-----------------|
| 1 | Maria navigates to the app URL and clicks **"Sign Up."** | The registration page loads with fields for Email, Password, and Confirm Password. |
| 2 | She enters `maria@sunsetspirits.com`, creates a password, and clicks **"Create Account."** | Firebase Authentication creates the account. The app redirects Maria to the **Profile Setup** page. A toast notification reads: *"Account created! Please complete your profile to continue."* |
| 3 | She fills in her profile: | The form validates inline as she types. |
| | — Full Name: `Maria Lopez` | |
| | — Phone Number: `(555) 321-7890` | |
| | — Company Name: `Sunset Spirits LLC` | |
| | — Company Address: `400 Oak Ave, Napa, CA 94559` | |
| | — Permit/Registry Number: `CA-I-2847` | |
| 4 | She leaves Mailing Address and Representative ID blank (optional) and clicks **"Save Profile."** | Firestore creates/updates the user document. The `profileComplete` flag is set to `true`. Maria is redirected to her **Dashboard**, which is empty. A welcome message reads: *"Welcome, Maria! You have no submissions yet. Click 'New Submission' to get started."* |

**Result:** Maria's account is active with a complete profile. She can now submit labels.

---

### 1.2 First-Time Submission — Happy Path (Auto-Approved)

**Actor:** Maria Lopez
**Scenario:** Maria submits a domestic bourbon whiskey label where all information matches perfectly.

**Steps:**

| Step | User Action | System Response |
|------|-------------|-----------------|
| 1 | From her dashboard, Maria clicks **"New Submission."** | The app navigates to **Step 1: Application Form**. The Type of Product dropdown is focused. |
| 2 | She selects **"Distilled Spirits"** from the Type of Product dropdown. | The form shows all fields for the submission (same fields for all product types). |
| 3 | She fills in the form: | Inline validation confirms each field as she moves through. The Alcohol Content field strips the `%` sign and validates it as a number between 0–100. |
| | — Source of Product: `Domestic` | |
| | — Brand Name: `Old Tom Distillery` | |
| | — Class/Type Designation: `Kentucky Straight Bourbon Whiskey` | |
| | — Alcohol Content: `45` | |
| | — Net Contents: `750 mL` | |
| | — Name and Address: `Bottled By Old Tom Distillery, Louisville, KY 40202` | |
| | — Health Warning Included: ☑ (checked by default) | |
| 4 | She clicks **"Next: Upload Label."** | Form validation passes. The app navigates to **Step 2: Image Upload**. |
| 5 | She drags a high-resolution JPEG of the bourbon label into the upload zone. | The image uploads to Firebase Storage. A thumbnail preview appears showing the label with "OLD TOM DISTILLERY" clearly visible, along with "Kentucky Straight Bourbon Whiskey," "45% Alc./Vol. (90 Proof)," "750 mL," the bottler's address, and the government warning statement. File size and format are displayed: `bourbon_label_front.jpg — 2.3 MB — JPEG`. |
| 6 | She clicks **"Next: Review."** | The **Review & Submit** screen shows a two-column layout: all form data on the left, the label image thumbnail on the right. |
| 7 | Maria reviews everything and clicks **"Submit."** | A confirmation modal appears: *"Submit this label for verification? You can still edit while the status is Pending."* She clicks **"Confirm."** |
| 8 | — | The submission is written to Firestore with `status: "pending"`. Maria is redirected to her **Dashboard**. The new submission appears in the table: |
| | | `SUB-0001 | Old Tom Distillery | Distilled Spirits | Feb 1, 2026 | ⏳ Pending` |
| 9 | — (30 seconds later) | The Firebase Cloud Function triggers, sends the image to GPT-4o, and receives the validation results. GPT-4o extracts all text and compares it field-by-field. All Tier 1 and Tier 2 checks pass. The Cloud Function writes results to the `validationResults` subcollection and updates `status: "approved"`. |
| 10 | Maria's dashboard updates in real-time (Firestore `onSnapshot`). | The row changes to: `SUB-0001 | Old Tom Distillery | Distilled Spirits | Feb 1, 2026 | ✅ Approved` |
| 11 | Maria clicks the row to view the detail. | The **Submission Detail** page shows all form data, the label image, and the **Validation Results Panel** with a green checklist: |
| | | ✅ Brand Name — Match ("OLD TOM DISTILLERY" found on label) |
| | | ✅ Class/Type — Match ("Kentucky Straight Bourbon Whiskey" found) |
| | | ✅ Alcohol Content — Match (45% extracted, matches form) |
| | | ✅ Net Contents — Match ("750 mL" found) |
| | | ✅ Health Warning — Present (full government warning text detected) |
| | | ✅ Name & Address — Match ("Bottled By Old Tom Distillery, Louisville, KY" found) |

**Result:** The label is auto-approved. No admin intervention required. Maria can proceed with confidence that her label meets requirements.

---

### 1.3 Submission with Mismatches — Flagged for Admin

**Actor:** Maria Lopez
**Scenario:** Maria submits a vodka label, but the brand name on the label differs from the form and the alcohol content doesn't match.

**Steps:**

| Step | User Action | System Response |
|------|-------------|-----------------|
| 1 | Maria clicks **"New Submission"** and fills in the form: | |
| | — Type of Product: `Distilled Spirits` | |
| | — Source: `Domestic` | |
| | — Brand Name: `Sunset Reserve Vodka` | |
| | — Class/Type: `Vodka` | |
| | — Alcohol Content: `40` | |
| | — Net Contents: `750 mL` | |
| | — Name and Address: `Sunset Spirits LLC, Napa, CA 94559` | |
| | — Health Warning: ☑ | |
| 2 | She uploads a label image that actually reads "Sunset Premium Vodka" and shows "42% Alc./Vol." | Preview displays. Maria doesn't notice the discrepancies. |
| 3 | She reviews and submits. | Submission created as `SUB-0002 | ⏳ Pending`. |
| 4 | — (backend validation runs) | GPT-4o detects two mismatches: brand name ("Sunset Premium Vodka" ≠ "Sunset Reserve Vodka") and alcohol content (42% ≠ 40%). The `overallPass` is `false`. The Cloud Function sets `needsAttention: true` and leaves `status: "pending"`. |
| 5 | Maria checks her dashboard. | The submission still shows as `⏳ Pending`. She can click into it to see partial results. |
| 6 | She opens the submission detail. | The **Validation Results Panel** shows: |
| | | ⏳ Pending Admin Review |
| | | ❌ Brand Name — Mismatch (Form: "Sunset Reserve Vodka" → Label: "Sunset Premium Vodka") |
| | | ❌ Alcohol Content — Mismatch (Form: 40% → Label: 42%) |
| | | ✅ Class/Type — Match ("Vodka" found) |
| | | ✅ Net Contents — Match ("750 mL" found) |
| | | ✅ Health Warning — Present |
| | | ✅ Name & Address — Match |
| | | A notice reads: *"This submission is under review. An admin will evaluate the flagged items."* |

**Result:** The submission remains pending for the user. The admin sees it in their "Needs Attention" queue (see Admin Workflow 2.1).

---

### 1.4 Editing a Pending Submission

**Actor:** Maria Lopez
**Scenario:** Immediately after submitting, Maria realizes she entered the wrong brand name. She edits before validation starts.

**Steps:**

| Step | User Action | System Response |
|------|-------------|-----------------|
| 1 | Maria clicks into `SUB-0003` from her dashboard (status: `⏳ Pending`). | The detail view loads. Since `validationInProgress` is `false`, the **"Edit Submission"** button is enabled. |
| 2 | She clicks **"Edit Submission."** | The app opens the form in edit mode, pre-filled with all existing data. A notice reads: *"You are editing a pending submission. Saving will reset the validation queue."* |
| 3 | She changes Brand Name from `Old Tom` to `Old Tom Reserve` and clicks **"Save Changes."** | A Firestore transaction runs: it checks that `validationInProgress` is still `false`, increments `version`, updates the brand name, and writes the change to the `history` subcollection. If the validation Cloud Function was queued, it will see the version mismatch and abort on its next check. A new validation cycle is triggered. |
| 4 | She's returned to the detail view. | A toast reads: *"Submission updated. Validation has been restarted."* The status remains `⏳ Pending`. |

**Result:** The submission is updated and re-queued for validation with the corrected data.

---

### 1.5 Editing Blocked by In-Progress Validation

**Actor:** Maria Lopez
**Scenario:** Maria tries to edit a submission, but the AI validation is already running.

**Steps:**

| Step | User Action | System Response |
|------|-------------|-----------------|
| 1 | Maria clicks into `SUB-0003` from her dashboard. | The detail view loads. The `validationInProgress` flag is `true` (the Cloud Function is currently processing). |
| 2 | She sees the **"Edit Submission"** button is grayed out. | A message reads: *"This submission is currently being validated. Please wait for the results before editing."* A subtle pulsing animation or spinner indicates processing is active. |
| 3 | She waits about 30 seconds and the page updates via the real-time listener. | The validation completes. If it passed, the status changes to `✅ Approved` and editing is no longer relevant. If it was flagged, the status remains `⏳ Pending` but `validationInProgress` flips to `false`, and the **"Edit Submission"** button becomes active again. |

**Result:** The system prevents race conditions between user edits and in-progress validation.

---

### 1.6 Revising After Admin Feedback

**Actor:** Maria Lopez
**Scenario:** The admin reviewed Maria's vodka submission (SUB-0002 from Workflow 1.3) and sent it back with feedback.

**Precondition:** Admin has set the status to "Needs Revision" with notes (see Admin Workflow 2.2).

**Steps:**

| Step | User Action | System Response |
|------|-------------|-----------------|
| 1 | Maria's dashboard now shows: | `SUB-0002 | Sunset Reserve Vodka | Distilled Spirits | Feb 1, 2026 | 🔄 Needs Revision` |
| 2 | She clicks into the submission. | The detail view loads with a prominent **Admin Feedback** banner at the top (yellow/amber): |
| | | *"Reviewer Notes: The brand name on your label reads 'Sunset Premium Vodka' but your form says 'Sunset Reserve Vodka.' Also, the label shows 42% ABV but the form says 40%. Please correct your form entries to match the actual label, or upload a corrected label image."* |
| | | Below, the validation results show the same mismatches from Workflow 1.3. |
| 3 | Maria clicks **"Revise & Resubmit."** | The form opens in edit mode, pre-filled with all current data. The mismatched fields (Brand Name, Alcohol Content) are highlighted with a subtle red border. |
| 4 | She updates Brand Name to `Sunset Premium Vodka` and Alcohol Content to `42`. | Inline validation clears the error highlights as she fixes each field. |
| 5 | She reviews the updated data and clicks **"Resubmit."** | A Firestore transaction increments the `version`, resets `status` to `"pending"`, clears `needsAttention`, logs the changes to the `history` subcollection, and triggers a new validation cycle. |
| 6 | She's returned to her dashboard. | `SUB-0002 | Sunset Premium Vodka | Distilled Spirits | Feb 1, 2026 | ⏳ Pending` |
| 7 | — (validation runs, this time everything matches) | Status auto-updates to `✅ Approved`. |

**Result:** Maria corrects the issues flagged by the admin. The revised submission passes validation automatically.

---

### 1.7 Resubmission After Rejection

**Actor:** Maria Lopez
**Scenario:** An admin rejected one of Maria's submissions outright (e.g., the label image was for a completely different product). Maria wants to submit a new application for the same product.

**Precondition:** `SUB-0005` has status `❌ Rejected`.

**Steps:**

| Step | User Action | System Response |
|------|-------------|-----------------|
| 1 | Maria clicks into `SUB-0005` on her dashboard. | The detail view loads. A red banner shows: *"This submission was rejected. Reason: 'The uploaded label image is for a different product (wine label uploaded for a spirits submission). Please submit a new application with the correct label.'"* |
| | | The **"Edit Submission"** button is not available (rejected submissions cannot be edited). |
| 2 | Maria clicks **"Duplicate & Edit."** | A new submission form opens, pre-filled with all the data from the rejected submission. |
| 3 | She keeps the form data the same but uploads the correct label image this time. | The new image preview shows the correct spirits label. |
| 4 | She reviews and submits. | A new submission `SUB-0006` is created with `status: "pending"`. The form includes a reference to the original rejected submission. |

**Result:** Maria creates a fresh submission linked to the original rejection, with corrected image and preserved form data.

---

### 1.8 Submitting an Imported Product

**Actor:** James Park, import coordinator at Pacific Imports Inc.
**Scenario:** James submits a label for an imported French vodka (similar to the Grey Goose OMB example).

**Steps:**

| Step | User Action | System Response |
|------|-------------|-----------------|
| 1 | James clicks **"New Submission"** and selects: | |
| | — Type of Product: `Distilled Spirits` | |
| | — Source of Product: `Imported` | The **Country of Origin** field appears as a required field. |
| 2 | He fills in the form: | |
| | — Brand Name: `Grey Goose` | |
| | — Class/Type: `Vodka - Other Flavored` | |
| | — Alcohol Content: `40` | |
| | — Net Contents: `750 mL` | |
| | — Country of Origin: `France` | |
| | — Name and Address: `Imported By Grey Goose Importing Company, Coral Gables, FL 33134` | |
| 3 | He uploads front and back label images. | Two image previews appear, each tagged as "Brand (front)" and "Back." |
| 4 | He reviews and submits. | Submission created. Validation begins. |
| 5 | — (validation runs) | GPT-4o checks all standard fields plus the Country of Origin statement on the label (checks for "Product of France" or equivalent). All pass. |
| 6 | Dashboard updates. | `SUB-0010 | Grey Goose | Distilled Spirits | Feb 1, 2026 | ✅ Approved` |

**Result:** The imported product submission includes country of origin verification, handled automatically.

---

### 1.9 Submitting a Wine Label

**Actor:** Elena Ruiz, winemaker at Valle Verde Winery
**Scenario:** Elena submits a domestic Chardonnay label using the standard submission form.

**Steps:**

| Step | User Action | System Response |
|------|-------------|-----------------|
| 1 | Elena selects **"Wine"** as the product type. | The form shows all fields for the submission (same fields for all product types). |
| 2 | She fills in the form: | |
| | — Source: `Domestic` | |
| | — Brand Name: `Valle Verde` | |
| | — Class/Type Designation: `Chardonnay` | |
| | — Alcohol Content: `13.5` | |
| | — Net Contents: `750 mL` | |
| | — Name and Address: `Produced & Bottled By Valle Verde Winery, Napa, CA 94558` | |
| | — Health Warning: ☑ | |
| 3 | She uploads the label and submits. | Submission created as pending. |
| 4 | — (validation runs) | GPT-4o performs all standard Tier 1 checks: |
| | | ✅ Brand Name — Match ("Valle Verde" found on label) |
| | | ✅ Class/Type — Match ("Chardonnay" found) |
| | | ✅ Alcohol Content — Match (13.5% extracted, matches form) |
| | | ✅ Net Contents — Match ("750 mL" found) |
| | | ✅ Health Warning — Present |
| | | ✅ Name & Address — Match |
| | | All checks pass -- auto-approved. |

**Result:** The wine label is validated using the standard field checks and auto-approved.

---

### 1.10 Low-Quality Image Upload

**Actor:** Maria Lopez
**Scenario:** Maria submits a blurry photo of a label taken with a phone in bad lighting.

**Steps:**

| Step | User Action | System Response |
|------|-------------|-----------------|
| 1 | Maria fills out the form and uploads a blurry, low-resolution JPEG (320×240, poorly lit). | The upload succeeds (the file is a valid JPEG under the size limit). A preview shows the blurry image. |
| 2 | She submits. | Submission created as `⏳ Pending`. |
| 3 | — (validation runs) | GPT-4o attempts extraction but returns `confidence: "low"` with a note: *"Image quality is insufficient for reliable text extraction. Several fields could not be confidently identified."* The Cloud Function sets `needsAttention: true` and leaves `status: "pending"`. |
| 4 | Maria checks the submission detail. | The Validation Results Panel shows: |
| | | ⚠️ Low Confidence — Image quality too low for reliable extraction |
| | | ❓ Brand Name — Unable to extract (low image quality) |
| | | ❓ Class/Type — Unable to extract |
| | | ❓ Alcohol Content — Unable to extract |
| | | ❓ Net Contents — Unable to extract |
| | | ❓ Health Warning — Unable to extract |
| | | A notice reads: *"The uploaded image was too low quality for automated verification. An admin will review, or you can edit the submission to upload a clearer image."* |
| 5 | Maria clicks **"Edit Submission"**, uploads a higher-quality image, and saves. | The validation cycle restarts with the new image. This time GPT-4o returns `confidence: "high"` and all checks pass. Auto-approved. |

**Result:** The system gracefully handles unreadable images, informs the user, and allows them to correct the issue without starting over.

---

## 2. Admin Workflows

---

### 2.1 Reviewing a Flagged Submission — Approve After Review

**Actor:** David Chen, TTB admin reviewer
**Scenario:** Maria's vodka submission (SUB-0002) was flagged because the AI detected brand name and ABV mismatches. David reviews and determines the form had typos but the label itself is compliant — so he approves it after confirming the label is correct.

**Steps:**

| Step | Admin Action | System Response |
|------|-------------|-----------------|
| 1 | David logs in and lands on the **Admin Dashboard**. | The dashboard shows summary stats: `12 Total | 8 Approved | 3 Pending | 1 Needs Attention`. The **"Needs Attention"** tab badge shows `1`. |
| 2 | He clicks the **"Needs Attention"** tab. | The table filters to show one row: |
| | | `SUB-0002 | Sunset Spirits LLC / Maria Lopez | Sunset Reserve Vodka | Distilled Spirits | Feb 1, 2026 | ⚠️ Needs Attention` |
| 3 | He clicks the row. | The **Admin Submission Detail** page loads, showing: |
| | | **Form Data** (left column): Brand Name = "Sunset Reserve Vodka", ABV = 40%, etc. |
| | | **Label Image** (right column): clearly shows "Sunset Premium Vodka" and "42% Alc./Vol." |
| | | **AI Validation Report** (below): |
| | | ❌ Brand Name — Mismatch (Form: "Sunset Reserve Vodka" → Label: "Sunset Premium Vodka", similarity: 78%) |
| | | ❌ Alcohol Content — Mismatch (Form: 40% → Label: 42%) |
| | | ✅ Class/Type — Match |
| | | ✅ Net Contents — Match |
| | | ✅ Health Warning — Present |
| | | ✅ Name & Address — Match |
| | | **Raw Extracted Text**: "SUNSET PREMIUM VODKA ... 42% Alc./Vol. ... 750 mL ... GOVERNMENT WARNING: (1) According to the Surgeon General..." |
| | | **AI Confidence**: HIGH |
| 4 | David examines the label image closely. The label itself is well-designed and compliant — brand name, class/type, ABV, net contents, warning, and address are all present and correctly formatted. The issue is that the form data doesn't match the label, not that the label is non-compliant. | |
| 5 | David decides the label is compliant but the form needs correction. He clicks **"Needs Revision."** | A modal appears with two text areas: *"Feedback to User"* (required) and *"Internal Notes"* (optional). |
| 6 | Wait — David reconsiders. In this scenario, let's say he determines the label IS correct and he wants to approve it. He closes the modal and instead clicks **"Approve."** | A confirmation modal: *"Approve this submission? The label will be marked as approved for the user."* He confirms. |
| 7 | — | The Firestore transaction updates `status: "approved"`, writes a review document to the `reviews` subcollection (`action: "approved"`, `adminId: David's UID`), and clears the `needsAttention` flag. |
| 8 | The dashboard updates: the "Needs Attention" count drops to 0. | David is returned to the admin dashboard. The row now shows `✅ Approved`. |

**Result:** The admin manually approves a submission that the AI flagged, overriding the automated check. Maria sees `✅ Approved` on her dashboard.

---

### 2.2 Sending a Submission Back for Revision

**Actor:** David Chen
**Scenario:** A different submission (SUB-0008) was flagged because the brand name on the label reads "Mountain Creek Brewing" while the form says "Mountain Creek Brew Co." The label is also missing the government health warning.

**Steps:**

| Step | Admin Action | System Response |
|------|-------------|-----------------|
| 1 | David opens SUB-0008 from the "Needs Attention" tab. | The detail page shows: |
| | | ❌ Brand Name — Mismatch (Form: "Mountain Creek Brew Co." → Label: "Mountain Creek Brewing", similarity: 82%) |
| | | ✅ Class/Type — Match ("India Pale Ale" found) |
| | | ✅ Alcohol Content — Match (6.5%) |
| | | ✅ Net Contents — Match ("12 fl oz") |
| | | ❌ Health Warning — NOT FOUND (no government warning text detected on label) |
| | | ✅ Name & Address — Match |
| 2 | David reviews the label image and confirms: the warning text is genuinely absent from the label. The brand name discrepancy could be a typo or might indicate the label artwork doesn't match what the company intends to register. | |
| 3 | He clicks **"Needs Revision."** | The feedback modal appears. |
| 4 | He types in the **Feedback to User** field: | *"Two issues require correction before this submission can be approved:* |
| | | *1. Brand Name: Your form lists 'Mountain Creek Brew Co.' but the label reads 'Mountain Creek Brewing.' Please update the form to match the label exactly, or provide a corrected label.* |
| | | *2. Health Warning: The mandatory government health warning statement (27 CFR Part 16) was not found on the label. All alcoholic beverages ≥ 0.5% ABV must include the exact prescribed warning text. Please update your label to include the full warning.* |
| | | *Once corrected, click 'Revise & Resubmit' on your submission."* |
| 5 | He adds an **Internal Note**: *"Likely a design oversight on the health warning. Brand name is probably just a form typo. Should be straightforward to resolve."* | |
| 6 | He clicks **"Send for Revision."** | The Firestore transaction sets `status: "needs_revision"`, writes the review document with feedback and internal notes, and clears `needsAttention`. |
| 7 | The admin dashboard updates. SUB-0008 moves out of "Needs Attention" and shows `🔄 Needs Revision`. | The user (Mountain Creek Brewing) sees the status change and admin feedback on their dashboard (see User Workflow 1.6 for the user's side of this flow). |

**Result:** The admin provides actionable, specific feedback. The user can now revise and resubmit.

---

### 2.3 Rejecting a Submission

**Actor:** David Chen
**Scenario:** A submission (SUB-0012) has a label image that is for an entirely different product than what was described in the form. The form describes a gin, but the uploaded image is a tequila label from a different brand entirely.

**Steps:**

| Step | Admin Action | System Response |
|------|-------------|-----------------|
| 1 | David opens SUB-0012 from the "Needs Attention" tab. | The AI report shows multiple critical mismatches: brand name, class/type, alcohol content, and name/address all fail. The extracted text indicates a "Casa del Sol Tequila" label while the form describes "Emerald Botanical Gin." |
| 2 | David reviews the image alongside the form. It's clear the wrong label image was uploaded — this isn't a fixable mismatch, it's a fundamentally incorrect submission. | |
| 3 | He clicks **"Reject."** | A modal appears: *"Reject this submission? This action is permanent for this submission. The user will need to create a new submission."* Fields: **Reason for Rejection** (required), **Internal Notes** (optional). |
| 4 | He enters the rejection reason: *"The uploaded label image (Casa del Sol Tequila) does not correspond to the product described in the form (Emerald Botanical Gin). This appears to be an incorrect file upload. Please create a new submission with the correct label image for your gin product."* | |
| 5 | He clicks **"Confirm Rejection."** | The transaction sets `status: "rejected"`, writes the review document, and clears `needsAttention`. |
| 6 | The admin dashboard shows SUB-0012 as `❌ Rejected`. | The user sees the rejection with the reason on their dashboard and can use "Duplicate & Edit" to start a new corrected submission (see User Workflow 1.7). |

**Result:** The submission is permanently rejected with a clear explanation. The user is guided to create a new submission rather than revise.

---

### 2.4 Handling a Low-Confidence AI Result

**Actor:** David Chen
**Scenario:** A submission (SUB-0015) was flagged because GPT-4o returned `confidence: "low"` — the label image was partially obscured but the AI could still read some fields.

**Steps:**

| Step | Admin Action | System Response |
|------|-------------|-----------------|
| 1 | David opens SUB-0015 from "Needs Attention." | The detail page shows: |
| | | ⚠️ **AI Confidence: LOW** — *"Partial text extraction. The lower portion of the label is obscured or cut off in the image."* |
| | | ✅ Brand Name — Match ("Hillside Vineyards" found, high confidence) |
| | | ✅ Class/Type — Match ("Pinot Noir" found, high confidence) |
| | | ✅ Alcohol Content — Match (13.8%, high confidence) |
| | | ❓ Net Contents — Unable to verify (text region obscured) |
| | | ❓ Health Warning — Unable to verify (lower label not visible) |
| | | ❓ Name & Address — Unable to verify (lower label not visible) |
| | | **Raw Extracted Text**: "HILLSIDE VINEYARDS ... PINOT NOIR ... NAPA VALLEY ... 2022 ... ALCOHOL 13.8% BY VOLUME ... [remainder not readable]" |
| 2 | David zooms into the label image. He can see that the bottom is indeed cut off — likely the photo was cropped poorly. The visible portions all look correct. | |
| 3 | He decides to send it back for a better image rather than guessing about the obscured fields. He clicks **"Needs Revision."** | |
| 4 | He writes: *"The bottom portion of your label image is cut off, so we couldn't verify net contents, the health warning statement, or the bottler name and address. Please upload a complete, uncropped photo of the full label showing all required information."* | |
| 5 | He submits the revision request. | Status updates to `🔄 Needs Revision`. |

**Result:** The admin uses judgment when AI confidence is low, requesting a better image rather than approving blindly or rejecting outright.

---

### 2.5 Monitoring the Dashboard & Filtering

**Actor:** David Chen
**Scenario:** It's Monday morning. David checks the overall state of submissions across the platform.

**Steps:**

| Step | Admin Action | System Response |
|------|-------------|-----------------|
| 1 | David logs in and views the **Admin Dashboard**. | Summary stats display: `47 Total | 31 Approved | 8 Pending | 5 Needs Attention | 3 Rejected` |
| 2 | He clicks the **"Needs Attention"** tab. | Five submissions are listed, sorted by date (oldest first by default): |
| | | `SUB-0022 | Coastal Craft Brewing | ... | Jan 29 | ⚠️ Needs Attention` |
| | | `SUB-0025 | Pacific Wine Estates | ... | Jan 30 | ⚠️ Needs Attention` |
| | | `SUB-0028 | Highland Spirits Co | ... | Jan 30 | ⚠️ Needs Attention` |
| | | `SUB-0031 | Sunset Spirits LLC | ... | Jan 31 | ⚠️ Needs Attention` |
| | | `SUB-0033 | Valley Vineyards | ... | Feb 1 | ⚠️ Needs Attention` |
| 3 | He uses the **Product Type filter** and selects "Distilled Spirits." | The list narrows to two results: SUB-0028 and SUB-0031. |
| 4 | He clears the filter and uses the **search bar** to search for "Coastal Craft." | Only SUB-0022 appears. |
| 5 | He switches to the **"All Submissions"** tab and filters by status = "Pending" and sorts by date descending. | Eight pending submissions are listed with the newest at the top. This includes submissions where validation is still running (recently submitted) and those awaiting admin action. |
| 6 | He clicks column headers to re-sort by Company Name, then by Product Type. | The table re-sorts accordingly. |

**Result:** The admin can efficiently triage their workload using filters, tabs, search, and sorting.

---

### 2.6 Admin Reviews a Resubmission

**Actor:** David Chen
**Scenario:** The user from Workflow 2.2 (Mountain Creek Brewing, SUB-0008) has revised and resubmitted. The automated validation re-ran, but the brand name is now a very close but not exact match (AI similarity = 94%, just under the 90% pass threshold... actually this passes, so let's say the health warning check is better but the formatting is off). The submission lands in "Needs Attention" again.

**Steps:**

| Step | Admin Action | System Response |
|------|-------------|-----------------|
| 1 | David sees SUB-0008 back in the "Needs Attention" queue. | He notices it's a resubmission because the detail view shows a **Revision History** section. |
| 2 | He clicks into it. | The detail page shows: |
| | | **Current Version (v2)** — Form now says "Mountain Creek Brewing" (corrected from "Brew Co."). |
| | | **AI Validation Report**: |
| | | ✅ Brand Name — Match (now "Mountain Creek Brewing" on both form and label) |
| | | ✅ Class/Type — Match |
| | | ✅ Alcohol Content — Match |
| | | ✅ Net Contents — Match |
| | | ⚠️ Health Warning — Partially Present (warning text found but "GOVERNMENT WARNING" is not in all caps on the label — detected as "Government Warning" in mixed case) |
| | | ✅ Name & Address — Match |
| | | **Compliance Warning**: *"GOVERNMENT WARNING header should be in all capital letters and bold type per 27 CFR Part 16."* |
| 3 | He reviews the **Revision History**: | |
| | | **v1 (Feb 1)**: Brand Name: "Mountain Creek Brew Co." → v2: "Mountain Creek Brewing". Health Warning: not present → v2: present (with formatting issue). |
| | | **Previous Admin Feedback (v1)**: "Two issues... brand name... health warning..." |
| 4 | David sees that the user fixed both issues — the health warning is now present, just with a minor formatting issue (mixed case instead of all caps). The actual warning text content is correct. | |
| 5 | He decides this is a Tier 3 compliance warning (informational) and the label substantially meets requirements. He clicks **"Approve"** and adds a note. | |
| 6 | In the **Internal Notes** he writes: *"Health warning present with correct text. 'GOVERNMENT WARNING' header is mixed case instead of all caps — noted as compliance warning but not blocking. User should be advised to fix this for future print runs."* | |
| 7 | He confirms the approval. | Status updates to `✅ Approved`. The user sees the approval on their dashboard. |

**Result:** The admin reviews the revision history for context, evaluates the remaining issue as non-blocking, and approves with an internal note for the record.

---

## Appendix: Status Lifecycle Summary

| Status | Visible To | Meaning | User Can Edit? | Admin Can Act? |
|--------|-----------|---------|---------------|---------------|
| ⏳ Pending | User, Admin | Awaiting validation or admin review | Yes (if validation not in progress) | Yes (if `needsAttention` is true) |
| ✅ Approved | User, Admin | Label passed all checks | No | No (final state) |
| 🔄 Needs Revision | User, Admin | Admin sent it back with feedback | Yes (via "Revise & Resubmit") | No (waiting for user) |
| ❌ Rejected | User, Admin | Admin permanently rejected | No (can "Duplicate & Edit" into new submission) | No (final state) |

---

## Appendix: Edge Cases Covered

| Edge Case | Workflow | Handling |
|-----------|----------|----------|
| All fields match perfectly | 1.2 | Auto-approved, no admin involvement |
| Form data doesn't match label | 1.3, 2.1, 2.2 | Flagged for admin; admin sends back or approves |
| User edits before validation starts | 1.4 | Edit succeeds, validation restarts |
| User tries to edit during validation | 1.5 | Edit blocked with clear message |
| Admin sends back for revision | 1.6, 2.2 | User sees feedback, revises, resubmits |
| Submission rejected outright | 1.7, 2.3 | User uses "Duplicate & Edit" for new submission |
| Imported product with country of origin | 1.8 | Country of origin validated on label |
| Wine product type | 1.9 | Standard field checks run for wine submission |
| Blurry or unreadable image | 1.10, 2.4 | Low confidence flagged; user prompted for better image |
| Resubmission with revision history | 2.6 | Admin sees version trail and previous feedback |
| Wrong product image uploaded entirely | 2.3 | Rejected with guidance to create new submission |
