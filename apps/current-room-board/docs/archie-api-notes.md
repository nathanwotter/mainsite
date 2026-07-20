# Archie API Notes

Discovery performed from the official Archie agent index at `https://developers.archieapp.co/llms.txt` and the linked Markdown reference pages on July 18, 2026.

## Base And Auth

- Base URL: `https://api.archieapp.co/v1/`.
- Authentication operation: no `operationId` is published in the page-local OpenAPI fragment.
- Method and path: `POST /authenticate`.
- Request body schema: `types.ClientApplicationAuthenticationRequest` with `client_id` and `client_secret`.
- Token response schema: `types.ClientApplicationToken` with `access_token`, `expires_in`, and `refresh_token`.
- Authenticated requests use `Authorization: Bearer ACCESS_TOKEN`.
- Documented rate limit: 100 requests per 10 seconds; after that the source IP can be blocked for 1 minute and HTTP 429 returned.

## Spaces

- Operation: "Get Spaces"; no `operationId` published.
- Method and path: `GET /me/spaces`.
- Required headers: `Authorization: Bearer ACCESS_TOKEN`.
- Query parameters: none documented.
- Response: array of `types.SpaceRest`; relevant fields include `name`, `domain`, `time_zone`, and many administrative fields. The dashboard uses this only for the diagnostic utility.

## Areas

Archie room-like bookable locations are documented as **Areas** exposed under `conferenceRooms`.

- Operation: "Get Areas"; no `operationId` published.
- Method and path used by the app: `GET /spaces/{spaceDomain}/conferenceRooms?categories[]=conference-room`.
- Required headers: `Authorization: Bearer ACCESS_TOKEN`.
- Path parameter: `spaceDomain`.
- Query parameters: `categories[]` with documented values including `conference-room`, `office`, `event-space`, `phone-booth`, `table`, `resource`, `resource-group`, and more; `withArchived` boolean defaulting to false. The live inspector still probes the unfiltered documented route first for diagnostics, but the app uses the `conference-room` category filter because only bookable rooms should feed the board.
- Response: array of `types.ConferenceRoomRest`.
- Relevant fields: `uuid`, `slug`, `name`, `category`, `archived`, `is_available`, `color`, `current_revision`, `current_revisions`.
- Pagination: none documented for this endpoint.

## Bookings

Bookings are the documented reservation-like entity.

- Operation: "Get Bookings"; no `operationId` published.
- Method and path: `GET /spaces/{spaceDomain}/bookings`.
- Required headers: `Authorization: Bearer ACCESS_TOKEN`.
- Path parameter: `spaceDomain`.
- Query parameters: `limit` integer 1-100 default 40, `startAfter`, `sortBy` enum currently `fullName`, `sortOrder` enum `asc` or `desc` default `desc`, `search`, `startDate` format `date`, `endDate` format `date`, `withCancelled` boolean default false, `types[]` enum `assignation` or `booking`, `itemType` enum `area`, `tour`, `bookable`, `all` default `all`, and `categories[]` with area categories.
- Live note from July 18, 2026: although the OpenAPI fragment documents `startDate` and `endDate` as `format: date`, Archie returned HTTP 400 `global.invalid-request` for date-only values such as `2026-07-18`. The same endpoint returned HTTP 200 when the app sent timezone-aware ISO date-time values for the local-day UTC range, for example `startDate=2026-07-18T04:00:00.000Z` and `endDate=2026-07-19T04:00:00.000Z` for `America/New_York`.
- Pagination wrapper: documented fields are `data`, `has_more`, `next_token`, `request_uuid`, `total_count`, and `error`.
- Single-booking operation: "Get Booking for a space"; no `operationId` published.
- Single-booking path: `GET /spaces/{spaceDomain}/bookings/{bookingUUID}`.
- Single-booking scope: `bookings:read`.
- Relevant booking fields from the documented `types.BookingRest`: `start_date`, `end_date`, `cancelled`, `approval_status`, `conference_room`, `item_type`, `item_uuid`, `beneficiary_type`, `beneficiary_uuid`, `subscriber_type`, `subscriber_uuid`, `responsible`, `name`, `description`, `note`, `full_day`, and `has_conflict`.
- Live single-booking payloads also returned embedded beneficiary/subscriber objects such as `user_beneficiary` and `group_subscriber`. These are parsed only for identity joins and never forwarded raw.
- Status mapping: `cancelled: true` is ignored. `approval_status: approved` is `reserved`. `approval_status: pending` is treated as `blocked` because it may hold the area while approval is pending. `approval_status: declined` is ignored. Missing or unknown `approval_status` values are treated as `ARCHIE_SCHEMA_CHANGED` rather than being interpreted as confirmed reservations.

