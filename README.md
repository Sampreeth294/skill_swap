# SkillSwap

**Share What You Know. Discover What You Don't.**

SkillSwap is a peer-to-peer skill exchange platform. People teach skills they already know, learn skills they want, and get matched with partners by a transparent two-way algorithm. It's built with **MongoDB · Express · React · Node.js**, using **GraphQL (Apollo Server + Apollo Client)** as the only application API, with real-time features over **GraphQL Subscriptions (graphql-ws)**.

> **Stack deviations from the original brief (as requested):** the React frontend uses **JSX in `.jsx` files** (built with Vite) instead of `React.createElement()`. Password hashing uses **`bcryptjs`**, which is the same bcrypt algorithm in pure JavaScript, so there's no native build step on Windows. Everything else follows the brief: JavaScript only, no TypeScript, no REST for app data, no Socket.IO.

---

## 1. Quick start

**Requirements:** Node.js 20+ and MongoDB 6+. You can run MongoDB locally or use a free **MongoDB Atlas** cluster. Atlas is a replica set, so multi-document transactions are enabled automatically.

```bash
# 1. Install dependencies for both apps
npm run install:all

# 2. Configure the server
cp server/.env.example server/.env      # then edit MONGODB_URI and JWT_SECRET

# 3. Load demo data (10 users, skills, sessions, chats, quests, reviews)
npm run seed

# 4. Run the API and the web app (two terminals)
npm run dev:server     # → http://localhost:4000/graphql  (Apollo Sandbox in dev)
npm run dev:client     # → http://localhost:5173
```

Expected server output:

```
✔ MongoDB connected (skillswap) · transactions enabled
🚀 GraphQL HTTP  → http://localhost:4000/graphql
⚡ GraphQL WS    → ws://localhost:4000/graphql
```

**Demo accounts** (created by `npm run seed`):

| Role | Email | Password |
|---|---|---|
| Admin | `admin@skillswap.dev` | `Admin@12345` |
| User (Python ⇄ React) | `raju@skillswap.dev` | `Demo@1234` |
| User (React ⇄ Python) | `rahul@skillswap.dev` | `Demo@1234` |
| Others | `ananya`, `meera`, `carlos`, `priya`, `arjun`, `sara`, `vikram`, `fatima` @skillswap.dev | `Demo@1234` |

Open two browsers (for example, one normal window and one private window). Sign in as Raju in one and Rahul in the other to watch chat, typing indicators, presence and notifications update live.

**Tests:** `npm test` runs the matching-algorithm unit tests (`node:test`, no database needed).

---

## 2. System architecture

```
┌─────────────────────── Browser (React 19 + Vite) ───────────────────────┐
│  Pages ─ Components ─ AuthContext ─ RealtimeProvider                    │
│                 │                                                       │
│        Apollo Client (InMemoryCache, normalized by __typename:id)       │
│        ├── HttpLink + SetContextLink(Bearer JWT) ── queries/mutations   │
│        └── GraphQLWsLink(graphql-ws, connectionParams.authToken) ─ subs │
└───────────────┬───────────────────────────────────────┬─────────────────┘
          POST /graphql                           WS /graphql
┌───────────────▼───────────────────────────────────────▼─────────────────┐
│ Express 5  ── expressMiddleware(Apollo Server 5)   ws + useServer()     │
│              context: user (JWT) + DataLoaders     onConnect: JWT auth  │
│ Schema = 14 modular typeDefs + resolvers (graphql-tools)                │
│ Validation rules: depth limit · formatError masks internals in prod     │
│ Services: matching · credits · achievements · streaks · notify · presence│
│ PubSub (graphql-subscriptions) → swap for Redis PubSub to scale out      │
└───────────────┬─────────────────────────────────────────────────────────┘
                │ Mongoose 9
┌───────────────▼─────────────────────────────────────────────────────────┐
│ MongoDB — 16 collections, compound/partial/text indexes, transactions   │
└─────────────────────────────────────────────────────────────────────────┘
```

There's a single endpoint, **`/graphql`**, for both HTTP and WebSocket. The only non-GraphQL route is `GET /health`, an operational probe for hosting platforms. In production Express also serves the built React app from the same origin.

## 3. GraphQL request lifecycle

1. A component calls `useQuery(MATCHES)`. Apollo Client checks the normalized cache (`cache-and-network`).
2. `SetContextLink` adds `Authorization: Bearer <jwt>`, and `HttpLink` POSTs the operation to `/graphql`.
3. Apollo Server parses and validates the operation. A custom **depth-limit** rule rejects deeply nested abuse.
4. `buildHttpContext` verifies the JWT and **loads the user fresh from MongoDB**, so suspensions and role changes apply instantly. It also creates per-request **DataLoaders**.
5. Resolvers run. Each private resolver starts with `requireAuth(ctx)` or `requireAdmin(ctx)`, then checks ownership (for example `memberConnection()` and `loadOwnRequest()`).
6. Field resolvers such as `Skill.owner` and `Match.user` go through DataLoader, so 30 cards cost one `$in` query, not 30 (no N+1).
7. `formatError` turns Mongoose validation, duplicate-key and cast errors into `BAD_USER_INPUT` and `CONFLICT`, and masks unknown errors in production.
8. The client normalizes the response into the cache, and every component watching those objects re-renders.

