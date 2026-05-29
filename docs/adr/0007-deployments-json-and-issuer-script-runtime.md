# 0007. `deployments.json` as gitignored local state; issuer-script runtime conventions

Date: 2026-05-29
Status: Accepted

## Context

Cycle 2 adds the `sdk/` execution layer and the `src/scripts/` issuer CLI. Running
those scripts produces network entity ids — a `tokenId` (from `01-create-token`) and
a `topicId` (from `02-create-audit-topic`) — that later scripts and the frontend need
to find. We need somewhere to persist them, and a few runtime conventions for how the
scripts load credentials and handle the network. These are small but real decisions
worth recording so they don't get re-litigated or drift.

The questions: (1) is `deployments.json` committed or gitignored? (2) how do scripts
load `.env`? (3) do we add a custom retry/timeout policy around network calls? (4) how
are string base-unit amounts marshalled into the SDK's numeric types?

## Decision

1. **`deployments.json` is gitignored local state; a `deployments.example.json` is
   committed.** It holds `{ tokenId?, topicId?, operatorId? }`. Testnet ids are not
   secret, but committing the live file bakes one contributor's demo deployment into
   the repo, causes merge churn, and invites someone to act on a stale id. The example
   documents the shape; each contributor's real ids stay local. `deployments.json` is
   added to `.gitignore`.

2. **Scripts load `.env` via Node's built-in `process.loadEnvFile('.env')`** (in a
   try/catch — an absent file is fine when env is already set in the shell). No
   `dotenv` dependency: the engines floor is already Node ≥ 22 (ADR-0006), which has
   `process.loadEnvFile`. `loadConfig(env)` itself reads only a passed-in env object,
   so it stays pure and unit-testable; file loading is a separate, side-effecting step
   in the shared script runner.

3. **No custom retry/timeout layer in `sdk/`.** The Hedera SDK already retries
   transient gRPC errors and polls for receipts internally; wrapping it would add
   logic to a layer that is meant to stay thin (ADR-0002). The only bounded polling we
   add is **read-side**, in the integration test, to absorb Mirror Node propagation lag
   — and it lives in the test, not in `sdk/`.

4. **Amounts marshal to a checked int64 `Long`.** `core/` represents amounts as
   arbitrary-length positive-integer strings; HTS amounts are **signed int64**.
   `Long.fromString` silently _wraps_ on overflow (e.g. uint64-max → `-1`), which is
   the same class of silent numeric corruption ADR-0006 exists to prevent. So `sdk/`
   converts via a small guarded helper that throws if the value does not round-trip
   (overflow / negative), rather than passing a wrapped value to the network.

## Alternatives considered

- **Commit `deployments.json`** — rejected. Bakes one demo's state into the repo and
  causes churn; the ids are reproducible by re-running the scripts.
- **Add `dotenv`** — rejected. A dependency for something the platform now does
  natively at our Node floor.
- **Custom retry/backoff wrapper** — rejected for v1. Duplicates SDK behavior and
  thickens the execution layer; revisit only if a concrete reliability gap appears.
- **Pass amount strings straight to `Long.fromString` without a guard** — rejected.
  Silent wrap on overflow is a correctness trap; fail loudly instead.

## Consequences

Easier: a clean repo (no per-demo state churn), one credential surface (the operator
account), a thin `sdk/` with no bespoke network policy, and amount marshalling that
cannot silently corrupt a value.

Harder: contributors must run the scripts (or copy the example) to get their own
`deployments.json`; the int64 guard means an amount string above int64-max is rejected
at the execution boundary (correct for HTS, but a difference from `core/`'s broader
string domain that callers should understand).

## Revisit if

A deployment needs to track more than a few ids (move to a richer, possibly committed
manifest), or a real network-reliability gap justifies a retry/timeout policy in
`sdk/`.
