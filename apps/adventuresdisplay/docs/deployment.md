# Separate Netlify deployment

Intended URL: `https://adventuresdisplay.otteradventures.org`. Git source: `nathanwotter/mainsite`. App: `apps/adventuresdisplay`. DNS: Cloudflare. Existing root and Room Board projects remain separate.

## Reviewable project settings

| Setting | Value |
| --- | --- |
| New project suggested name | `otter-adventuresdisplay` (availability not checked) |
| Repository | `nathanwotter/mainsite` |
| Production branch | `main` after prototype review/merge |
| Base directory | `apps/adventuresdisplay` |
| Package directory | Leave unset with this base-directory approach |
| Config | `apps/adventuresdisplay/netlify.toml`, automatically discovered from base |
| Build command | `npm test && npm run build` |
| Publish directory | `dist` relative to base |
| Node | `24` |
| Environment | `ADVENTURESDISPLAY_MODE=demo`; no API secrets |
| Functions | `netlify/functions`, esbuild; Sharp external/native dependency |
| Framework plugin | None; do not inherit Room Board's Next.js plugin |

This uses the same app-local config convention as Room Board, with a static output instead of `.next`. Netlify's [monorepo documentation](https://docs.netlify.com/build/configure-builds/monorepos/) explains base/package directories. Do not set publish to `apps/adventuresdisplay/dist` when base is already `apps/adventuresdisplay`.

## Approval gate and automatic deploys

This source checkout is on `feat/adventuresdisplay-prototype`. The branch has been pushed and its separate Netlify demo project is live; see the release record below. Review the local prototype, tests and app config first. Creating/importing a Git-connected project can immediately trigger deployment; **obtain the user's approval before that action**. The implemented authenticated backend still needs deployed security checks before accepting household photographs. A demo deployment, if approved, displays public samples only and does not fetch private feeds.

After approval:

1. Commit/push the reviewed branch to the existing repository, open a PR and pass the standalone `AdventuresDisplay` workflow. Keep existing CI and all current deployment settings unchanged. Git-connected hosting will build the selected production branch automatically after approval and merge.
2. In Netlify import the existing repository as a **new project** with the table above. Never run `netlify link` against the main-site or Room Board project. Check the Git integration/branch and the project ID before any deployment. Keep `.netlify/` local state ignored.
3. Deploy to the new Netlify-generated hostname, check photo assets, paths, security headers, noindex headers, audio and iPad behavior. Deploy previews also contain public samples only. For Phase 2, protect every preview and API path independently; a private custom domain alone does not protect the Netlify hostname.
4. Only after explicit approval for the production hostname/DNS change, assign `adventuresdisplay.otteradventures.org` to the new project. Read Netlify's exact returned DNS target. In Cloudflare create the single `adventuresdisplay` CNAME to **that verified target**; do not change nameservers or existing apex/other app records. Do not guess the target from the suggested project name.
5. Use DNS-only while Netlify provisions/verifies TLS unless current Netlify/Cloudflare instructions require otherwise. Inspect existing Cloudflare settings before deciding proxy behavior. Verify both the custom hostname and the Netlify hostname serve the correct app over HTTPS with valid certificates. Never weaken TLS validation.
6. Confirm a later GitHub commit restricted to `apps/adventuresdisplay` triggers only this project's intended deployment. The app-local ignore command skips builds with no app changes. Changes to this app must not alter existing app content/config; independent pre-existing workflows may still run repository-wide checks.

The new workflow uses Chromium/WebKit tests before merge. Netlify runs unit tests and build only. A failed build should leave the previous successful deploy in place. Roll back within the **AdventuresDisplay project only** to its last successful deploy; do not revert shared main-site changes to roll back this app. Disconnect AdventuresDisplay's domain or project only if requested; never delete other deployments.

## Secret handling

Demo mode requires no credentials. For an approved household release, set `ADVENTURESDISPLAY_MODE=household`, `ADMIN_PASSWORD_HASH`, `CONFIG_ENCRYPTION_KEY` and optional `PLAN_TO_EAT_FEED_URL` in this project's Netlify environment settings with **Functions runtime** scope (and Build scope for mode/auth build checks). Build-only TOML variables are not a substitute for function runtime secrets. Provision Blobs and verify the scheduled `refresh` function's 15-minute cadence. Do not put production secrets in previews or the root app's settings. No frontend `PUBLIC_` variables for secrets. Keep `.env*` ignored except `.env.example` and never log subscription URLs, cookies, tokens or raw feeds.

Verify HTTPS login, cookie flags, unauthorized direct `/api/snapshot` and `/api/photo/:id` access, display pairing/revocation, cross-origin mutation rejection, Netlify-enforced login throttling, encrypted stored settings and stale/empty-source handling. Test function aliases as well as `/api/` routes. Production dependencies include Sharp; verify its Linux native binary in the Netlify build. A previously stored snapshot should never become public through static asset publishing or Image CDN configuration.

Household sessions and JPEGs use site-wide private Netlify Blobs, not deploy-specific/temporary storage. The scheduled function operates only when household mode is explicitly enabled. Start with a small album; larger albums stage up to eight new derivatives per refresh and may need multiple successful jobs. Review function timeouts, parallel refresh coordination and object cleanup before expanding. Set `ALLOW_PUBLIC_ICLOUD=true` only after the household accepts the Apple public-link tradeoff; also require the admin privacy checkbox. Leave `PRIVATE_OFFLINE_CACHE=false` unless the one-hour offline lease is an accepted policy.

The copied local subscription is not automatically uploaded to Netlify by a deployment. Configure it through authenticated admin or runtime secrets after approval. Static CSP, frame restrictions and `X-Robots-Tag` are defense in depth, not authentication.

## Video packaging

Video ingestion adds the server-only `ffmpeg-static` native binary alongside Sharp; both are external modules in app-local Netlify config. The package's versioned install script is approved in `package.json`. Verify the Linux binary is executable in the deployed bundle and its transcoding/streaming fits actual function time/size limits. A small sample clip and real transcoding are tested locally, but those tests do not verify Netlify packaging. Large batches may stage derivatives across refreshes. The display receives only optimized MP4 previews from authenticated same-origin URLs; the CSP allows same-origin media only.

## Live demo — November 26, 2026

Published at https://otter-adventuresdisplay.netlify.app in the separate Otter Adventures Netlify project `otter-adventuresdisplay`. The project is connected to `nathanwotter/mainsite`, currently publishing `feat/adventuresdisplay-prototype` automatically. Base: `apps/adventuresdisplay`; publish: `dist`; functions: `netlify/functions`; visual editing disabled. Main-site and Room Board configurations and DNS were not changed.

The user authorized live publication without a private staging deployment. Only bundled sample media and fictional household information are enabled. No private album/calendar/meal URL or Apple browser session was uploaded. Apple account sign-in now opens the supplied album (10 items observed); that browser session is not a server synchronization connector.

Release checks: 29 Node tests, 24 browser tests and the production build passed. Netlify's Linux build published three functions. Live `/api/status` returns demo mode with authentication unconfigured; `/api/snapshot` returns only the demo flag; anonymous config/photo requests return 401. The live display was visually checked at 1024 × 768. Hardware Safari 15, household authentication/storage, real source synchronization, and video ingestion limits still require verification.

When moving publication to `main`, merge/review the app branch first and then update only this Netlify project's production branch. Household mode must be explicitly configured with administrator authentication and encryption secrets before connecting private sources. Custom-domain DNS work remains pending approval.
