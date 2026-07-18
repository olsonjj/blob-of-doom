# 03 — Gallery page (read-only)

**What to build:** A gallery page at `/gallery` that displays blob cards — each showing the processed image, title, average Doom Scale rating, and upload date. Sort controls let visitors switch between date (newest/oldest) and Doom Scale (highest/lowest). Seed data populates the gallery for demo purposes. No authentication required to browse.

**Blocked by:** 01 — Project scaffold + database schema + dark theme shell

**Status:** ready-for-agent

- [ ] Gallery page at `/gallery` accessible to all visitors
- [ ] Server function fetches blobs from Neon with computed average Doom Scale
- [ ] Sort controls: toggle between "Date" and "Doom Scale", each with asc/desc
- [ ] Default sort is newest first
- [ ] Blob card component: displays image (medium variant), title, average Doom Scale (hexagons), upload date
- [ ] Gallery renders as a vertical list of poster-style cards, dark themed
- [ ] Seed script creates 6–10 demo blobs with varied titles, descriptions, filament types, and machines
- [ ] Seed images are placeholder/generated images stored in Vercel Blob (no real uploads yet)
- [ ] Empty state: gallery shows a message when no blobs exist
- [ ] Server function tests: fetch gallery with each sort combination returns correct ordering