## Users

- List operation: "List Users"; no `operationId` published.
- List path: `GET /spaces/{spaceDomain}/users`.
- List scope: `users:read`.
- List query parameters: `status`, `primaryLocations[]`, `segmentsUUID[]`, `search`, `title`, `withAdminRights`, `withArchived`, `onlyNewThisMonth`, `limit` integer 1-100 default 40, `startAfter`, `sortBy` enum currently `fullName`, and `sortOrder` enum `asc` or `desc` default `desc`.
- List response: paginated wrapper `pagination.Result-types_UserRest`.
- Single-user operation: "Get User"; no `operationId` published.
- Single-user path used by the app: `GET /spaces/{spaceDomain}/users/{userUUID}`.
- Single-user scope: `users:read`.
- Relevant `types.UserRest` fields for public practitioner display: `uuid`, `id`, `fullname`, `firstname`, and `lastname`. `email`, phone, bio, emergency contact, company, description, and other raw profile fields are never returned to the browser.

## Groups And Permissions

- Group list path: `GET /spaces/{spaceDomain}/groups`; scope `groups:read`.
- Single group path: `GET /spaces/{spaceDomain}/groups/{groupUUIDOrSlug}`; scope `groups:read`.
- Group names are not used for practitioner display. Archie documents `beneficiary_type` as possibly `group`; if a group beneficiary is returned, the app fetches `GET /spaces/{spaceDomain}/groups/{groupUUIDOrSlug}` and displays a user name only when the group safely contains exactly one user. Multi-user groups and subscriber groups remain `Reserved`.

## Important Uncertainty

The `GET /spaces/{spaceDomain}/bookings` page-local OpenAPI response schema currently references `pagination.Result-types_UserRest`, even though the endpoint is a booking list and the single-booking endpoint returns `types.BookingRest`. This appears to be a documentation generation mismatch. The live adapter therefore validates only the fields needed to construct a safe room schedule and never forwards raw Archie responses to the browser.

The practitioner identity is not explicitly named as "practitioner" in the booking schema. The documented field meanings available from the schema are:

- `responsible`: embedded `types.UserRest`; live validation showed this can be the staff creator/manager of the room reservation, so it is not used for practitioner display.
- `subscriber_uuid`: stable ID only; `subscriber_type` may be `user`, `group`, `google`, or `office-365`. Live validation showed `subscriber_type: group` with embedded `group_subscriber` and multiple users for a room booking, so subscriber data is not used for practitioner display.
- `beneficiary_uuid`: stable ID only; `beneficiary_type` may be `user` or `group`.
- `user_beneficiary`: embedded `types.UserRest` observed on single-booking payloads when `beneficiary_type` is `user`; selected as the practitioner member source for Current Wellness.
- `group_beneficiary`: embedded group observed by schema shape; used only if the fetched group has exactly one user, otherwise hidden as `Reserved`.
- `payer_type`: documented separately from the fields above and not used for practitioner display.
- `approval_user`: embedded `types.UserRest` for approval workflow, not the room practitioner.

The app therefore resolves the public practitioner display name from `user_beneficiary.uuid` or `beneficiary_uuid` when `beneficiary_type` is `user`, fetching `GET /spaces/{spaceDomain}/users/{userUUID}` to get the current Archie name. If the practitioner is represented as a group beneficiary, it fetches `GET /spaces/{spaceDomain}/groups/{groupUUIDOrSlug}` and uses the single embedded user only when the relationship is unambiguous. If no practitioner beneficiary is identifiable or the resolved name is unsafe for public display, the kiosk shows `Reserved`. The app does not use `responsible`, `approval_user`, subscribers, booking titles, notes, descriptions, customer fields, emails, group names, or raw response fragments as public practitioner display text.

Live validation on July 18, 2026 for `current-wellness-1` and booking hash `2b3cba657e06`: list and single-booking payloads showed `responsible.uuid` present, `beneficiary_type: user`, embedded `user_beneficiary.uuid` present, `subscriber_type: group`, embedded `group_subscriber.uuid` present with four users, and successful `GET /users/{user_beneficiary.uuid}` lookup. This validated `user_beneficiary` as the practitioner member source for that known room booking and invalidated `responsible` as the display identity.
