# Architecture

## Current state

The product is a small Vue 3 single-page application, built manually with Vite and JavaScript, and styled with SCSS. `src/main.js` mounts the root `App.vue`. Component styles live beside their markup in Vue SFCs with scoped SCSS; `src/styles/main.scss` is reserved for global reset, typography, design tokens, and shared primitives. Static public assets, including the site icon, live in `public/`.

Application code remains JavaScript throughout; TypeScript source files and a TypeScript build chain are not part of the accepted architecture. Code documentation uses JSDoc blocks placed directly above the documented symbol, with public and reusable APIs documenting their parameters, return values, thrown errors, and shared data shapes as applicable.

Authenticated AI interpretation now has a frontend implementation backed by interchangeable real and Mock API adapters. The same-origin real API is the default; Mock mode is explicitly selected only for isolated interface work. Its boundaries are fixed in `docs/decisions/0004-ai-divination-frontend-boundaries.md`, with detailed routes, states, API contracts, and acceptance criteria in `docs/ai-divination-frontend.md`. The anonymous experience remains public while AI conversations require a Cookie Session.

`App.vue` owns the shared visual shell and global history drawer. Route pages live under `src/pages/`; domain API modules under `src/api/`; session and streaming orchestration under `src/composables/`. The default Mock adapter implements the same public functions as the real `/api` adapter and is not imported by page components.

## Boundaries

- `scripts/` contains deterministic developer and harness automation.
- `tests/` contains executable checks for repository behavior.
- `docs/` contains durable project knowledge and decisions.
- `.agents/skills/` contains task-specific, reusable agent procedures.
- `.harness/` contains machine-readable harness configuration.

## Dependency direction

Future application code should keep dependencies explicit and should not make `scripts/` or `.agents/skills/` depend on product internals unless a workflow specifically requires it.

Page components must depend on domain-level API modules rather than calling backend endpoints directly. Authentication, divination history, and AI conversations are separate frontend boundaries. Anonymous history remains available locally; authenticated history uses the server as its source of truth and local storage only as a cache or pending-sync queue.

AI message generation uses SSE over the existing `POST` message endpoint. The frontend starts the request with `fetch()`, parses the `text/event-stream` response, and cancels generation with `AbortController`; native `EventSource`, NDJSON, and WebSocket are outside this contract.

Authenticated history uses server pagination as its source of truth. Anonymous local history is uploaded only after explicit confirmation; accepted records move into a user-keyed summary cache that is cleared on logout. Cloud records intentionally render from their validated original/transformed summaries because the server contract does not persist the six raw line values.

Cloud result pages retain the validated record in transient memory for immediate AI handoff, while authenticated AI initialization can also reload an owned server record directly. Route-driven asynchronous loaders use a generation guard so stale responses cannot overwrite a newer route or trigger obsolete navigation.

Unsafe authentication actions are gated on successful anonymous Session bootstrap so the browser cannot submit a write without its Session-bound CSRF material. Session reads and authentication writes use separate timeouts sized for remote Neon and SMTP latency. A timeout or invalid CSRF response returns Session state to `unknown`; the next explicit attempt bootstraps fresh cookies instead of reusing a revoked anonymous Session.

Real login and registration requests seal passwords with the Session response's server public key before JSON serialization, so the HTTP payload contains only a random application-layer password envelope. Registration leaves the browser anonymous and routes to login; logout consumes the backend's freshly rotated anonymous Session instead of leaving local Session state ahead of the cookies.

AI cancellation combines an explicit ownership-scoped cancellation request with local `AbortController` stream shutdown. Enter submits a question, Shift+Enter inserts a newline, and IME composition never triggers submission.

Node unit tests cover pure domain and composable behavior. Vitest with Vue Test Utils and jsdom mounts route pages and the application shell for cross-boundary regressions; both layers and the production build are part of `npm run ci`.

## Change policy

When adding a major subsystem, record its purpose, public boundary, dependencies, and verification strategy in `docs/decisions/`.

## Change impact and cleanup

Before modifying a symbol, file, class, asset, or dependency, search the repository for all references and callers. Update affected references in the same change. After the change, search again for stale references and remove unused implementation, styles, assets, and dependencies. A change is not complete while it leaves known dead code behind.
