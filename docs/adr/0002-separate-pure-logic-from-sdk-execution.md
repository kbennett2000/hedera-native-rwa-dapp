# 0002. Separate pure logic from the SDK execution layer

Date: 2026-05-28
Status: Accepted

## Context

The project mandates test-driven development. The `test-writer` agent has a hard rule: tests must be deterministic with no real network calls. The Engineering Principles require unit tests to stay under ~10 seconds and prefer test-first.

Native Hedera operations are inherently network calls: an `HTS`/`HCS` transaction goes to consensus nodes, takes seconds to finalize, costs HBAR, and is not deterministic to set up and tear down. You cannot TDD a `TokenGrantKycTransaction` in a tight loop. Additionally, local-network testing infrastructure is in flux (Hiero Local Node is deprecating; Solo is not yet ready — see ADR-0005), so betting the harness on a local network is risky right now.

## Decision

Split the codebase into two layers:

- **`src/core/` — pure logic, no network.** HCS message schema (encode/decode/validate), Mirror Node response parsing, compliance-state derivation, and transaction-argument builders. Unit-tested with recorded fixtures. This is the default test loop.
- **`src/sdk/` — thin execution layer.** Wrappers that take validated arguments from `core/` and fire the actual transaction or HTTP request. Kept deliberately dumb so there is little logic to test beyond "was the SDK called with the params `core/` produced." Exercised only by an on-demand integration suite.

## Alternatives considered

- **Test everything against a real network (testnet or Local Node)** — rejected as the primary strategy. Slow, costs HBAR, non-deterministic, cannot meet the < 10s budget, and Local Node is deprecating. (Testnet is retained for a small on-demand integration suite — ADR-0005.)
- **Heavily mock the SDK client and unit-test the execution layer** — rejected. Mocking the SDK surface produces tests that mirror the implementation and break on refactor, which `test-writer` explicitly forbids ("don't write tests that mirror the implementation").

## Consequences

Easier: the majority of behavior is fast and deterministic to test; bugs in parsing, validation, and state logic are caught in the default loop; the SDK churn (versions, network behavior) is quarantined.

Harder: requires ongoing discipline to keep logic out of `sdk/`. If logic leaks into the execution layer it becomes effectively untestable in the fast loop — code review should watch for this.

## Revisit if

Solo (or another local network) reaches a stable, fast, deterministic state suitable for CI, such that integration coverage could fold into the default loop without blowing the time budget.
