# Architecture and privacy

## Boundaries

Retain the repository’s independent `apps/current-room-board` conventions: own Node 24 package/lock, app-local Netlify config and standalone CI. The display remains plain HTML/CSS/ES2018 JavaScript; the server uses modern Node independently. The app shell and public samples may be public. Household snapshots, photographs, devices and source configuration are accessible only through authenticated Netlify Functions. Hiding navigation, noindex, secret filenames and a custom hostname are not access controls.

`public/` → static publish output; `server/` → auth, encrypted settings, safe source transport, iCal parsing and photo synchronization; `netlify/functions/` → authenticated API, rate-limited login and scheduled refresh. No server source/configuration is copied to the static directory. Private sources are never fetched by client JavaScript. Weather is the only optional direct public integration; custom coordinates go to Open-Meteo when enabled.

## Sessions and administration

An administrator password is provisioned as a salted scrypt hash in runtime secrets, not stored plaintext. Successful login creates a random opaque 256-bit token. Only its SHA-256 digest, role, expiry and device label are stored in private Blobs. A host-only `__Host-adventuresdisplay` cookie uses Secure, HttpOnly, SameSite=Strict and Path=/. Admin sessions last 12 hours. Authorizing the current display replaces its admin session with a read-only 90-day session, with server-side revocation/expiry checked on every request. Tokens never enter local storage or URLs. All state-changing endpoints verify Origin. Netlify enforces five login requests per minute per domain/IP; the local preview has a small equivalent development limiter.

The initial household setup uses one shared admin credential. Optional maintained identity/MFA, richer pairing and automatic rotation are future improvements. Set a long unique password, use trusted devices and verify live platform protections before accepting private content. Admin HTML itself contains no household data. Private source fields appear only after successful authenticated config retrieval; saved values are not returned. API errors are sanitized and never include network exceptions or subscription URLs.

Configuration is encrypted with AES-256-GCM under `CONFIG_ENCRYPTION_KEY`. Secret fields include the Plan to Eat URL, calendar feed URLs and optional photo source URL. The normalized snapshots contain only fields needed to display meals/events; links, descriptions and raw UIDs are excluded or hashed. Use a separate Netlify project, scope production secrets away from previews, inspect Blobs access/region/backup policies, and keep real household data out of Git.

## Durable storage and source safety

Use site-wide Netlify Blobs with strong reads for snapshots, configuration, session records and JPEG derivatives. No function temporary filesystem is used for persistence. Blobs is not a transactional database: larger album ingest, parallel manual/scheduled refresh coordination and atomic session/rate-counter policies need deployment review. Login throttling is platform-enforced rather than attempting atomic counters in last-write-wins storage.

The source transport permits HTTPS only, explicit hostname allowlists, no embedded credentials/custom ports, validated public IPv4 DNS results pinned to the TLS connection, no HTTP redirects, byte bounds and deadlines. iCloud regional redirects are accepted only through the narrowly validated Apple protocol, not arbitrary HTTP redirects. Source hosts requiring IPv6-only access are unsupported by this conservative prototype transport. Image decoding has a 40-million-pixel cap and output is re-encoded without EXIF/GPS metadata.

Netlify scheduled refreshes need an approved deployed project; basic local preview uses explicitly ephemeral in-memory storage. Unit tests inject fake storage/transport and never fetch private user sources. A local `.env` subscription does not make the public demo live. Household build/runtime setup must deliberately select household mode and supply auth/encryption secrets.

## Offline authorization

Demo caching is automatic and contains public samples only. Private caching is an explicit server opt-in. Only read-only authorized display sessions receive an offline lease (up to one hour and never beyond session expiry). The worker stores a session-scoped snapshot and at most twenty optimized same-origin album items within 40 MB total (2 MB per photograph, 14 MB per video). Album URLs and external originals are never cached. Successful snapshot changes remove absent items; 401/logout and expired leases purge private cache access. The foreground frame locks when its offline lease expires.

Offline leases deliberately trade immediate remote revocation for temporary operation without a network. Revocation is learned on the next online request; an offline device cannot know immediately. Storage is browser-origin storage on a trusted physical device, not encrypted device storage controlled by this app. Cache eviction, clock changes or clearing Safari data can affect operation. Never treat this cache as a backup. Native device passcodes, Guided Access and household physical access remain relevant.

## Video media path

MP4/MOV video derivatives use the same session checks and album deletion model as photographs. FFmpeg processes local downloaded input with restricted protocols/formats; temporary conversion scratch space is cleaned and durable H.264/AAC output is stored in private Blobs. Inputs are capped at 40 MB; previews at 90 seconds / 14 MB. Session and manifest membership are checked before HEAD, byte ranges or streamed delivery. The worker caches only full authorized responses and synthesizes offline ranges within a valid lease. The mixed cache is bounded at twenty items / 40 MB, with photographs capped at 2 MB and clips at 14 MB. One inline video element is paused/muted when leaving photo views, backgrounding or losing authorization; clip sound is gesture-enabled and off by default.

## Known release gates

Physical Safari 15, Netlify function routing/rate limits, scheduled sync, session cookies, Blobs privacy, encrypted config persistence, live feed changes and approved photo-album behavior still need deployed verification. The experimental public iCloud adapter is not Apple-supported and is disabled. A private native Photos bridge is not implemented. No public album is enabled automatically. No production deployment or DNS changes are authorized by this implementation revision.
