# 06 — Homepage hero + featured feed

**What to build:** The landing page at `/` with a dramatic hero section and a random featured feed. The hero displays the noir copy ("Welcome to the Engineering Noir Archive...") and two CTAs: "Browse Gallery" and "Sign Up" (or "Upload Your Blob" if signed in). Below the hero, a featured feed shows 3–6 randomly selected blobs. This is the first thing every visitor sees — it sets the tone for the entire site.

**Blocked by:** 01 — Project scaffold, 03 — Gallery

**Status:** ready-for-agent

- [ ] Hero section: dark, dramatic styling with the noir copy front and center
- [ ] Hero copy: "Welcome to the Engineering Noir Archive. We document the most spectacular 3D printing failures—where extrusion meets entropy. Every blob tells a story of a failed dream and a miscalculated G-code. If this scares you, better take up knitting instead."
- [ ] CTA buttons: "Browse Gallery" links to `/gallery`. "Sign Up" links to sign-up (or "Upload Your Blob" links to `/upload` if authenticated)
- [ ] Featured feed section below the hero: heading ("Featured Blobs of Doom" or similar)
- [ ] Server function fetches 3–6 random blobs from the database
- [ ] Featured blobs displayed as cards (reusing the gallery card component) in a horizontal or grid layout
- [ ] Empty state: if no blobs exist, featured feed shows a message encouraging visitors to be the first to upload
- [ ] Page is fully responsive: hero and feed look good on mobile and desktop
- [ ] Server function tests: random selection returns correct number of blobs, handles empty database gracefully
