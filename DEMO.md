# CUE — Demo Mode

A self-contained, backend-free build of CUE for portfolio showcase. Visitors
pick a role and click around a fully working (fake) GIC Operations onboarding
program — no signup, no real data, no API costs, no server to keep alive.

## How it works

Demo mode doesn't fork the UI — every page, form, and API call in the app is
unchanged. Instead, `frontend/src/api/httpClient.ts` swaps axios's transport
for a custom adapter (`frontend/src/demo/mockAdapter.ts`) when
`VITE_DEMO_MODE=true`. That adapter is a small in-memory router that answers
every real endpoint (`/api/auth/login`, `/api/modules/:id`,
`/api/knowledge-map`, `/api/ai/chat`, …) from a seeded dataset
(`frontend/src/demo/mockData.ts`) instead of the network. State (module
completions, chat history, knowledge map edits, mentor sessions you mark
complete, …) persists to `localStorage` so a refresh doesn't lose your place,
and resets cleanly via the on-screen **Reset Demo** button.

Because the swap happens at the transport layer, nothing above it — pages,
API client functions, `useAuth`, React Router — knows it's talking to mock
data instead of the real Neon-backed API. Flip `VITE_DEMO_MODE` off and the
exact same code talks to a real backend again.

```
frontend/src/demo/
├── demoMode.ts     VITE_DEMO_MODE flag + shared localStorage keys
├── mockData.ts     seed data: 4 login personas + 6 supporting NPCs,
│                   GIC Operations LOB, 3 training modules, 15 knowledge
│                   map entries, 3 mentor assignments, 3 documents,
│                   20 audit log rows, module version history
├── mockChat.ts     20 keyword-matched Knowledge Buddy Q&A pairs
├── mockStore.ts    localStorage-backed state + resetDemoState()
└── mockAdapter.ts  the axios adapter — a tiny router over ~40 endpoints
```

## Demo credentials

The login screen shows one-click buttons for each role — you never type
these — but they're real accounts in the mock dataset if you want them:

| Role | Name | Email | Password |
|------|------|-------|----------|
| New Joinee | Alex Thompson | `alex.thompson@demo.cue` | `demo1234` |
| Mentor | Sarah Chen | `sarah.chen@demo.cue` | `demo1234` |
| People Leader | Michael Park | `michael.park@demo.cue` | `demo1234` |
| Compliance Admin | Jennifer Liu | `jennifer.liu@demo.cue` | `demo1234` |

Alex has 2 assigned modules (1 complete, 1 in progress) and 3 of 6
collaboration sessions done with mentor Sarah, who also mentors a second
joinee (Priya Nair). Michael leads all 5 new joinees in GIC Operations, with
2 overdue training items and 3 active mentor assignments to review. Jennifer
has a 20-row audit log and a module with real version history to inspect.

## Running locally

```bash
cd frontend
npm install
npm run dev:demo       # http://localhost:5173, VITE_DEMO_MODE=true
```

## Building a static demo bundle

```bash
cd frontend
npm run build:demo     # outputs frontend/dist — pure static files, no server
```

The output is a plain static SPA (~110KB gzipped JS) deployable to GitHub
Pages, Netlify, Vercel, or any static host — it makes zero network calls.

### Deploying to GitHub Pages

`.github/workflows/deploy-demo.yml` builds and publishes `frontend/dist` to
GitHub Pages on every push to `main` that touches `frontend/`. It sets the
Vite `base` path automatically from the repo name
(`VITE_BASE_PATH=/<repo>/`), which the app also uses as its React Router
`basename` — so the two stay in sync automatically.

To enable it: repo **Settings → Pages → Source → GitHub Actions**. First run
also needs a manual trigger (**Actions → Deploy demo to GitHub Pages → Run
workflow**) since the `paths` filter only fires on frontend changes.

> **Note on the workflow's path assumptions**: it expects `frontend/` at the
> repo root. If `cue-platform/` is nested inside a larger repo, move (or
> symlink) the workflow file and its `working-directory`/`paths` values to
> match, or copy `frontend/` into its own repo — a clean split also gives you
> the standalone "Link to GitHub repo" your portfolio page will want anyway.

