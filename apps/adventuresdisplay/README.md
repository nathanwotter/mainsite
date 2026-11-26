# AdventuresDisplay

A beautiful photo frame that occasionally tells us something useful about the day. Priorities: **family photographs → weather → Plan to Eat → shared calendars**. The project retains its AdventuresDisplay name; the proposed shared Apple Photos album is named **HomeBoard**.

The existing two-image crossfade, touch/keyboard controls, whole-photo fitting, clock, Open-Meteo reader, local preferences and isolated Room Board-style deployment structure are retained. The dashboard is replaced by two quiet information views. The Echo Show handles audio, voice assistance, timers and smart-home tasks; those capabilities and Todoist are removed from this app and its active roadmap.

## Run and evaluate

```sh
cd apps/adventuresdisplay
npm ci
npm run dev
```

Open **http://127.0.0.1:4173**. Node 24 is required, matching the repository and `apps/current-room-board`. The loopback development server defaults to a demonstration: bundled public landscape photographs and fictional calendar/meal data. A private feed saved in ignored `.env` is **not exposed in demo mode**. There are no actual family photographs or meal-plan details in the static build or test fixtures.

Tap to reveal navigation; controls fade after eight seconds. The default rotation is:

| Mode | Duration | Purpose |
| --- | --- | --- |
| Ambient Photos | 540 seconds | Clock/date/weather/dinner overlays stay visible throughout photo playback |
| Pure Photos | Manual / opt-in | Entirely unobstructed photographs |
| Today | 30 seconds | Current/hourly weather, today’s events/meals and tomorrow’s highlights |
| Weekly Outlook | 30 seconds | Seven readable rows of weather, events and dinners |

That is **90% photographs**. Display preferences control mode enablement, duration, number of photo cycles between outlooks, slideshow speed, fit/fill, random album playback, overlay contents, three placements, type size, weather coordinates and night hours. At least one photo mode remains enabled. Manual navigation returns to photos after the inactivity timeout; automatic information modes return according to the rotation. There is no permanent navigation, branding or demo banner on photographs.

Pure Photos has no overlay/shading. Ambient offers Quiet corners, Lower edge and Essentials only layouts. Fit preserves portrait and landscape photographs without cropping; fill can crop. Face detection and portrait pairing are not claimed. Shuffle visits the entire enabled album in a random order before starting another pass, with a recent-photo buffer across pass boundaries. New album items join the remaining pool on the next refresh. Two reusable image layers bound decoded memory; incoming-image failure preserves the existing photo. Reduced-motion preferences remove transitions.

Open `/admin.html` from a phone/computer for source administration. Without authentication secrets it is locked; device-local demo settings remain editable. The display has friendly form controls; the initial admin editor uses validated preferences JSON, with a friendlier full admin form still on the roadmap.

## Album videos and optional sound

