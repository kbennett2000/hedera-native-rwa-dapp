# CLAUDE.md — hedera-native-rwa-dapp

Before any non-trivial task, read `docs/SPEC.md` and the relevant ADRs in `docs/adr/`.
Those describe intent; the code describes implementation. Both matter.

## Project Overview

Part 2 of a teaching series. A compliance-gated Real World Asset (RWA) token built with
**native Hedera services** — HTS token keys, HCS, Mirror Node, and `@hashgraph/sdk` — as a
deliberate contrast to Part 1 (`hedera-first-rwa-dapp`), which built the same product the
EVM/Solidity way. Audience: developers learning native Hedera RWA tokenization.

## Tech Stack

- **Language:** TypeScript (strict mode), Node ≥ 22, ES modules.
- **Hedera:** `@hashgraph/sdk` (writes via gRPC), Mirror Node REST (reads via `fetch`).
- **Validation:** Zod.
- **Tests:** Vitest (split unit / integration). **Lint/format:** ESLint + Prettier. **Run TS:** tsx.
- **Frontend:** React + Vite + TypeScript; Hedera WalletConnect (`@hashgraph/hedera-wallet-connect`) + HashPack for signing.
- **Optional (cycle 4):** Hardhat + Solidity for the hybrid HTS-via-`0x167` module.
- **Pinned versions** (repo init, 2026-05-28): `@hashgraph/sdk` ^2.81.0 · `zod` ^4.4.3 · `typescript` ^6.0.3 · `tsx` ^4.22.3 · `vitest` ^4.1.7 · `eslint` ^10.4.0 · `@eslint/js` ^10.0.1 · `typescript-eslint` ^8.60.0 · `eslint-config-prettier` ^10.1.8 · `prettier` ^3.8.3 · `@types/node` ^25.9.1. Node pinned via `.nvmrc` to 22 (active LTS); `engines` floor is Node ≥ 22 (raised from 18 for `JSON.parse` source-text access — see ADR-0006).

## Architecture

- `src/core/` — **pure logic, no network, unit-tested.** Audit schema (Zod) encode/decode, Mirror Node parsers, compliance-state derivation, transaction-argument builders.
- `src/sdk/` — **thin execution layer, integration-tested on demand.** Operator client, Mirror Node HTTP client, `operations/` that fire transactions/requests using args from `core/`.
- `src/scripts/` — issuer CLI entrypoints (`01-create-token` … `08-pause`); operator key from `.env`.
- `frontend/` — investor-facing React app; WalletConnect for associate/transfer, Mirror Node for reads.
- `contracts/` — optional hybrid module (final cycle only).
- `test/unit/` — default `npm test`, no network, target < 10s. `test/integration/` — `npm run test:integration`, testnet, on demand, not in CI.
- `docs/` — `SPEC.md`, `hcs-audit-schema.md`; `docs/adr/` — ADRs.
- `deployments.json` — `tokenId`, `topicId`, `operatorId` (parallels Part 1).

## Conventions

- **Logic lives in `core/`; keep `sdk/` thin.** Logic in the execution layer is effectively untestable in the fast loop — this is the load-bearing rule (ADR-0002).
- Token amounts are **strings** in base units, never JS `number` (safe-integer overflow).
- Validate all external data (Mirror Node responses, HCS topic messages) with Zod **on read**.
- Account IDs in `0.0.x` form. **Never log the operator key or `.env` contents.**
- Audit messages follow `docs/hcs-audit-schema.md`; **no PII** in audit messages — account IDs only.
- Imports: ES modules, named exports preferred. Conventional-commit messages (see Git Workflow).

### Agents — when to invoke

- **test-writer** — before implementing any feature; write failing tests from the spec first (TDD).
- **code-reviewer** — before declaring any task done (MUST be used). Runs on the diff.
- **decision-recorder** — when a real architectural decision is made → new ADR in `docs/adr/`.
- **debugger** — any non-obvious bug or flaky/failing test. Reproduce before fixing.
- **session-closer** — end of any session with non-trivial decisions or unfinished work.
- **doc-writer / doc-auditor** — for documentation work and drift checks.
- **fresh-eyes** — run on the README/quickstart before calling v1 done (onboarding *is* the product here).

## Out of Scope for v1

- Admin/issuer UI (issuer ops are CLI scripts).
- NFT (unique-asset) RWA variant.
- Secondary market / DEX / order book.
- Primary issuance lifecycle (subscription, caps, lockups, vesting).
- ERC-3643 / T-REX modular compliance.
- Mainnet deployment guidance.
- Solo / Local Node based local-network testing (revisit when Solo stabilizes — ADR-0005).

## Git Workflow

After any code change is complete and verified (tests pass / lint clean /
feature works), do the following without being asked:

1. `git add -A` to stage all changes
2. Commit with a concise conventional-commit message
   (e.g. `feat: add user auth middleware`, `fix: handle empty cart edge case`,
   `refactor: extract validation into shared module`, `docs: update README`)
3. `git push` to push to origin/main

Commit at logical checkpoints — a complete feature, a bug fix, a refactor —
not after every individual file edit. If a task spans multiple commits,
make each commit independently meaningful and atomic.

If `git push` fails (auth, conflict, network), surface the full error to the
user immediately. Do not retry silently or attempt destructive resolutions
(no `--force`, no resetting branches).

Never commit secrets, API keys, .env files, or anything matching .gitignore.

## Engineering Principles

### Tests are required, not optional
- Every new feature, bug fix, or non-trivial change ships with tests.
- For new functionality, prefer test-first: write the test from the spec,
  then implement until it passes.
- A task is not "done" until the relevant tests pass. Do not report completion
  with failing or skipped tests.
- When fixing a bug, first write a test that reproduces the bug (and fails),
  then fix it. This prevents regressions.
- Keep the test suite fast. If a test is slow, isolate it (mark as integration
  or e2e) so the default `test` command stays under 10 seconds for unit tests.

### Tight feedback loops
- Use strict typing everywhere (TypeScript strict mode / Pydantic / Zod —
  whatever the stack supports). Type errors should surface immediately.
- Run lint and typecheck before declaring a task complete.
- Add structured logging at module boundaries from day one. When something
  breaks, logs should narrow the cause in seconds, not minutes.
- If a change requires manual verification (UI, integrations), state exactly
  what to check and how — don't leave it implicit.

### Spec before code for non-trivial work
- For any task touching 3+ files, introducing a new module, or changing a
  contract between components: produce a spec FIRST in plan mode. Do not
  start editing until the user has approved the plan.
- For significant architectural decisions, write a short ADR (Architecture
  Decision Record) in `/docs/adr/` capturing: context, options considered,
  decision, consequences. Reference the ADR in commit messages.
- Read `/docs/` and `/specs/` (if they exist) before starting work. Those
  files describe intent; the code describes implementation. Both matter.

### Taste and restraint
- Prefer the simplest solution that solves the problem. Resist adding
  abstraction, config options, or framework features that aren't justified
  by an actual requirement.
- If a diff is getting large, stop and ask whether the task should be
  decomposed into smaller commits.
- Reuse existing patterns in the codebase before inventing new ones.
