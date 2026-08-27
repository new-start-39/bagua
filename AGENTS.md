# Agent Instructions

## Mission

This repository is currently a framework-neutral project scaffold. Preserve the harness conventions while adding product code.

## Sibling backend repository

- The backend repository's real absolute path is `C:\Users\Administrator\Desktop\bagua_koa`.
- The backend is a sibling of this frontend repository: both `bagua` and `bagua_koa` are directly under `C:\Users\Administrator\Desktop`.
- From this repository, the correct relative backend path is `..\bagua_koa`.
- The backend is **not** inside this repository. Never interpret or rewrite its path as `C:\Users\Administrator\Desktop\bagua\_koa`, `_koa`, or any other child path of `bagua`.
- When backend context is needed, verify and use the recorded sibling path directly instead of inferring a path from the current working directory.

## Start here

1. Read `README.md` and `ARCHITECTURE.md`.
2. Read the closest applicable document under `docs/`.
3. Check `git status` before editing.
4. For a repeatable workflow, inspect `.agents/skills/` and use the relevant skill when one exists.

## Commands

- `npm run harness:doctor` — inspect local prerequisites and repository layout.
- `npm run harness:check` — validate required harness files and configuration.
- `npm test` — run the test suite.
- `npm run ci` — run the complete local verification gate.

## Working rules

- Keep changes small, focused, and reversible.
- Prefer existing project patterns over introducing new abstractions.
- Add or update tests for behavior changes.
- Before changing or removing code, search for its imports, usages, route references, and configuration references; update every affected caller in the same change.
- After each code change, search again for stale references and remove code, styles, assets, or dependencies that no longer have a caller. Do not leave dead code behind.
- Write SCSS with nesting. Keep component styles in the owning Vue SFC with `<style scoped lang="scss">`; reserve shared SCSS files for global reset, typography, tokens, and shared primitives.
- Do not claim success without running the relevant verification command.
- Do not commit secrets, `.env` files, generated output, or dependency directories.
- Ask for confirmation before destructive operations or production-impacting actions.

## Personal coding preferences

- Prefer arrow functions whenever they are clear and compatible with the surrounding code.
- Prefer `async`/`await` for asynchronous control flow; do not use `.then()`/`.catch()` chains when `async`/`await` is an appropriate alternative.
- Preserve readability and existing framework conventions when either preference would make the code less clear or less correct.

## Definition of done

A change is complete when the implementation, tests, documentation, and applicable harness checks are updated and `npm run ci` passes.

## Source of truth

This file is a map, not an encyclopedia. Put durable architecture and domain knowledge in `ARCHITECTURE.md` or `docs/`; put repeatable procedures in `.agents/skills/`.
