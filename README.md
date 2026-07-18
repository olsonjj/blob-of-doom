# Blob of Doom 💀

**A gallery of 3D-printing failures.** Share your spaghetti monsters, layer-shift catastrophes, and nozzle excavations. Rate other people's disasters on the Doom Scale. Because misery loves company — and hexagons.

---

## Tech Stack

| Layer                  | Technology                                                                     |
| ---------------------- | ------------------------------------------------------------------------------ |
| **Framework**          | [TanStack Start](https://tanstack.com/start) (React 19, SSR, server functions) |
| **Router**             | [TanStack Router](https://tanstack.com/router) (file-based, type-safe)         |
| **Database**           | [Neon](https://neon.tech) (serverless Postgres)                                |
| **ORM**                | [Drizzle ORM](https://orm.drizzle.team)                                        |
| **Auth**               | [Clerk](https://clerk.com) (`@clerk/tanstack-react-start`)                     |
| **Storage**            | [Vercel Blob](https://vercel.com/docs/storage/vercel-blob)                     |
| **Image processing**   | [Sharp](https://sharp.pixelplumbing.com) (WebP variants)                       |
| **Content moderation** | [SightEngine](https://sightengine.com) (nudity + WAD detection)                |
| **Styling**            | [Tailwind CSS v4](https://tailwindcss.com)                                     |
| **Icons**              | [Lucide React](https://lucide.dev)                                             |
| **Testing**            | [Vitest](https://vitest.dev)                                                   |
| **Deployment**         | [Vercel](https://vercel.com)                                                   |

---

## Getting Started

### Prerequisites

- **Node.js** ≥ 20
- **pnpm** ≥ 9
- A **Neon** database (free tier works)
- A **Vercel Blob** store
- A **Clerk** application (for auth)
- A **SightEngine** account (for content moderation)

### 1. Clone and install

```bash
git clone <repo-url>
cd blob-of-doom
pnpm install
```

### 2. Environment variables

Copy the example and fill in your keys:

```bash
cp .env.example .env.local
```

| Variable                     | Description                     |
| ---------------------------- | ------------------------------- |
| `DATABASE_URL`               | Neon Postgres connection string |
| `BLOB_READ_WRITE_TOKEN`      | Vercel Blob read/write token    |
| `SIGHTENGINE_API_USER`       | SightEngine API user ID         |
| `SIGHTENGINE_API_SECRET`     | SightEngine API secret          |
| `VITE_CLERK_PUBLISHABLE_KEY` | Clerk publishable key           |
| `CLERK_SECRET_KEY`           | Clerk secret key                |

### 3. Set up the database

Push the Drizzle schema to your Neon database:

```bash
npx drizzle-kit push
```

### 4. Start the dev server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

### 5. Make yourself an admin

After signing in for the first time, set your profile as admin in the database:

```sql
UPDATE profiles SET is_admin = 1 WHERE clerk_user_id = '<your-clerk-user-id>';
```

The admin dashboard is at `/admin`.

---

## Project Structure

```
src/
├── components/          Shared UI components (BlobCard, HexagonRating, etc.)
├── db/                  Database layer
│   ├── schema.ts        Drizzle schema (profiles, blobs, ratings)
│   ├── index.ts         DB connection
│   ├── admin.func.ts    Admin server functions + flagged queue
│   ├── auth-guards.func.ts  Route guards (requireAuth, requireAdmin)
│   ├── gallery.func.ts  Gallery query + server function
│   ├── featured.func.ts Featured blobs query
│   ├── moderation.func.ts  SightEngine integration
│   ├── upload.func.ts   Upload pipeline (validate → Sharp → moderate → store)
│   └── *.test.ts        Vitest tests
├── routes/              File-based routes (TanStack Router)
│   ├── __root.tsx       Root layout (nav, footer)
│   ├── index.tsx        Home page (hero + featured)
│   ├── gallery/         Gallery with sort/filter
│   ├── upload/          Upload form + pending review state
│   ├── admin/           Admin dashboard (users, blobs, flagged queue)
│   └── sign-in.$.tsx    Clerk auth pages
├── styles.css           Tailwind imports + custom theme
└── start.ts             TanStack Start config
```

---

## Scripts

| Command                                               | Description                            |
| ----------------------------------------------------- | -------------------------------------- |
| `pnpm dev`                                            | Start dev server on port 3000          |
| `pnpm build`                                          | Production build                       |
| `pnpm preview`                                        | Preview production build               |
| `pnpm test`                                           | Run Vitest suite (71 tests)            |
| `node scripts/test-moderation.mjs <image>`            | Test SightEngine against a local image |
| `node scripts/seed-flagged.mjs [seed\|clear\|status]` | Manage test flagged blobs              |

---

## Content Moderation

Uploads are analyzed by SightEngine for nudity, weapons, alcohol, and drugs. Flagged uploads go to the admin review queue at `/admin` → **Flagged** tab, where admins can approve or reject them.

Thresholds (configurable in `src/db/moderation.func.ts`):

| Category | Threshold |
| -------- | --------- |
| Nudity   | 0.6       |
| Weapons  | 0.7       |
| Alcohol  | 0.7       |
| Drugs    | 0.7       |

---

## License

MIT
