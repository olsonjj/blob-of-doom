# 01 — Project scaffold + database schema + dark theme shell

**What to build:** A deployed TanStack Start project on Vercel with the full stack wired up — Tailwind dark theme, Drizzle + Neon connected and migrated, and a basic layout shell with navigation. The site is live and styled but has no real content yet. This is the foundation every other ticket builds on.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] TanStack Start project created and running locally
- [ ] Tailwind CSS configured with dark theme as the default and only mode
- [ ] Basic layout shell: header with site title ("Blob of Doom"), nav placeholder, footer
- [ ] Drizzle ORM configured with Neon serverless Postgres connection
- [ ] Database schema migrated: `profiles`, `blobs`, and `ratings` tables per the spec data model
- [ ] Vercel Blob storage configured (connection string / environment variables)
- [ ] Sharp installed and importable in server functions
- [ ] Project deploys successfully to Vercel
- [ ] Site renders the dark-themed shell at the production URL
