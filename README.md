# Evoria Event Management App

Evoria is a full-stack event platform with:

- A TypeScript/Express/MongoDB API (`backend/`)
- A React Native + Expo mobile app (`frontend/`)

It supports end-to-end event lifecycle flows: discovery, public event pages, registration/booking, waitlists, QR check-in, reminders, notifications, reviews, reporting, and event moderation.

## Features

### Attendee flows
- Email OTP verification during signup and password reset
- Browse/discover/search/trending/recommended events
- Public event page by slug (`/api/public/events/:slug`)
- Book tickets with promo code + unlock code support
- Waitlist participation and promotion handling
- View bookings, registrations, and QR ticket/check-in data
- Add events to calendar via generated ICS links
- Report events/users and receive in-app notifications

### Event manager flows (owner/admin/co-host)
- Create, update, publish, cancel, and delete events
- Assign event admins and co-hosts by email
- Manage custom registration fields/questions
- Manage ticket types, sessions, guest lists, waitlists
- QR scanner + manual check-in + check-in history logs
- Event dashboard analytics and aggregate analytics endpoints
- Event communication: invite guests, blast messages, reminders
- Export guest list CSV

### Platform/admin flows
- Event moderation (approve/reject)
- User moderation (suspend/activate)
- Platform analytics

## Tech stack

- Backend: Node.js, Express 5, TypeScript, MongoDB, Mongoose, Zod, JWT, Nodemailer, Azure Blob SDK
- Frontend: React Native, Expo SDK 54, TypeScript, Axios, Zustand, React Navigation
- Notifications: Expo push notifications + in-app notifications

## Repository structure

```text
evoria-event-management-app/
├── backend/    # Express + MongoDB API
└── frontend/   # Expo React Native app
```

## Quick start

### 1. Prerequisites

- Node.js 18+ (Node 20 LTS recommended)
- npm
- MongoDB local instance or MongoDB Atlas
- Expo Go app (for physical mobile testing)

### 2. Backend setup

```bash
cd backend
npm install
cp .env.example .env
```

Set at minimum:

- `MONGO_URI`
- `JWT_SECRET`

Run migrations/seed and start API:

```bash
npm run seed
npm run dev
```

Health check:

- `http://localhost:5000/api/health` (or your configured `PORT`)

### 3. Frontend setup

```bash
cd frontend
npm install
cp .env.example .env
```

Set:

- `EXPO_PUBLIC_API_BASE_URL=http://<YOUR_LOCAL_IP>:5000/api` for local device testing
- Or your deployed backend URL for production testing

Run:

```bash
npm run start
```

## Environment variables

### Backend (`backend/.env`)

Required:

- `MONGO_URI`
- `JWT_SECRET`

Core:

- `NODE_ENV` (development/production)
- `PORT` (defaults to `5000` in code)
- `JWT_EXPIRES_IN` (default `7d`)
- `FRONTEND_URL` (CORS allowlist fallback, optional)
- `PUBLIC_API_BASE_URL` (used for public links in communication flows)

Email / OTP:

- `EMAIL_PROVIDER` (`gmail` or `mock`)
- `GMAIL_USER`
- `GMAIL_APP_PASSWORD`
- `EMAIL_FROM`
- `OTP_EXPIRY_MINUTES`

Push notifications:

- `EXPO_ACCESS_TOKEN` (optional bearer token for Expo push send API)

Azure image storage (optional):

- `AZURE_STORAGE_CONNECTION_STRING`
- `AZURE_STORAGE_CONTAINER_EVENTS`
- `AZURE_STORAGE_CONTAINER_PROFILES`
- `AZURE_STORAGE_CONTAINER_SESSIONS`

If Azure storage is not configured, uploads use local fallback under `backend/uploads/`.

### Frontend (`frontend/.env`)

- `EXPO_PUBLIC_API_BASE_URL`

If omitted, frontend falls back to the hardcoded production API URL in `frontend/src/constants/api.ts`.

## Demo seed data

After `npm run seed` in `backend/`, demo users are upserted:

- `demo.host@evoria.com` / `Demo123!`
- `demo.attendee1@evoria.com` / `Demo123!`
- `demo.attendee2@evoria.com` / `Demo123!`

Seed also creates:

- Demo event slug: `evoria-tech-meetup-2026`
- Venue, sessions, registrations, bookings, and a sample notification

## Useful scripts

### Backend scripts

- `npm run dev` — run API with nodemon
- `npm run build` — compile TypeScript to `dist/`
- `npm run start` — run compiled server
- `npm run test` — run backend tests
- `npm run seed` — seed deterministic demo data
- `npm run db:counts` — print document counts by collection
- `npm run db:clear -- --confirm-clear-db` — clear database (with safety checks)
- `npm run reset:users -- --confirm-delete-all-users --type DELETE_ALL_USERS` — destructive user/data reset

### Frontend scripts

- `npm run start` — start Expo dev server
- `npm run android` — run Android native build
- `npm run ios` — run iOS native build
- `npm run web` — run web mode
- `npm run web:build` — export static web build

## API overview

Base URL:

- `http://localhost:<PORT>/api`

Main route groups:

- `auth` — register/login/verify/reset/get current user
- `events` — discovery, event CRUD, visibility/status, co-host/admin, reminders, reviews, calendar
- `public` — public event by slug + public registration
- `tickets` / `bookings` / `registrations` / `waitlist`
- `checkins` / `guests`
- `notifications` / `push`
- `venues` / `sessions`
- `analytics` / `admin`
- `reports` / `moderation`
- `uploads` / `locations`

Quick login smoke test:

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo.host@evoria.com","password":"Demo123!"}'
```

## Deployment notes

### Backend (Azure App Service)

Use Node.js runtime and set env vars above. Typical startup:

- `npm install`
- `npm run build`
- `npm run start`

### Frontend (Azure Static Web Apps)

Expo web export is supported via:

- Build command: `npm run web:build`
- Output folder: `frontend/dist`
- Environment: `EXPO_PUBLIC_API_BASE_URL=<backend_api_url>/api`

## Current limitations

- Payment flow is mock-only (`/api/payments/mock-checkout`)
- Google auth endpoint is a planned placeholder (`/api/auth/google` returns `501`)
- No OpenAPI/Swagger spec included yet

## Security and safety notes

- Do not commit `.env` files or real credentials
- Rotate `JWT_SECRET` and email credentials in production
- Use `NODE_ENV=production` and restrictive `FRONTEND_URL` in production
- Destructive DB scripts intentionally require explicit confirmation flags

## License

No license file is currently included in this repository. Add a license before public distribution if you intend to permit reuse.
