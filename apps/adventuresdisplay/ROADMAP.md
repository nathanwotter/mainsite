# AdventuresDisplay roadmap

Order of work: **photographs and visual design, weather, Plan to Eat, family calendar**. Echo Show remains responsible for audio, voice assistance, kitchen timers and smart-home functionality. Those features, streaming radio, music and Todoist are outside the active scope.

## 1. The photo frame

- [x] Preserve two-layer crossfades, touch/swipe/keyboard, fit/fill and failure recovery.
- [x] Mixed album photo/video playback, muted default, optional gesture-enabled sound, clip completion/skip and blocked-play fallback.
- [x] H.264/AAC previews, authenticated streaming/ranges, deletion sync and lease-scoped offline video caching.
- [x] Pure Photos without overlays or permanent chrome; quieter Ambient Photos.
- [x] Optional Today and Weekly Outlook; configurable rotation/durations, 90% photo time by default.
- [x] Recent-photo preference with regular archive resurfacing.
- [x] Three configurable overlay layouts, content toggles, sizing and visual night schedules.
- [x] Public-demo offline relaunch; optional bounded private cache with expiring offline authorization.
- [x] Server-side private manifest adapter, Sharp optimization, durable photo storage, authoritative addition/deletion reconciliation and 15-minute refresh.
- [x] Investigate DAKboard-style public iCloud albums; implement an explicitly disabled experimental legacy adapter with privacy acknowledgment.
- [x] Confirm the household's chosen sharing setting: anyone with the link can view. Preserve it; do not turn on legacy Public Website automatically.
- [x] Privately inspect the supplied modern iCloud album link and save only in ignored configuration; add redacted diagnostics and explicit modern/legacy compatibility handling.
- [x] Inspect Apple's actual viewer: this modern album requires an email access step despite link sharing. No email submitted or access/sharing changes made.
- [ ] Validate the guest-access flow using a household-authorized email and evaluate durable server authorization. Full photo/video synchronization is not connected yet.
- [ ] End-to-end test an approved album’s additions/removals, schema changes, empty responses and cached deletions. Current iCloud tests use fictional protocol fixtures, not a live album.
- [ ] If invited-only privacy is required, build a user-authorized native Mac/Photos bridge. The private manifest adapter is ready; the bridge itself is not yet built. A normal private iCloud album is not available through the experimental server adapter.
- [ ] Portrait pairing/focal points, duplicate-photo handling, photographer/date captions only if desired, larger-album background ingestion with stronger synchronization coordination.
- [ ] Safari 15 hardware QA, battery/temperature and a 24–48-hour soak test on Air 2.
- [ ] Verify real iCloud video metadata, portrait HEVC/MOV conversion, sound gestures and device routing on Safari 15; current Apple video schema tests use fictional fixtures.
- [ ] Background video ingestion and optional full-length playback beyond the initial 90-second / 40 MB source limits; verify Linux FFmpeg bundling and Netlify execution limits.

## 2. Weather

- [x] Preserve Open-Meteo current conditions, hourly/seven-day forecast, Fahrenheit and rain probabilities.
- [x] Configurable location name/coordinates; Raleigh default; subtle ambient temperature/icon, optional high/low.
- [x] Failure/stale labels and no fabricated live weather.
- [ ] Verify on the actual iPad and refine custom-location timezone support (display/calendar schedules remain Eastern).

## 3. Plan to Eat

- [x] Privately inspect supplied feed and verify recipes-only endpoint; use the household’s confirmed dinner-only plan.
- [x] Server-side recipes reader, 15-minute scheduled refresh, whole-snapshot updates/deletions, empty-plan fallback.
- [x] Dinner overlay, Today and weekly dinner plan; dinner-only demo with no meal categories or classification settings.
- [x] Secret URL encrypted server-side; no private recipes in static demo or fixtures.
- [ ] Connect the recipe feed to an approved authenticated Netlify deployment and verify actual changes/deletions over time.
- [x] Treat all Plan to Eat recipes as dinners per household preference; no category mapping or duplicate meal entry.

## 4. Family calendar

- [x] Server-side private iCal subscriptions, read-only agenda/week, all-day/recurrence expansion and named calendar colors/visibility.
- [x] Exclude Plan to Eat recipe URLs/UIDs; explicit mealMirror exclusion for calendars with rewritten identifiers.
- [ ] Connect selected Google private iCal feeds; Google OAuth discovery remains optional future work.
- [ ] Broaden VTIMEZONE, modified recurrence and multi-day fixtures; customize calendar names/colors beyond the three initial groups.

## Private administration and release

- [x] Separate admin interface; password verification, encrypted source configuration, short admin sessions and revocable persistent read-only device sessions.
- [x] Same-origin mutation checks, Netlify login rate limits, strict source host/DNS controls and sanitized errors.
- [x] Automated mode/photo, auth/revocation, feed/deletion, optimization, offline-lease and browser tests.
- [ ] Improve admin’s JSON editor into full phone-friendly controls for every setting; add optional stronger administrator identity/MFA.
- [ ] Verify Netlify Blobs permissions/retention, deployed secure cookies, rate limits, scheduled jobs, cache eviction and session lifecycle before private production use.
- [ ] Obtain approval before separate Netlify project/deployment or Otter Adventures DNS changes. No deployment action is bundled with this revision.
