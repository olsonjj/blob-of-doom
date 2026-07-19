# Site Feedback

**Status:** ready-for-agent

## Problem Statement

Visitors to Blob of Doom have no way to report bugs or suggest features. If something is broken or they have an idea to improve the site, there's no channel to surface it. The site owner has no visibility into what users want fixed or added.

## Solution

Add a simple feedback form to the home page that lets anyone submit a bug report or feature request. Signed-in users are automatically identified; anonymous users can optionally leave an email. All submissions appear in a new "Feedback" tab in the admin dashboard where the site owner can review, resolve, or delete them.

## User Stories

1. As a site visitor, I want to report a bug I found, so that the site owner knows something is broken.
2. As a site visitor, I want to suggest a feature, so that the site can improve over time.
3. As a signed-in user, I want my feedback to be automatically linked to my account, so that I don't have to type my email.
4. As an anonymous visitor, I want to optionally leave my email, so that the site owner can follow up if needed.
5. As an anonymous visitor, I want to submit feedback without creating an account, so that the barrier to giving feedback is low.
6. As the site owner, I want to see all feedback submissions in one place, so that I can triage what needs attention.
7. As the site owner, I want to see which submissions are new vs. resolved, so that I can focus on what's still open.
8. As the site owner, I want to mark feedback as resolved, so that I can track what's been handled.
9. As the site owner, I want to delete spam or junk submissions, so that the feedback list stays useful.
10. As the site owner, I want to see who submitted feedback (when they're signed in), so that I can follow up with them directly.
11. As the site owner, I want to see the submission date and category at a glance, so that I can prioritize effectively.

## Implementation Decisions

### Feedback form on the home page

- Placed between the hero section and the featured blobs grid.
- Presented as a collapsed link/button: "Got feedback? We'd love to hear it." Clicking expands the form inline.
- Form fields: category dropdown (Bug / Feature Request), message textarea (required, max 500 characters), and email field.
- Email field behavior: if the user is signed in (Clerk), show their email as read-only text. If anonymous, show an optional text input for them to leave an email.
- On submit, the form collapses and shows a "Thanks! Your feedback has been submitted." confirmation. After 5 seconds, the confirmation fades and the original collapsed link reappears.
- Submission calls a server function that inserts into the feedback table.

### Feedback database table

A new `feedback` table with columns:

- `id` — auto-incrementing integer primary key
- `category` — text, either `'bug'` or `'feature'`
- `message` — text, the feedback body (max 500 characters enforced in the form; also validated server-side)
- `email` — text, nullable. Populated from Clerk if signed in, or from the optional anonymous email field.
- `submitter_profile_id` — text, nullable. Foreign key to `profiles.clerk_user_id`. Set when the submitter is signed in; null for anonymous submissions.
- `resolved` — integer, default 0. 0 = open, 1 = resolved.
- `created_at` — timestamp, default now.

### Server functions

- **submitFeedback** — accepts `{ category, message, email? }`. If the caller is authenticated via Clerk, attaches their `clerkUserId` as `submitter_profile_id` and uses their Clerk email. Inserts into the `feedback` table. Open to all (no auth required).
- **getFeedback** — admin-only. Returns all feedback rows ordered by `created_at` descending.
- **resolveFeedback** — admin-only. Accepts `{ feedbackId }`. Toggles the `resolved` column (0 → 1, 1 → 0).
- **deleteFeedback** — admin-only. Accepts `{ feedbackId }`. Permanently deletes the row.

### Admin dashboard

- A new "Feedback" tab in the admin dashboard, alongside the existing Users, Blobs, and Flagged tabs.
- The tab badge shows the count of unresolved submissions.
- All submissions are shown in a single list: unresolved items first (with a subtle highlight), resolved items below (dimmed).
- Each row shows: category badge, message text, email (or "Anonymous" if none), submitter name (if signed in), and date.
- Actions per row: Resolve toggle and Delete button. Delete shows a confirmation modal (reusing the existing `ConfirmModal` pattern).

### Validation

- `category` must be `'bug'` or `'feature'` — validated server-side.
- `message` is required, non-empty after trimming, max 500 characters — validated server-side.
- `email` if provided must be a valid email format — validated server-side.

## Testing Decisions

### What makes a good test

Tests should exercise the server function contract — given these inputs, assert the DB was called correctly and the expected result is returned. Do not test UI rendering or component internals; those are covered by the existing Playwright/smoke test patterns if they exist.

### Modules to test

- **submitFeedback** — test: inserts with signed-in user, inserts with anonymous + email, inserts with anonymous no email, rejects invalid category, rejects empty message, rejects message over 500 chars, rejects invalid email format.
- **getFeedback** — test: returns all rows ordered by date desc, returns empty array when no feedback exists.
- **resolveFeedback** — test: toggles resolved from 0 to 1, toggles from 1 to 0.
- **deleteFeedback** — test: deletes the row, handles non-existent id gracefully.

### Prior art

Follow the existing test pattern in `src/db/featured.func.test.ts` and `src/db/admin.func.test.ts`: mock the Drizzle `db` import at the module level, use `vi.hoisted()` for mock chain setup, and test the exported query/server functions directly.

## Out of Scope

- Rate limiting on feedback submissions (can be added later if spam becomes an issue)
- Email notifications to the site owner when new feedback arrives
- A public roadmap or "planned features" page fed by feedback
- Feedback on individual blobs (separate from general site feedback)
- Editing feedback after submission
- Pagination of the feedback list in admin (MVP volume is expected to be low)

## Further Notes

- The feedback form uses the existing Clerk `useAuth` hook to determine signed-in state — no new auth infrastructure needed.
- The admin tab follows the existing lazy-load pattern (only fetches data when the tab is first visited).
- The confirmation modal for delete reuses the existing `ConfirmModal` component from the admin dashboard.
