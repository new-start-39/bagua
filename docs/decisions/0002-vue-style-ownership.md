# ADR 0002: Vue component style ownership

## Decision

Keep component styles in the owning Vue single-file component using `<style scoped lang="scss">`. Keep `src/styles/main.scss` for global reset rules, font loading, design tokens, and styles that intentionally cross component boundaries. SCSS should use nesting for component selectors, states, pseudo-elements, and responsive rules.

## Why

Co-locating component markup and styles makes ownership explicit and prevents stale selectors when a component is removed or renamed. Scoped styles also reduce accidental cross-component coupling. A small global stylesheet remains useful for document-level defaults and shared tokens, so it is not necessary to force every rule into a component.

## Change procedure

Before changing code, search for all imports, usages, route references, asset references, and configuration references. Update affected callers together. Afterward, search again and remove stale references and dead code.
