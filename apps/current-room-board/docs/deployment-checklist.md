# Deployment Checklist

1. Create an Archie Client Application in the Current Wellness Archie Developer Portal.
2. Grant the app `areas:read` and `bookings:read`.
3. Set `ARCHIE_CLIENT_ID`, `ARCHIE_CLIENT_SECRET`, `ARCHIE_SPACE_DOMAIN`, `ARCHIE_TIMEZONE`, and `ARCHIE_API_BASE_URL` as server-side environment variables. `ARCHIE_LOCATION_ID` is accepted as a legacy fallback.
4. Set `USE_MOCK_ARCHIE_DATA=false` only after validating the live mapping.
5. Configure `KIOSK_ACCESS_KEY` if activation-by-link is desired.
6. Run `ALLOW_ARCHIE_INSPECTION=true npm run archie:inspect` locally or in a protected shell to identify the correct space and room IDs.
7. Replace placeholder room IDs in `config/rooms.ts`. Practitioner names are resolved dynamically from Archie.
8. Open `/kiosk/activate` once on each iPad, submit the kiosk key in the form, then confirm the URL redirects back to `/`.
9. Add the page to the iPad Home Screen from Safari.
10. Enable Guided Access on the iPad and lock it to the installed web app.

For Netlify, deploy the `apps/current-room-board` folder with build command `npm run build`. For Vercel, import the same folder as the project root.
