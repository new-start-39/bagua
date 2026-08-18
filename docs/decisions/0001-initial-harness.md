# ADR 0001: Initial repository harness

## Decision

Use a dependency-free Node.js CLI and Node's built-in test runner as the initial verification layer.

## Why

The project has no product framework yet. A small, portable baseline gives agents a reliable doctor, check, test, and CI entry point without prematurely choosing an application stack.

## Revisit when

The first product runtime is selected, or when the project needs application-specific linting, integration environments, secrets management, or deployment gates.