Album videos play inline among photographs in Pure and Ambient modes. They start **muted by default** and advance to the next item when finished. A small Sound off button appears at the lower left during each clip, even while navigation is hidden. Tap it to turn sound on; tap Sound on to mute. It disappears on still photographs. Display preferences can disable videos entirely or allow clip sound; a fresh visit still needs a user gesture for audible playback. If Safari rejects playback, the frame falls back to muted playback or offers Tap to play video. It never bypasses [WebKit’s media policy](https://webkit.org/blog/6784/new-video-policies-for-ios/).

Pause also pauses the current video. Choosing Today/Weekly Outlook, backgrounding or losing authorization pauses and mutes it. Automatic information-mode changes wait for a clip to finish; a stalled clip is skipped. Sound uses device volume/output routing. Optional album sound does not reintroduce radio, music services, voice assistance or timers. Two image layers and one reusable video element bound frontend memory.

Server ingestion accepts MP4/MOV sources up to **40 MB** and converts them to a **90-second maximum preview**, bounded by **1280 × 720, 24 fps, H.264 Main/AAC**, with output up to 14 MB. Original album videos remain unchanged. Portrait orientation is retained within that bounding box. Unsupported clips are skipped without blocking valid photographs; an existing good version is retained when available. Larger/full-length clips need future background-ingestion work. Linux FFmpeg packaging and Netlify execution/streaming limits still need deployed verification.

The demo includes a six-second pan over the public coast photograph with a quiet generated tone, audible only if enabled. Reveal controls and choose Sample clip to try it. Regenerate it with `node scripts/create-demo-video.mjs`; no private video or third-party audio is bundled.

## Private household operation

Netlify Functions provide authenticated snapshot/photo/config endpoints, encrypted source settings and a 15-minute scheduled synchronizer. Netlify Blobs stores sessions, normalized snapshots and optimized photo derivatives across deployments. The browser receives no subscription URLs, Apple asset URLs or API secrets. Only administrator sessions may change connections; display sessions are read-only and revocable.

1. Generate a password hash and encryption key with `node scripts/hash-password.mjs` in an interactive terminal. It reads the password without echo and prints the resulting server configuration. Use a long unique household admin password. Keep generated values in the **new AdventuresDisplay Netlify project’s runtime secrets**, never Git.
2. Set `ADMIN_PASSWORD_HASH`, `CONFIG_ENCRYPTION_KEY`, and `ADVENTURESDISPLAY_MODE=household`. Use `.env.example` as the variable reference. The build refuses household mode without auth/encryption settings. Use a Netlify HTTPS preview for private integration testing; the small local server has only ephemeral development storage.
3. Sign in at `/admin.html`. Supply the Plan to Eat **recipes-only** subscription and selected calendar feeds. Existing secret URLs are never returned to the browser; blank fields keep the previous value. Choose explicit disconnect controls to remove sources. Keep custom source hosts in the server’s `FEED_ALLOWED_HOSTS` allowlist.
4. On the kitchen iPad, sign in, name the display and select Authorize this display. This replaces the 12-hour admin session with a 90-day display session. On another device, sign in as admin to revoke a display. Re-pair after expiry. No token is placed in a URL or local storage.
5. Refresh sources now, or wait for the scheduled refresh. Updates and successful empty feeds replace prior data, so edits/deletions are reflected. A failed source preserves its last saved data and marks the result stale. No manual meal entry or redeploy is required.

Read [architecture/privacy](docs/architecture.md), [photo and meal source findings](docs/integrations.md), [deployment](docs/deployment.md), and [iPad setup](docs/ipad.md) before live use. Authentication and Netlify infrastructure must still be checked on an approved deployment; local tests are not a production security audit.

## Plan to Eat findings

The supplied subscription was inspected privately and its recipes-only endpoint verified on November 26, 2026. It contained 41 recipe events, all date-only/all-day, without meal-category metadata. The everything feed included one additional non-recipe item. The URL was saved only in ignored local `.env`; the actual recipes were not copied into demo data or fixtures.

This household plans dinners only, so every recipe on its planned date is treated as dinner. The photo overlay, Today and Weekly Outlook use the same dinner plan, with no meal categories or classification settings. The fictional demo also contains dinners only. See [Plan to Eat’s subscription guide](https://learn.plantoeat.com/help/share-your-meal-plan-to-your-calendar-app).

## Caching and privacy

Public demo assets, all three sample photos and the sample clip are service-worker cached for offline relaunch. Private content is excluded by default. Optional `PRIVATE_OFFLINE_CACHE=true` grants an authorized display a **one-hour offline lease**, caching up to 20 same-origin album items within **40 MB total** (photos up to 2 MB each, videos up to 14 MB), plus its normalized snapshot. Offline video playback supports byte ranges. Cache state is session-scoped; logout/401/revocation checks clear it, and removed items leave the cache after a successful new snapshot. At expiry the app locks and private caches clear on the next access. Offline data is stale; items outside the bounded cache need a connection.

An offline device cannot learn about remote revocation or album deletion immediately. Cached pixels also cannot be recalled from someone who already copied them. Use opt-in offline caching only on trusted, passcode-protected household devices. Browser storage can be evicted; it is not a backup. New sessions need one successful online load. Large initial photo albums are ingested in batches, so the first complete snapshot can take multiple refreshes.

## Tests and compatibility

```sh
npm test
npx playwright install chromium webkit
npm run test:e2e
npm run build
```

Target: iPad Air 2, Safari/iPadOS 15, 1024 × 768 landscape CSS pixels, 2× Retina. Browser scripts parse as ES2018 and require no framework, remote font, Wake Lock, modern CSS nesting, container queries or View Transitions. Server dependencies are not shipped to the display. `Intl`, `fetch`, `AbortController`, touch events and service workers are Safari 15-compatible. Current Playwright WebKit is **not** the Safari 15 engine; physical-device and multi-day operation remain release gates. [Verification details](docs/verification.md).

## Hosting and public photo credits

Keep the independent app and app-local config pattern of `apps/current-room-board`, using static HTML rather than its Next.js frontend. Netlify settings: base `apps/adventuresdisplay`, publish `dist`, separate project, Git source `nathanwotter/mainsite`. Intended hostname remains `adventuresdisplay.otteradventures.org`. A separate Git-connected demo is live at https://otter-adventuresdisplay.netlify.app, publishing the prototype branch. DNS remains unchanged; see the current release record in docs/deployment.md. Existing root, Studio and Room Board config is unchanged.

Bundled public sample photographs: [lake](https://images.unsplash.com/photo-1470770841072-f978cf4d019e), [coast](https://images.unsplash.com/photo-1518837695005-2083093ee35b), [mountain](https://images.unsplash.com/photo-1464822759023-fed622ff2c3b), under the [Unsplash license](https://unsplash.com/license). No private photographs belong in `public/` or Git. Live weather uses [Open-Meteo](https://open-meteo.com/en/docs), with attribution in Weekly Outlook; check provider terms before commercial use.

## One-time administrator enrollment

Run `node --env-file=.env scripts/prepare-setup.mjs` once to prepare an ignored `.local-state/netlify-household.env` and `.local-state/setup-link.txt`. Import the environment bundle into only this Netlify project, marked secret and restricted to the production context. Redeploy, then give the household the private setup link. The link expires after 24 hours; its token is removed from the address bar before any form submission and is never stored in the browser. The household chooses an 8–256 character password directly in the app. An atomic create-only write stores only an encrypted scrypt hash in private Blobs and prevents reuse or concurrent overwrites. Subsequent login uses that stored administrator. Remove the setup hash/expiry environment variables after enrollment; retain the encryption key across deployments. Keep the local bundle secure and out of Git. Offline caching remains disabled by default.

## Kitchen corner overlays

The Kitchen corners preset opens in Ambient Photos with time/date at the top left, live Open-Meteo weather at the top right, and a seven-day rolling Plan to Eat dinner list at the bottom right. Only dates with planned dinners appear; the overlay hides when the next seven days are empty. Long recipe titles wrap to two lines. Today’s high and low appear below the weather condition; the update timestamp appears only for stale/sample weather. Pure Photos remains unobstructed, and the automatic rotation still spends 90% of its time in photo modes. Existing device preferences receive this requested preset once while keeping photo timing, fit and audio choices; later layout edits are preserved. Display preferences can disable the weekly dinner overlay or choose a different layout.

Swipe left anywhere on a photograph or clip for the next album item; swipe right to revisit the item you just saw, including during shuffle playback. Swipes keep controls hidden and reset the slideshow interval. Vertical gestures and pinch zoom do not change photos. A tap still reveals the existing controls; no swipe buttons or indicators are added. Recent navigation history is kept in memory only, bounded to 64 item IDs.

Tap the frame, then **Backgrounds** for a four-quadrant comparison using the same current photograph: Charcoal, Warm taupe, Slate blue and Near-black. Tap a quadrant to apply and save its shade on this device, or close to retain the current color. Photo/video playback pauses while comparing and resumes afterward. Display → Photo background also includes Original green. Samples use authenticated loaded images, with no source URLs or photographs added to the build. The comparison closes after the configured inactivity timeout.

Planned recipes link directly to their Plan to Eat recipe from the photo dinner overlays, Today and Weekly Outlook. Only validated HTTPS numeric recipe paths are exposed to authorized displays; subscription URLs stay server-side and URL queries/fragments are discarded. New links arrive with the next successful 15-minute feed sync. The demo has no real recipe links. Plan to Eat may ask you to sign in on the iPad.

Recipes open in a separate browser tab. Close that tab to return to the display; the display also offers Return to display while a recipe visit is active. After one hour it attempts to close the script-opened tab and resets to photo mode, checking the deadline again whenever the display resumes. This is best effort: Safari background suspension, separate Safari windows from home-screen apps, or Plan to Eat window isolation can prevent an exact one-hour return. AdventuresDisplay cannot put its own return button on Plan to Eat pages or force another app/tab to switch. Recipe pages are not embedded, proxied, cached or scraped. Guided Access may limit switching to Safari from a home-screen app; test this on the kitchen iPad.

Automatic photo playback now retains its overlays by default. The original cycle silently switched from Ambient to Pure Photos after 270 seconds, hiding overlays for the following 270 seconds. **Display → Automatically show unobstructed photos** explicitly opts into that alternation. Both photo slots use Ambient when that option is off, preserving the 90% photo schedule and existing durations. Existing settings that lack this new option default to stable overlays; manually choosing Pure Photos, or disabling Ambient entirely, still gives unobstructed photos. Today and Weekly Outlook remain separately configurable information modes.

Shuffle state is bounded to the current album’s opaque IDs and stays in memory. Automatic playback and forward swipes share the same random pool; swipe-back deliberately revisits history. Unavailable items are skipped for that pass. Reloading starts a fresh random pass; disabled videos and deleted items leave the pool automatically. Very small albums necessarily repeat more often.

Recipe touch targets sit above the photo layer. Household meals use an authenticated `/api/recipe/<opaque-id>` redirect, so older cached meals without recipe URL metadata can still resolve their link from the private feed on demand. Missing/deleted entries and network failures show a return-to-display message; the resolver never accepts an arbitrary destination or exposes a subscription URL.
