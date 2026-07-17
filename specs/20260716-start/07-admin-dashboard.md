# 07 — Admin dashboard

**What to build:** An admin-protected area at `/admin` accessible only to users with an admin role. The dashboard shows a list of all users with approve and ban toggles. Admins can delete any blob from the gallery. Approved users get a 10/day upload limit. Banned users cannot upload or rate. This is the moderation and community management hub.

**Blocked by:** 01 — Project scaffold, 02 — Auth, 03 — Gallery, 04 — Image upload

**Status:** ready-for-agent

- [ ] Admin route at `/admin` protected: only users with an admin role claim (via Clerk metadata or organization) can access
- [ ] Non-admin users redirected away from `/admin` with an appropriate message
- [ ] User list: displays all users from the `profiles` table with their Clerk identity (name/email/avatar), current status (default/approved/banned), and today's upload count
- [ ] Approve toggle: admin clicks to flip a user's `approved` flag. Approved users get 10/day upload limit (enforced in the upload server function from ticket 04)
- [ ] Ban toggle: admin clicks to flip a user's `banned` flag. Banned users are blocked from uploading and rating (enforced in the upload and rating server functions)
- [ ] Delete blob action: each blob in the gallery has a delete button visible only to admins. Clicking it removes the blob record from Neon and the image variants from Vercel Blob
- [ ] Confirmation dialogs for destructive actions (ban, delete)
- [ ] Admin dashboard styled consistently with the dark theme
- [ ] Server function tests: admin actions succeed for admin users, non-admin requests are rejected, banned users cannot upload or rate, approved users have elevated limit
