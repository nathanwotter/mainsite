# Privacy Model

The browser receives only the normalized `DailyRoomSchedule` model. Raw Archie bookings, users, customers, notes, descriptions, emails, phone numbers, payment data, and private fields are never returned by `/api/schedule`.

Practitioner display names are resolved server-side from the booking beneficiary, not from the staff/responsible account. The resolver uses the live-validated `user_beneficiary` user when `beneficiary_type` is `user`, or `beneficiary_uuid` as a lookup key when Archie returns only the ID. If `beneficiary_type` is `group`, the resolver fetches the group and exposes a user name only when the group safely resolves to exactly one user. If no practitioner beneficiary can be safely identified, or if the Archie name looks like an email address or URL, the kiosk shows `Reserved`.

The resolver does not use `responsible`, `approval_user`, `subscriber_uuid`, subscriber groups, booking `name`, booking `description`, booking `note`, user `email`, phone fields, group names, payment data, or raw Archie response fragments as public display text.

The dashboard is read-only. `KIOSK_ACCESS_KEY` can be used as a light activation mechanism through `/kiosk/activate`, which accepts the key only in a POST body and sets an HTTP-only same-site cookie. Production deployments should also rely on platform access controls, unguessable deployment URLs, network allow lists, or authentication at the edge when appropriate.