> **Known limitation**: GitHub Pages project sites don't support SPA
> deep-link refresh out of the box (`https://you.github.io/repo/dashboard` →
> hard refresh → 404), since GH Pages can't rewrite unknown paths back to
> `index.html` the way a real server does. It doesn't affect normal use —
> visitors land on `/` and click through — but if you want refresh-safe deep
> links, add the standard [SPA GitHub Pages
> redirect trick](https://github.com/rafgraph/spa-github-pages) (a
> `404.html` that bounces to `index.html` with the path preserved in a query
> string). Left out here since it's a workaround for a hosting limitation
> only, not core to demo mode.

### Deploying elsewhere (Netlify / Vercel)

No `VITE_BASE_PATH` needed — leave it unset (defaults to `/`), set the build
command to `npm run build:demo`, publish directory `frontend/dist`. Both
platforms rewrite unknown paths to `index.html` automatically, so the GitHub
Pages deep-link caveat above doesn't apply.

---

## Portfolio integration notes

Guidance for wiring this demo into a separate portfolio site — not part of
this repo's own build.

### Screenshot gallery

Capture one screenshot per role, logged in via the demo buttons above:

1. **New Joinee** — Dashboard or the Training Modules list with one module
   showing "in progress."
2. **Mentor** — My Mentees, showing both mentees' session progress.
3. **People Leader** — Leader Dashboard, showing the completion table and the
   overdue alert.
4. **Compliance Admin** — Audit Log, showing the immutable-record watermark
   and a filtered view.

A fifth shot of the Knowledge Buddy chat mid-conversation (ask "Who approves
rate exceptions?") sells the AI angle well since it renders a structured
Knowledge Map card, not just plain text.

### "Try Live Demo" button

```html
<a href="https://<you>.github.io/<repo>/" target="_blank" rel="noreferrer">
  Try Live Demo →
</a>
```

Point it at the login screen (the app's root route), so visitors land on the
role picker rather than deep inside one persona's view.

### Video walkthrough script (~90 seconds)

1. **(0:00–0:10)** Open the demo, show the 4-button login screen. *"CUE is an
   AI onboarding assistant I built for B2B teams — let's look at it as a new
   employee first."*
2. **(0:10–0:30)** Log in as New Joinee. Point out the training module with
   real lesson content and a quiz. *"Modules are versioned content with a
   quiz at the end — scores and completion feed straight into the manager's
   dashboard."*
3. **(0:30–0:50)** Open Knowledge Buddy, ask *"Who approves rate
   exceptions?"* Show the structured Knowledge Map card in the reply.
   *"Instead of a generic FAQ bot, it retrieves from a live tribal-knowledge
   table an admin maintains — who owns a process, who to contact, who signs
   off."*
4. **(0:50–1:10)** Switch to People Leader (mention the Reset Demo /
   role-switch is instant). Show the Leader Dashboard's overdue alerts and
   completion table. *"Leaders see exactly who's behind, without chasing
   status updates."*
5. **(1:10–1:30)** Switch to Compliance Admin, show the audit log's immutable
   watermark and CSV export. *"Every completion is logged permanently for
   audit — this view exists because a real compliance team needs to prove
   training happened, not just track that it did."* Close on the repo link.

### Tech stack, with justification

| Choice | Why |
|---|---|
| React + Vite + TypeScript | Fast local iteration, typed API contracts shared between every page and its data layer — the same types the real backend's controllers return. |
| Tailwind CSS | Consistent design tokens (a small custom neon palette) without hand-rolling a component library for a project this size. |
| Axios with a swappable adapter | Demo mode reuses 100% of the real app's API-client code — the mock/live split lives in one file, not scattered `if (DEMO_MODE)` checks through every page. |
| TypeORM + PostgreSQL (real backend, not shown in the demo) | Migration-based schema history and an append-only audit table for compliance — the demo's mock data mirrors this schema exactly, so the demo isn't lying about the shape of the real system. |
| GitHub Actions → GitHub Pages | Zero-cost static hosting for a demo that, by design, never needs a server. |

### GitHub repo link

Link to the repo root, not a subdirectory — reviewers should land on the
README (this file's parent) and its architecture overview, not straight into
`frontend/`.
