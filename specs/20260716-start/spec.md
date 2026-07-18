# Blob of Doom — MVP Spec

## Problem Statement

3D printing enthusiasts have no dedicated, playful space to share and celebrate their printing failures. Existing platforms (Reddit, Discord, Twitter) scatter these moments across general-purpose feeds where they get lost. There's no community-built archive of spectacular extrusion failures — no hall of shame where a spaghetti blob gets the dramatic reverence it deserves.

## Solution

**Blob of Doom** — the "Engineering Noir Archive." A community site where signed-in users upload, browse, and rate 3D printing mishaps. The site adopts a mock-cinematic noir aesthetic: dark theme, dramatic tone, and a 1–5 hexagon "Doom Scale" rating system. It's a hall of shame for fun — a place where failed dreams and miscalculated G-code are celebrated, not hidden.

## User Stories

### Discovery & Browsing

1. As an unauthenticated visitor, I want to land on a hero homepage with a call-to-action, so that I immediately understand what the site is and can decide to browse or sign up.
2. As an unauthenticated visitor, I want to browse the gallery of blobs, so that I can see the community's failures without signing up.
3. As an unauthenticated visitor, I want to see a random featured feed of 3–6 blobs on the homepage, so that I get a taste of the content before diving into the full gallery.
4. As any visitor, I want to sort the gallery by date (newest/oldest) or Doom Scale (highest/lowest), so that I can find the most recent or most spectacular failures.

### Authentication

5. As a visitor, I want to sign up or log in using GitHub, Google, or Discord, so that I can participate without creating yet another password.
6. As an authenticated user, I want my session to persist across visits, so that I don't have to log in every time.

### Uploading

7. As an authenticated user, I want to upload a photo of my 3D printing failure along with a title, date it happened, short description, filament type, and machine used, so that I can share my mishap with the community.
8. As an authenticated user, I want my uploaded image to be automatically processed into optimized display sizes, so that the site loads quickly regardless of the original image dimensions.
9. As an authenticated user, I want to be limited to 1 upload per day, so that the gallery isn't flooded and each blob gets its moment.
10. As an admin-approved user, I want an elevated upload limit of 10 per day, so that I can contribute more frequently as a trusted community member.

### Rating

11. As an authenticated user, I want to rate any blob on the Doom Scale (1–5 hexagons), so that I can cast my judgment on the community's failures.
12. As any visitor, I want to see the average Doom Scale rating on each blob in the gallery, so that I can gauge the community's verdict at a glance.

### Moderation & Admin

13. As an admin, I want to view a list of all users, so that I can manage the community.
14. As an admin, I want to toggle a user's approved status (elevating them from 1/day to 10/day uploads), so that I can reward trusted contributors.
15. As an admin, I want to ban a user by their login, so that I can remove bad actors from the community.
16. As an admin, I want to delete any blob, so that I can remove inappropriate or non-blob content.

### Site Identity

17. As any visitor, I want the site to have a dark, dramatic noir aesthetic, so that the "Engineering Noir Archive" tone is consistent and memorable.
18. As any visitor, I want the Doom Scale to render as hexagons instead of stars, so that the rating system feels unique to the Blob of Doom brand.

## Implementation Decisions

### Stack

- **Framework:** TanStack Start — chosen for learning purposes and fit with the project's server-rendered needs.
- **Styling:** Tailwind CSS with a dark theme as the default and only mode.
- **Authentication:** Clerk, supporting GitHub, Google, and Discord social login providers. Clerk handles session management, user profiles, and social provider configuration.
- **Database:** Neon (serverless Postgres) with Drizzle ORM. Drizzle was chosen over Prisma for its lighter weight, faster cold starts on Vercel serverless, and TypeScript-native schema definitions.
- **Image storage:** Vercel Blob for storing original and processed image variants.
- **Image processing:** Sharp, invoked in a server function on upload, to generate WebP variants at thumbnail, medium (gallery poster), and full display sizes.

### Data Model

