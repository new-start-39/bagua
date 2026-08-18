# Agent Instructions

## Mission

This repository is currently a framework-neutral project scaffold. Preserve the harness conventions while adding product code.

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