**Subscriptions:** `graphql-ws` authenticates once in `onConnect` (closing the socket with 4403 if the token is invalid). Every subscription resolver **re-authorizes** the specific resource before streaming (for example, only connection members can subscribe to `messageAdded(connectionId)`). `withFilter` then makes sure each user only receives their own events.

## 4. Database design

| Collection | Purpose | Key indexes / rules |
|---|---|---|
| `users` | profile, availability (embedded), reputation counters, credits, streak | unique email, text(name, headline, bio), `password` `select:false` |
| `skillcategories` | admin-managed categories | unique name & slug |
| `skills` | TEACH / LEARN skills with level & experience | unique (owner, type, normalizedName); (type, normalizedName, status); text |
| `swaprequests` | EXCHANGE or CREDIT requests | **partial unique** (from, to) where `status: PENDING` |
| `connections` | accepted pair + agreed exchanges (embedded) | unique `pairKey` (sorted ids) |
| `messages` | 1:1 or room messages | (connection, createdAt), (recipient, readAt) |
| `sessions` | scheduled sessions, two-sided confirmation | (teacher/learner, status, startsAt) |
| `reviews` | rating + comment + endorsement | unique (reviewer, connection) → no duplicate reviews |
| `notifications` | persisted + pushed live | (user, read, createdAt) |
| `learningquests` / `questmilestones` | goals and their milestones | (owner, status), (quest, order) |
| `credittransactions` | immutable ledger | **unique (user, refType, refId, type)** → idempotent awards |
| `learningrooms` / `roomnotes` | rooms (agenda embedded) and versioned notes | (participants), (room, updatedAt) |
| `achievements` | earned badges | unique (user, code) |
| `reports` | moderation queue | unique (reporter, targetType, targetId) |

References are used across aggregates (users ↔ skills ↔ requests). Data that is small and always read with its parent is embedded: availability, exchange terms and agenda items.

## 5. User workflow

Register (+20 welcome credits) → add teaching and learning skills, plus availability → **Smart Matches** → open the **Exchange Blueprint** → send a swap request (skill-for-skill or credits) → the partner accepts and a connection is created → **real-time chat** → **propose a session** (clash-checked) → the partner accepts → after the session **both confirm** → hours and credits are awarded, streaks and badges are evaluated → leave a **review and endorsement** → mark the exchange complete → everything is recorded in the **Skill Passport**.

## 6. Smart matching algorithm (`server/services/matchingService.js`)

1. Find users who **teach** what I want to learn, and users who **want** what I teach (two `distinct` queries on indexed fields). Skill names are normalized with an alias map, so `React.js`, `ReactJS` and `react` all match.
2. Merge, **de-duplicate** and **exclude myself** and suspended users.
3. For each candidate, build the pairs *they teach me* and *I teach them*.
4. Score each candidate (0–100) with transparent weights:

| Factor | Weight | Rule |
|---|---|---|
| Reciprocity | 35 | mutual = 100%, they-teach-me only = 35%, I-teach-them only = 25% |
| Coverage | 15 | share of each person's wish-list the other covers |
| Proficiency | 25 | teacher level minus learner level: ≥2 → 1.0, 1 → 0.85, 0 → 0.45, <0 → 0.2 |
| Availability | 20 | weekly overlap of ≥30-minute windows; 3 h+ = full marks |
| Reputation | 5 | rating / 5 (neutral 0.6 with no reviews) |

5. Generate **human-readable reasons**, and return the breakdown, skill pairs and overlap windows. These feed the Exchange Blueprint directly.

## 7. Security & integrity

- JWT auth with bcrypt (12 rounds). Passwords are never selectable or returned. `email`, `credits` and `streak` resolve to `null` for anyone except the owner or an admin.
- Login uses the same error for an unknown email and a wrong password, so accounts can't be discovered that way.
- Resolver-level authorization everywhere. For example, only the **receiver** can accept a request (`to === me` in the atomic update filter).
- **Race-safe state transitions:** accept, complete and similar actions use `findOneAndUpdate({ status: 'PENDING' | 'ACCEPTED' })`, so only one request can ever win.
- **Credits:** amounts are computed only on the server (`CREDIT_RULES`). Spending uses `{ credits: { $gte: amount } }` in the update filter, so double spending is impossible even without transactions. The work is wrapped in a MongoDB transaction when a replica set is available. A unique ledger index makes every award idempotent.
- **Achievements** are derived only from verified data: completed sessions, quests and reviews.
- **Sessions:** overlap checks run for both participants on propose and again on accept. Completion requires both confirmations and a start time in the past.
- **Collaborative notes** use optimistic concurrency (`version`). Conflicting saves return `CONFLICT` along with the latest content.
- Depth limiting, 1 MB body limit, CORS allow-list, CSRF prevention (Apollo default) and introspection disabled in production.

