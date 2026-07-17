# 05 — Doom Scale rating

**What to build:** A 1–5 hexagon rating component on each gallery card. Authenticated users can click to submit a rating. The average Doom Scale updates and displays on the card. One rating per user per blob is enforced. Gallery sort by Doom Scale works with real rating data. Unauthenticated visitors see the average but cannot rate.

**Blocked by:** 01 — Project scaffold, 02 — Auth, 03 — Gallery

**Status:** ready-for-agent

- [ ] Hexagon icon component: renders filled/empty hexagons for 1–5 scale, dark themed
- [ ] Rating component on each gallery card: displays current average as hexagons, interactive for authenticated users
- [ ] Authenticated user clicks a hexagon to submit their rating (optimistic UI update)
- [ ] Server function receives rating submission (blob ID, score 1–5), upserts into `ratings` table
- [ ] Unique constraint on (blob_id, rater_profile_id) enforced — user can change their rating but not submit multiple
- [ ] Average Doom Scale recalculated and returned after rating submission
- [ ] Unauthenticated visitors see the average hexagons in a read-only state, with a prompt to sign in to rate
- [ ] User's own rating visually distinguished (e.g., highlighted hexagons) when viewing the gallery
- [ ] Gallery sort by Doom Scale uses real computed averages from the ratings table
- [ ] Server function tests: submit rating creates/updates record, duplicate rating updates instead of inserting, average calculation is correct, unauthenticated requests are rejected
