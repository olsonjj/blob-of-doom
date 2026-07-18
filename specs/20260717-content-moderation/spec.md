# Blob of Doom — Content Moderation Spec

## Problem Statement

The site allows anyone to sign up and upload images. Without automated content moderation, an NSFW or otherwise inappropriate image could be uploaded and displayed publicly in the gallery and homepage feed until an admin manually notices and removes it. The site needs proactive detection at upload time to flag questionable content for admin review before it ever appears publicly.

## Solution

Integrate SightEngine's image moderation API into the upload pipeline. When a user uploads an image, the full-size variant is sent to SightEngine for analysis before the blob record is created. If SightEngine flags the image above the recommended confidence threshold, the blob is created in a "flagged" state — invisible to the public, replaced with a "Pending Review" placeholder for the uploader, and queued for admin review. Admins can approve (unflag) or reject (hard delete) flagged blobs from a new section in the admin dashboard.

## User Stories

1. As an uploader, I want my upload to be automatically scanned for inappropriate content, so that the community stays safe without manual intervention.
2. As an uploader whose image is flagged, I want to see a "Pending Review" placeholder instead of my blob appearing publicly, so that I know my upload was received but is awaiting moderation.
3. As an uploader whose image is flagged, I do not want my flagged blob to appear in the gallery or homepage feed, so that potentially inappropriate content is never publicly visible.
4. As an admin, I want to see a list of all flagged blobs awaiting review, so that I can quickly process the moderation queue.
5. As an admin, I want to see the raw SightEngine moderation scores for each flagged blob, so that I can make an informed decision about whether to approve or reject.
6. As an admin, I want to approve a flagged blob with one click, so that legitimate content mistakenly flagged can be restored to the public gallery.
7. As an admin, I want to reject (hard delete) a flagged blob with one click, so that inappropriate content is permanently removed.
8. As a visitor browsing the gallery, I do not want to see flagged or deleted blobs, so that my experience is free of inappropriate content.

## Implementation Decisions

### Moderation Provider

- **SightEngine** was chosen for its generous free tier (2,000 API calls/month ongoing), purpose-built moderation models, and simple Node SDK.
- The `@sightengine/client-node` package will be used to call the moderation API.

### Moderation Flow

- Moderation happens during the upload server function, after Sharp processes the image variants but before the blob record is inserted into the database.
- The full-size image buffer is sent to SightEngine for analysis.
- SightEngine returns confidence scores for multiple categories (nudity, weapons, drugs, offensive content, etc.).
- If any category exceeds the recommended threshold (0.6 for nudity, 0.7 for other categories), the blob is created with `flagged = 1`.
- If no category exceeds the threshold, the blob is created with `flagged = 0` and appears publicly as normal.

### Schema Changes

- Add `flagged` column to `blobs` table: `integer('flagged').notNull().default(0)` — 0 = clean, 1 = flagged for review.
- Add `moderation_scores` column to `blobs` table: `jsonb('moderation_scores')` — stores the full SightEngine API response for admin review context. Null for clean blobs.

### Query Updates

- Gallery query: add `WHERE flagged = 0` filter (alongside existing `deleted = 0`).
- Featured query: add `WHERE flagged = 0` filter (alongside existing `deleted = 0`).
- Blob detail query: add `WHERE flagged = 0` filter (alongside existing `deleted = 0`).
- Flagged blobs are completely invisible to non-admin users in all public views.

### Uploader Experience

- When a blob is flagged, the upload success state shows a "Pending Review" message instead of the standard success message.
- The uploader is informed that their blob is awaiting moderation and will appear once approved.
- Flagged blobs do not count toward the daily upload limit (the upload succeeded from a moderation perspective, but the content is held).

### Admin Dashboard

- New "Flagged" tab or section in the admin dashboard.
- Lists all blobs where `flagged = 1` and `deleted = 0`.
- Each entry shows: thumbnail, title, uploader info, upload date, and the moderation scores breakdown.
- **Approve** action: sets `flagged = 0` and clears `moderation_scores`. The blob immediately appears in public views.
- **Reject** action: calls the existing hard-delete flow (removes from database and Vercel Blob storage).

### Environment Variables

- `SIGHTENGINE_API_USER` — SightEngine API user identifier.
- `SIGHTENGINE_API_SECRET` — SightEngine API secret key.

### Error Handling

- If the SightEngine API call fails (network error, timeout, rate limit), the upload proceeds without moderation — the blob is created with `flagged = 0`. We bias toward availability over safety for v1.
- SightEngine API errors are logged but do not block the upload.

## Testing Decisions

### What Makes a Good Test

Tests should validate external behavior — what the user sees and does — not implementation details. A test should break only when behavior changes, not when internal refactoring occurs.

### Test Seams

**Primary seam — upload server function.** The moderation call happens inside the upload handler. Tests can mock the SightEngine client to simulate clean, flagged, and error responses, then verify the resulting blob state (flagged vs. not flagged).

**Secondary seam — admin server functions.** Approve and reject actions are server functions that can be tested programmatically with mocked auth context.

### Modules Tested

- Upload server function with mocked SightEngine responses (clean, flagged, error).
- Admin approve/reject server functions.
- Gallery and featured queries verify flagged blobs are excluded.
- Blob detail query verifies flagged blobs return "not found" for non-admin users.

### Prior Art

- Existing server function tests in `src/db/*.test.ts` follow the same pattern of mocking external dependencies and testing the handler logic.
- Admin function tests in `src/db/admin.func.test.ts` demonstrate the pattern for admin-gated server functions.

## Out of Scope

- User reporting mechanism (separate spec).
- Auto-hide after N reports (separate spec).
- Appeal process for uploaders whose content is flagged.
- Moderation of existing blobs (only new uploads are scanned).
- Re-scanning blobs after approval.
- Moderation history or audit log.
- Email notifications for moderation decisions.

## Further Notes

- SightEngine free tier: 2,000 API calls/month. At 1 upload/day average, this is well within the free tier.
- The moderation scores JSON is stored for admin context but is not exposed to non-admin users.
- Flagged blobs are excluded from the daily upload count to avoid penalizing users for content that may be approved.
- The "Pending Review" placeholder replaces the standard success state on the upload page — no dedicated "my uploads" page is needed for v1.
