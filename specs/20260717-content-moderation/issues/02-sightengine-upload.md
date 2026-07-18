# 02 — SightEngine moderation in upload pipeline

**What to build:** Integrate SightEngine into the upload flow. After Sharp processes the image variants, send the full-size buffer to SightEngine for moderation. If flagged above the recommended threshold, create the blob with `flagged = 1` and show the uploader a "Pending Review" placeholder instead of the standard success state. If clean, proceed as normal. If SightEngine errors, log and proceed unflagged (bias toward availability).

**Blocked by:** #01 — Schema & query filters for flagged blobs

**Status:** ready-for-agent

- [ ] Install `@sightengine/client-node` package
- [ ] Add `SIGHTENGINE_API_USER` and `SIGHTENGINE_API_SECRET` environment variables
- [ ] Create moderation helper that calls SightEngine and returns scores
- [ ] Integrate moderation call into upload handler after Sharp processing, before DB insert
- [ ] If flagged: create blob with `flagged = 1`, store full scores JSON in `moderation_scores`
- [ ] If flagged: show "Pending Review" success state to uploader (blob received, awaiting moderation)
- [ ] If clean: create blob with `flagged = 0`, normal success flow
- [ ] If SightEngine errors: log error, proceed with `flagged = 0` (don't block upload)
- [ ] Flagged uploads do not count toward daily upload limit
- [ ] Tests for upload handler with mocked SightEngine (clean, flagged, error responses)
