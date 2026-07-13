# Whale Sightings — PWA

A mobile-friendly, installable web app for logging whale sightings from land
or sea — even with no signal. This is a parallel PWA build of the existing
"whale-app" (React Native/Expo), sharing the same Supabase backend.

See the project brief for full context on scope, offline/sync design, and
the shared Supabase schema.

## Stack

- Vite + React + TypeScript
- `vite-plugin-pwa` for the manifest + service worker (installability,
  offline asset caching)
- Supabase JS client (existing project — auth, Postgres, storage)
- IndexedDB for the offline sighting queue
- Leaflet + react-leaflet for the map view (no API key needed)

## Status

- [x] Step 1 — Vite + React PWA scaffold (manifest, service worker, installable)
- [x] Step 2 — Supabase client + auth (email/password)
- [x] Step 3 — Offline queue (IndexedDB)
- [x] Step 4 — Log Sighting flow (GPS, species, photo, notes)
- [x] Step 5 — Map view (pins, drive-time radius filter)
- [x] Step 6 — List view (sort, filters, photo thumbnails)

## Getting started

Copy `.env.example` to `.env.local` and fill in the Supabase project URL and
anon/publishable key (same project as the React Native app).

```bash
npm install
npm run dev
```

The dev server runs over HTTPS with a self-signed cert (via
`@vitejs/plugin-basic-ssl`) — Safari on iOS requires a secure context to
grant Geolocation access, and `localhost` exceptions don't extend to a
phone hitting your machine's LAN IP. `npm run dev` prints both a `Local`
and a `Network` URL; open the `Network` one on your phone (same Wi-Fi),
accept the certificate warning once, and location access will work.

## Building

```bash
npm run build
npm run preview
```
