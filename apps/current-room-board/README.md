# Current Wellness Room Board

A secure, read-only, iPad-friendly room availability dashboard backed by Archie. Rooms are columns because the operational question is "which room is available?" Practitioners appear only as reservation blocks inside those room columns.

## Local Setup

```bash
cd apps/current-room-board
npm install
npm run dev
```

Mock mode is enabled by default with `USE_MOCK_ARCHIE_DATA=true`, so the dashboard works without Archie credentials.
The Next.js development indicator is hidden by default for kiosk previews; set `NEXT_PUBLIC_SHOW_NEXT_DEV_INDICATOR=true` when debugging local Next.js dev behavior.

## Environment

Copy `.env.example` values into your deployment environment. Keep `ARCHIE_CLIENT_SECRET`, access tokens, and kiosk keys server-side only.

Required live variables: `ARCHIE_CLIENT_ID`, `ARCHIE_CLIENT_SECRET`, `ARCHIE_SPACE_DOMAIN`, `ARCHIE_TIMEZONE`, `ARCHIE_API_BASE_URL`, `USE_MOCK_ARCHIE_DATA`, and optionally `KIOSK_ACCESS_KEY`. `ARCHIE_LOCATION_ID` is still accepted as a legacy fallback.

## Archie API

The app uses official Archie documentation discovered from `https://developers.archieapp.co/llms.txt`.

Endpoints used:

- `POST /authenticate` for `access_token` and `expires_in`.
- `GET /me/spaces` in the diagnostic command.
- `GET /spaces/{spaceDomain}/conferenceRooms?categories[]=conference-room` for room Areas.
- `GET /spaces/{spaceDomain}/bookings` for Bookings.

Pagination uses `limit`, `startAfter`, `has_more`, and `next_token`. The app stays below the documented 100 requests per 10 seconds limit through token caching, schedule caching, request consolidation, and bounded retries with jitter.

See `docs/archie-api-notes.md` for operation details and unresolved schema questions.

## Configuration

Replace placeholder room IDs in `config/rooms.ts`. Only visible configured rooms render, in configured order, and unknown Archie areas are ignored.

Practitioner names are resolved server-side from Archie booking beneficiaries and current Archie user profiles. Unknown or malformed practitioner references show `Reserved`; raw booking names, notes, descriptions, customer names, staff/creator names, emails, phone numbers, and private data are not exposed.
Booking block positions and heights use raw normalized Archie timestamps. End-time labels only round non-quarter-minute ends up to the next quarter-hour for display, because live Archie booking ends can look inclusive to kiosk users.

## Kiosk And iPad

If `KIOSK_ACCESS_KEY` is set, open `/kiosk/activate` on each iPad and submit the key in the form. The POST handler compares the key with a timing-safe digest, applies an increasing delay after failed attempts, stores an HTTP-only same-site cookie, and redirects to `/` without the key in the URL.

In Safari, open the dashboard, share, and choose Add to Home Screen. Enable iPad Guided Access from Settings, open the installed web app, triple-click the side or home button, and start Guided Access.

The PWA manifest and offline page are included. Offline schedule data must be treated as stale; the UI says so instead of claiming the schedule is current.

## Diagnostics

```bash
ALLOW_ARCHIE_INSPECTION=true npm run archie:inspect
```

The diagnostic authenticates and prints sanitized spaces, area IDs, and a small booking field summary. It never prints bearer tokens, emails, phone numbers, notes, descriptions, or raw response bodies.

## Testing

```bash
npm run typecheck
npm test
npm run test:e2e
npm run build
```

Use the kiosk against the Archie administration schedule by comparing the same local date, confirming configured room IDs match Archie Areas, and checking that bookings with `cancelled: true` or `approval_status: declined` do not appear. Missing or undocumented `approval_status` values are treated as an Archie schema change, not as confirmed reservations.

## Troubleshooting

Stale schedules usually mean the app cannot refresh Archie or the iPad is offline. Check server logs for sanitized status codes and verify `ARCHIE_SPACE_DOMAIN`.

401 errors usually mean invalid client credentials or missing scopes. Regenerate the Archie Client Application secret and rotate `ARCHIE_CLIENT_SECRET`.

429 errors mean the rate limit was reached. Confirm only `/api/schedule` is polling and the refresh interval is not lower than expected.
