# 01 — Submit feedback end-to-end

**What to build:** A site visitor (signed-in or anonymous) can submit a bug report or feature request from the home page, and it lands in the database.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] DB migration: `feedback` table with columns `id`, `category`, `message`, `email`, `submitter_profile_id`, `resolved`, `created_at`
- [ ] `submitFeedback` server function: validates category (`'bug'` | `'feature'`), message (required, max 500 chars), optional email format. Attaches Clerk user ID and email if signed in. Inserts into feedback table.
- [ ] `FeedbackForm` component on home page between hero and featured sections: collapsed "Got feedback?" link, expands to show category dropdown + message textarea (with 500-char counter) + email field (read-only if signed in, optional text input if anonymous). Submits via `submitFeedback`. On success: collapses to "Thanks!" for 5 seconds then resets. On error: inline error, form stays open.
- [ ] Tests for `submitFeedback`: signed-in insert, anonymous with email, anonymous without email, rejects invalid category, rejects empty message, rejects over-length message, rejects invalid email.