## 8. Frontend structure

```
client/src/
  components/  Navbar Footer Sidebar AppLayout SkillCard UserCard MatchCard ScoreRing
               ExchangeBlueprint SkillDNA Charts Notification Loader Modal RequestModal
               SkillFormModal Illustrations Logo Icon ProtectedRoute ui
  context/     AuthContext ToastContext RealtimeProvider
  graphql/     fragments.js  queries/  mutations/  subscriptions/
  pages/       Home Login Register Dashboard Profile UserProfile Explore Matches Blueprint
               Requests Chat Sessions LearningQuest SkillPassport Notifications Rooms Room
               AdminDashboard NotFound
  services/    apolloClient.js
  styles/      global components landing dashboard marketplace chat quest passport rooms (.css)
  utils/       helpers.js
```

Routes are code-split with `React.lazy`. Explore and public profiles work for guests and inside the app shell once signed in.

## 9. Design system

- **Palette:** background `#F8F7FF`, cards `#FFFFFF`, primary lavender `#7357E8`, soft lavender `#E8E1FF`, light blue `#DCEAFF`, mint `#DDF4F0`, text `#24213A` / `#77758A`, borders `#EAE7F2`.
- **Type:** Bricolage Grotesque (display) + Manrope (body).
- **Shape:** 14–28 px radii, soft lavender-tinted shadows, pastel tonal chips, and skeleton loaders and illustrated empty states on every list.
- **Logo:** two arrows orbiting two knowledge nodes, a loop of giving and receiving. It rotates on hover.
- **Data viz:** custom SVG charts (stacked bars, multi-line, rings) with hover tooltips, legends and a table view. The 3-series palette (`#7357E8`, `#2E9E8F`, `#E08A2E`) was checked for colour-blind separation.

## 10. Signature features

- **Skill DNA:** an interactive SVG constellation. The inner orbit holds skills you teach (gold ring = mastered), the middle orbit skills you're learning (✓ = learned), and the outer orbit interests. Nodes cluster by category and are sized by level, sessions and experience. Hover to inspect, use the legend to filter kinds, and hover a category to spotlight it.
- **Smart Exchange Blueprint:** an animated two-way flow diagram, score breakdown against the weights, per-skill proficiency fit, a weekly availability overlap grid and the match reasons.
- **Learning Quest:** milestone timelines with due dates, overdue states, streaks and completed journeys. Finishing a quest marks the matching learning skill as *learned*.
- **Skill Passport:** verified hours, skills taught and learned, mastered skills, badges (earned and locked), endorsements, reputation level and the Knowledge Credit wallet.
- **Knowledge Rooms:** 1:1 or group rooms with live chat, shared notes with autosave and conflict handling, an agenda that drives a progress bar, and participant presence.

## 11. GraphQL examples

```graphql
mutation { login(input: { email: "raju@skillswap.dev", password: "Demo@1234" }) { token user { id name credits } } }

query { matches(page: { limit: 5 }) { items { score matchType reasons user { name } youLearn { skillName fitPercent } } } }

subscription { messageAdded(connectionId: "<id>") { body sender { name } createdAt } }
```

Set the header `Authorization: Bearer <token>` in Apollo Sandbox for authenticated operations, and pass `{ "authToken": "<token>" }` as connection params for subscriptions.

## 12. Deployment

1. Create a MongoDB Atlas cluster and copy its connection string into `MONGODB_URI`.
2. `npm run install:all && npm run build` (outputs `client/dist`).
3. Set `NODE_ENV=production`, `JWT_SECRET` (a long random string), `MONGODB_URI` and `CLIENT_ORIGIN`, then `npm start`. Express serves the SPA and `/graphql` on one port, so it suits Render, Railway or a VPS.
4. If the frontend is hosted separately (for example on Vercel), set `VITE_GRAPHQL_HTTP=https://api.example.com/graphql` and `VITE_GRAPHQL_WS=wss://api.example.com/graphql`.
5. To run several API instances, replace the in-memory `PubSub` in `server/services/pubsub.js` with `graphql-redis-subscriptions` (same interface).

## 13. Future extensions

Video calls inside Knowledge Rooms (WebRTC), CRDT-based real-time co-editing, ML-assisted matching on top of the rule engine, email reminders for upcoming sessions, and a refresh-token / httpOnly cookie flow.
