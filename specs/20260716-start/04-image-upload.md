# 04 — Image upload with metadata

**What to build:** An upload form where authenticated users submit a photo of their 3D printing failure along with title, date occurred, description, filament type, and machine used. On submission, Sharp processes the image into WebP variants (thumbnail, medium, full), stores them in Vercel Blob, and creates a blob record in Neon. A 1/day upload limit is enforced server-side. The uploaded blob appears in the gallery immediately.

**Blocked by:** 01 — Project scaffold, 02 — Auth, 03 — Gallery

**Status:** ready-for-agent

- [ ] Upload page at `/upload` protected by auth (redirects to sign-in if unauthenticated)
- [ ] Upload form fields: title (required), date occurred (required, date picker), description (optional textarea), filament type (required, text input), machine used (required, text input), image file (required, file picker with preview)
- [ ] Client-side validation: all required fields filled, image is a supported format, reasonable file size limit
- [ ] Server function receives the form data and image file
- [ ] Sharp processes the uploaded image into three WebP variants: thumbnail (150px), medium/poster (600px), full (original dimensions, optimized)
- [ ] Image variants uploaded to Vercel Blob, variant URLs stored on the blob record
- [ ] Blob record inserted into Neon with all metadata and image variant URLs
- [ ] 1/day upload limit enforced: server function checks the user's profile for today's upload count, rejects if at limit
- [ ] Upload count on the user's profile incremented on success, reset logic based on date comparison
- [ ] Success state: redirect to gallery with the new blob visible
- [ ] Error states: file too large, unsupported format, upload limit reached, server error
- [ ] Server function tests: successful upload creates record and variants, rate limit blocks second upload same day, invalid input returns errors