- **Users** are managed by Clerk. A complementary `profiles` table in the application database stores app-specific user metadata (upload count for the current day, approved status flag, banned status flag). The Clerk user ID is the foreign key.
- **Blobs** table stores: title, description, date occurred, filament type, machine used, uploaded timestamp, uploader profile ID, and references to the image variants in Vercel Blob.
- **Ratings** table stores: blob ID, rater profile ID, and score (integer 1–5). A unique constraint on (blob_id, rater_profile_id) enforces one rating per user per blob.
- **Daily upload tracking** is enforced by comparing the current day's upload count on the user's profile record, reset via a date comparison on each upload attempt.

### API Design

- All client-server communication goes through TanStack Start server functions. There is no separate REST or GraphQL layer.
- Server functions are protected by Clerk authentication where needed (upload, rate, admin actions). Public server functions serve the gallery and homepage data.
- Image upload flow: client sends the file to a server function → server function runs Sharp to generate variants → variants are stored in Vercel Blob → blob record is created in Neon with the variant URLs.

### Admin Dashboard

- The admin dashboard is a protected area of the site, gated by a Clerk organization or a custom admin role claim.
- Admin actions (approve user, ban user, delete blob) are server functions restricted to admin users.

### Moderation Strategy

- Reactive moderation for v1: no automated content scanning, no user report mechanism.
- Admins manually review the gallery and delete inappropriate content.
- Banned users cannot upload or rate. Their existing blobs remain (or can be bulk-deleted by admin).

### Featured Feed

- For v1, the homepage featured feed selects 3–6 blobs at random from the database on each page load. No weighting or curation logic.

### Gallery Sorting

- Two sort axes: date (uploaded timestamp) and Doom Scale (average rating).
- Each axis supports ascending and descending order.
- Default sort is newest first.

## Testing Decisions

### What Makes a Good Test

Tests should validate external behavior — what the user sees and does — not implementation details. A test should break only when behavior changes, not when internal refactoring occurs.

### Test Seams

**Primary seam — TanStack Start server functions.** Every user-facing operation (fetch gallery, upload blob, submit rating, admin actions) flows through a server function. Testing at this layer validates the full request → auth → database → response cycle without a browser. Server functions are invoked programmatically in tests with mocked auth context where needed.

**Secondary seam — E2E page-level tests (Playwright).** Critical user journeys are tested end-to-end:

- Visitor lands on homepage → browses gallery → signs up via Clerk → uploads a blob → sees it in gallery → rates it.
- Admin views user list → approves a user → bans a user → deletes a blob.

### Modules Tested

- Gallery server functions (list, sort)
- Upload server function (including Sharp processing and Vercel Blob storage)
- Rating server function
- Admin server functions (user list, approve, ban, delete blob)
- Homepage featured feed server function
- E2E: full critical paths through the UI

### Prior Art

This is a greenfield project. There is no existing test suite to reference. Tests will follow TanStack Start and Playwright conventions as documented in their respective guides.

## Out of Scope

The following are explicitly deferred past v1 MVP:

- **Date-range picker** for the gallery. Sorting by date and Doom Scale is sufficient for launch.
- **Detail view page** for individual blobs. The gallery card will show title, image, and Doom Scale rating. Clicking a blob does not navigate to a dedicated detail page in v1.
- **View counting.** Blobs do not track view counts in v1.
- **User profiles / user-specific galleries.** No page to see a single user's uploads.
- **Automated moderation** (content scanning, user reporting, flagging).
- **Email notifications** for admin actions or account status changes.
- **Comments** on blobs.
- **Search** functionality.
- **Light theme toggle.** Dark theme is the only mode.
- **Bulk admin operations** (bulk delete, bulk approve).

## Further Notes

- This is a solo side project with no timeline. All services run on free tiers: Clerk, Vercel, Neon, Vercel Blob.
- The site tone is established by the homepage copy: "Welcome to the Engineering Noir Archive. We document the most spectacular 3D printing failures—where extrusion meets entropy. Every blob tells a story of a failed dream and a miscalculated G-code. If this scares you, better take up knitting instead."
- The Doom Scale uses hexagon icons (not stars) rendered 1–5, visually reinforcing the brand.
- The admin dashboard is a separate protected area, not inline in the main site UI.
- Upload rate limiting is enforced server-side in the upload server function by checking the user's profile record for today's upload count. The limit is 1/day for default users and 10/day for admin-approved users.
