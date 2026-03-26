# pwa-hirearn

Progressive Web App for **Hirearn employers** (Next.js 16, React 19). Uses the same REST API as the Android app.

## Setup

1. Copy `.env.example` to `.env.local`.
2. Set `NEXT_PUBLIC_API_URL` to your API base including `/api`.
3. **CORS:** Add your web origin to the backend `ALLOWED_ORIGINS` (e.g. `http://localhost:3000` for local dev).

## Scripts

- `npm run dev` — dev server (webpack; required for `@ducanh2912/next-pwa`)
- `npm run build` — production build + service worker under `public/`
- `npm start` — run production server

## PWA

- Manifest: `public/manifest.webmanifest`
- Service worker is emitted on **production** build; in development PWA is disabled in `next.config.ts`.

## Implemented

- OTP login (`/auth/send-otp`, `/auth/verify-otp`) with employer role
- Auth token in `localStorage` (`authToken`, same key as mobile)
- Mobile-style shell: bottom tabs + safe-area padding
- Stub screens: home, jobs, messages, wallet, settings

## Next steps

- Port job posting, attendance, chat, and wallet flows from `frontend-hirearn` using the same API shapes.
