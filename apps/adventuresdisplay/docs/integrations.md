# Photo and meal source findings

## Shared Apple Photos album: HomeBoard

Both partners can contribute to a Shared Album named HomeBoard. The important distinction is how AdventuresDisplay can read it.

| Source | Privacy | Reliability and implementation |
| --- | --- | --- |
| Legacy Shared Album with Public Website | Anyone with the Apple URL can view it; app authentication cannot change this | Experimental server-only SharedStreams adapter implemented, disabled by default; undocumented Apple endpoints can change |
| Invited-only Apple Shared Album | Access remains with invited Apple accounts | Needs an explicitly authorized native Photos bridge; no unrestricted Netlify/PhotoKit web API assumed |
| Private bridge manifest | Controlled by the bridge/storage owner | Reader, optimized ingestion and full-manifest deletion sync implemented; native bridge/export automation remains to be built |

[Apple documents Public Website sharing](https://support.apple.com/en-us/108314). [DAKboard’s screen setup](https://dakboard.freshdesk.com/support/solutions/articles/35000265052-how-to-use-the-predefined-screen-editor) identifies the same Public Website requirement, while its [troubleshooting guide](https://dakboard.freshdesk.com/support/solutions/articles/35000326826) describes delayed refresh. DAKboard compatibility is not evidence of an Apple-supported server API. Apple's newer sharing models may differ; the implemented adapter accepts only legacy `www.icloud.com/sharedalbum/#…` URLs, not temporary links or invited-only newer albums.

The adapter’s protocol was researched from the open-source [ICloud-Shared-Album project](https://github.com/ghostops/ICloud-Shared-Album). Its outdated Axios dependency was evaluated and removed; it is **not** a dependency of this app. Our small adapter uses the app’s bounded HTTPS transport, restricted Apple hosts and server-side secrets, with schema/completeness checks. It has not been tested against a real household album. Unknown/incomplete responses preserve the last complete photo manifest rather than interpreting a schema error as deletion. Successful empty albums clear the prior manifest. Albums over 500 items are rejected for this prototype.

Using the public adapter requires both `ALLOW_PUBLIC_ICLOUD=true` on the server and the administrator’s explicit public-link privacy acknowledgment. This task did not enable sharing, connect an Apple account, or publish an album. Keeping the URL in encrypted server storage prevents leaking it through this app; it does not remove public access at Apple. No Apple ID password or iCloud browser session is requested.

### Supplied newer album link: compatibility status

The household confirmed that the supplied `photos.icloud.com/shared/album/…` album uses “Anyone with the link can view.” Opening Apple's viewer nevertheless presents an email access step: “Enter your email to get access. No account needed.” No email has been submitted and no sharing settings have been changed. This newer guest-access flow differs from the legacy Public Website adapter.

The viewer page contains album metadata, but Apple's anonymous CloudKit resolve request returned `NOT_FOUND`, no anonymous access token and no photo/video listing. The observed email gate is consistent with anonymous access being insufficient; the backend response alone does not diagnose the album's permissions. Guest access and any durable server-side authorization still need to be validated before automatic synchronization can be implemented.

The link is saved only as `ICLOUD_ALBUM_URL` in ignored local `.env`, for `node scripts/inspect-album.mjs --saved`. This diagnostic prints only structural/status flags; it does not print URLs, participant/album names, access tokens or media bodies. It does not automatically connect a source or switch the demo to household mode. The admin API now gives an explicit compatibility error for modern links instead of passing them to the legacy token adapter or reporting a successful connection. Modern automatic synchronization remains unimplemented until an accessible, validated read path is available. Continue with a household-authorized email for guest access; do not enable broader sharing automatically.

For the private bridge, expose a private HTTPS JSON manifest on a server-allowlisted host:

```json
{
  "complete": true,
  "photos": [
    { "id": "stable-source-id", "version": "content-version", "url": "private HTTPS image URL", "addedAt": "2026-11-26T12:00:00Z" }
  ]
}
```

The source URL and image URLs never reach the display. Both must use explicitly allowed hosts; redirects are rejected. IDs/version determine opaque derivative IDs. The server normalizes EXIF orientation, preserves aspect ratio, downsizes to a 1600 px bounding box, strips metadata and saves JPEGs in private Netlify Blobs. Originals aren't retained. At most eight new derivatives are staged per refresh; only a fully ingested authoritative manifest replaces the active album. New photos need no Git commits or redeployment. Removed photographs are removed from the published manifest and storage on a successful complete sync. Partial orphan cleanup and fully coordinated parallel/background ingestion are roadmap items for large albums.

## Album videos

The private bridge uses the same `photos` array for mixed media, preserving the existing contract. Mark video entries with `"type":"video"`, supply a private MP4/MOV URL, and keep stable ID/version/addedAt fields. Image entries may omit type or use `"type":"photo"`. Server ingestion downloads up to 40 MB, transcodes a maximum 90-second 1280×720 H.264/AAC MP4 preview (up to 14 MB), and stores it privately. Temporary scratch files exist only during conversion and are removed; they are never the persistent store. Originals remain in the source album.

Authenticated `/api/video/:id` supports Safari byte-range probes, suffix/partial ranges and HEAD. No upstream video URL reaches the display. Unsupported clips are skipped and marked stale, retaining an older good derivative when available. The experimental iCloud adapter distinguishes actual video derivatives from JPEG posters by media/file-type hints; unfamiliar schemas fail conservatively. A real Apple video album remains unverified and public-link approval requirements are unchanged.

## Plan to Eat

[The official guide](https://learn.plantoeat.com/help/share-your-meal-plan-to-your-calendar-app) distinguishes recipes, notes, ingredients and the combined feed. The supplied combined subscription was inspected over HTTPS, then its recipes-only endpoint was fetched and validated. Observed structure: 41 recipe VEVENTs; DTSTART/DTEND are DATE values; no CATEGORIES or meal-slot metadata; recipe URL and SUMMARY are available. One additional note was present in the combined feed. No raw feed, recipe title, subscription token or URL is in Git or screenshots.

The household confirmed that it plans dinners only. Every recipe is therefore shown as dinner on its planned date, without per-recipe meal categories or an administrator classification setting. This applies to the ambient overlay, Today and Weekly Outlook. Demo dinners remain fictional and do not copy the private feed.

On Netlify, `refresh.mjs` schedules a sync every 15 minutes without a display being open. A successful parsed snapshot replaces all prior meals in the bounded current/next-week window; this reflects edits and deletions. A valid empty feed is an empty plan. A failed or malformed feed keeps last-known data with a stale indication. Display polling is also every 15 minutes, so changes can take up to roughly 30 minutes plus upstream provider caching to reach an idle display. Refresh sources now and reopening the display can shorten that delay. Netlify schedules run only on the configured published deployment; they do not run in the basic local Node preview server.

The local inspection script accepts URLs via hidden stdin and writes only ignored `.env`; `--recipes` checks the recipes-only endpoint. Its output is structural counts/property sets, not feed bodies. It must never be repurposed to dump subscription links or private calendar contents into logs.

## Calendar feeds

Use selected Google Calendar private iCal URLs or other allowlisted HTTPS feeds. No Google OAuth consent is needed for the initial read-only iCal implementation. Server-side `ical.js` handles bounded recurrence expansion, cancellation and provided VTIMEZONE components. Date-only event ends are exclusive. Floating date-times are treated as the household's Eastern local wall time; live timezone/exception edge cases need more fixtures before broad provider support is claimed.

Source snapshots replace rather than append. Recipe URLs and matching hashed UIDs are excluded from family events. Also mark any Google calendar that mirrors Plan to Eat with `mealMirror: true`; this explicit exclusion handles providers that rewrite identities or remove recipe URLs. Family/Home/Activities are the initial named color groups, with independent display visibility. No private calendar subscription URL is returned to the display or admin after saving.
