# CUE — AI Onboarding & Knowledge Buddy

A B2B platform organizations use to onboard new employees within their Lines
of Business (LOBs): structured training modules, a mentor collaboration
checklist, a people-leader completion dashboard, and a compliance audit log.

## Tech stack

| Layer    | Choices |
|----------|---------|
| Frontend | React (Vite), TypeScript, Tailwind CSS, React Router v6 |
| Backend  | Node.js, Express, TypeScript, JWT auth, Multer |
| Database | PostgreSQL, TypeORM, hand-written migrations |
| Other    | dotenv, bcrypt, cors, uuid |

## Project structure

```
cue-platform/
├── frontend/          React + Vite app
│   └── src/
│       ├── pages/     Login, Register, Dashboard, Training, MentorChecklist,
│       │              LeaderDashboard, ComplianceAudit
│       ├── components/
│       ├── hooks/      useAuth
│       ├── api/        typed HTTP clients, one per resource
│       └── types/
├── backend/           Express API
│   └── src/
│       ├── routes/
│       ├── controllers/
│       ├── models/     TypeORM entities matching the schema below
│       ├── middleware/ auth, error handling, async wrapper, uploads
│       ├── services/   password hashing / JWT signing
│       └── database/   data source, migrations, seed script
├── .env.example        reference for every env var (see below)
└── README.md
```

## User roles

| Role | Can do |
|------|--------|
| `new_joinee` | Take training modules, view/participate in their mentor checklist |
| `mentor` | Complete sessions on their mentee's collaboration checklist |
| `people_leader` | Assign mentors, view a team completion dashboard |
| `compliance_admin` | View and export the training completion audit log (CSV) |

## Database schema

The `backend/src/database/migrations/1700000000000-InitSchema.ts` migration
creates exactly the tables given in the spec: `lob`, `users`, `modules`,
`completion_records` (append-only — the app never updates or deletes these
rows), `mentor_assignments`, `course_progress` (6 sessions per assignment),
`lob_documents`, and `knowledge_map`.

## Prerequisites

- Node.js 18+
- A running PostgreSQL 14+ instance (local install, Docker, or a hosted
  instance like Neon/Supabase/RDS) — **this repo was built in an environment
  with no local Postgres or Docker available, so the migration and seed
  script below have not been run against a live database.** They were written
  precisely against the schema in the spec and the backend compiles cleanly,
  but please run `migration:run` yourself the first time and report back if
  anything doesn't apply cleanly.

## Setup

### 1. Create the database

```bash
createdb cue_platform
# or, from psql:
# CREATE DATABASE cue_platform;
```

### 2. Backend

```bash
cd backend
cp .env.example .env
# edit .env: set DB_* to match your Postgres instance, and set JWT_SECRET:
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"

npm install
npm run migration:run   # creates all tables
npm run seed             # inserts the seed data below
npm run dev               # starts the API on http://localhost:4000
```

### 3. Frontend

```bash
cd frontend
cp .env.example .env     # defaults to http://localhost:4000, adjust if needed
npm install
npm run dev                # starts the app on http://localhost:5173
```

## Seed data

`npm run seed` (re-runnable — it truncates and reseeds) creates:

- 1 LOB: **GIC Operations**
- 4 users (password for all: `Password123!`)
  - `leader@cue.example` — people_leader
  - `mentor@cue.example` — mentor
  - `joinee@cue.example` — new_joinee
  - `compliance@cue.example` — compliance_admin
- 2 training modules
- 5 knowledge map entries
- 1 active mentor assignment (mentor ↔ joinee) with its 6-session checklist pre-created

## API endpoints

**Auth** (`/api/auth`)
- `POST /register`, `POST /login`, `POST /logout`, `GET /me`

**Lines of business** (`/api/lob`) — `GET /` (public, populates the signup LOB picker)

**Training** (`/api/training`, auth required)
- `GET /modules` — modules for the caller's LOB, with their own completion status
- `POST /modules/:moduleId/complete` — insert a completion record (`new_joinee` only)

**Mentor checklist** (`/api/mentor`, auth required)
- `GET /my-assignment` — the caller's active assignment + its 6 sessions
- `PATCH /sessions/:sessionId` — mark a session complete (mentor of that assignment only)

**People leader** (`/api/leader`, `people_leader` role required)
- `GET /dashboard` — team completion summary + mentor assignments
- `GET /assignable-users` — mentors/new joinees in the leader's LOB
- `POST /mentor-assignments` — create an assignment (auto-creates its 6 sessions)

**Compliance** (`/api/audit`, `compliance_admin` role required)
- `GET /completion-records` — filterable by `lobId`, `from`, `to`
- `GET /completion-records/export` — same data as CSV

**Documents** (`/api/documents`, auth required)
- `GET /`, `POST /` (multipart, field `file`; pdf/docx/txt, 10MB default limit), `GET /:id/download`

## Demo mode (no backend, no database, no API costs)

The frontend can run entirely on mock data — useful for a portfolio site where
visitors shouldn't need an account, real data, or a live backend. See
[DEMO.md](./DEMO.md) for the full writeup (how it works, demo credentials,
deployment to GitHub Pages, and portfolio integration notes). Quick start:

```bash
cd frontend
npm install
npm run dev:demo      # local dev with VITE_DEMO_MODE=true
# or
npm run build:demo    # static build in frontend/dist, deployable anywhere
```

## Security notes

- Passwords are hashed with bcrypt (12 salt rounds), never stored or logged in plaintext.
- JWTs are signed with `JWT_SECRET` and expire after `JWT_EXPIRES_IN` (default 8h).
- Every non-auth route is behind `requireAuth`; role-restricted routes additionally use `requireRole(...)`.
- `completion_records` is treated as an append-only audit trail at the application layer — no update/delete endpoint exists for it, by design (compliance requirement).
- `DB_SYNCHRONIZE` must stay `false` outside of a disposable local scratch database — it lets TypeORM auto-alter tables and bypasses migrations entirely.
