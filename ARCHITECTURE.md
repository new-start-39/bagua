# Architecture

## Current state

The product is a small Vue 3 single-page application, built manually with Vite and JavaScript, and styled with SCSS. `src/main.js` mounts the root `App.vue`. Component styles live beside their markup in Vue SFCs with scoped SCSS; `src/styles/main.scss` is reserved for global reset, typography, design tokens, and shared primitives. Static public assets, including the site icon, live in `public/`.

## Boundaries

- `scripts/` contains deterministic developer and harness automation.
- `tests/` contains executable checks for repository behavior.
- `docs/` contains durable project knowledge and decisions.
- `.agents/skills/` contains task-specific, reusable agent procedures.
- `.harness/` contains machine-readable harness configuration.

## Dependency direction

Future application code should keep dependencies explicit and should not make `scripts/` or `.agents/skills/` depend on product internals unless a workflow specifically requires it.

## Change policy

When adding a major subsystem, record its purpose, public boundary, dependencies, and verification strategy in `docs/decisions/`.

## Change impact and cleanup

Before modifying a symbol, file, class, asset, or dependency, search the repository for all references and callers. Update affected references in the same change. After the change, search again for stale references and remove unused implementation, styles, assets, and dependencies. A change is not complete while it leaves known dead code behind.
