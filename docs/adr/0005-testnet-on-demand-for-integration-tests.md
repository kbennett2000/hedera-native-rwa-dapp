# 0005. Run integration tests against testnet, on demand

Date: 2026-05-28
Status: Accepted

## Context

The pure-logic core is unit-tested with no network (ADR-0002), but the thin SDK execution layer needs verification against a real Hedera network. Three options exist for that network:

- **Hedera/Hiero Local Node** is in a deprecation window: support ends September 2026, and unpinned consensus-node setups began breaking around mid-May 2026 (Consensus Node Release 74). It will keep working with pinned older versions but receives no further updates.
- **Solo** is the official successor for local development and testing, but is still in active development and may not yet cover every workflow.
- **Testnet** is the public network the repo's users target anyway; it works today but is slow, costs testnet HBAR, and is not deterministic.

## Decision

Integration/e2e tests run against **Hedera testnet, on demand** via a dedicated command (`npm run test:integration`), requiring a funded testnet operator account. These tests are **not** in CI and **not** in the default `npm test` loop. Local Node is not wired into the harness. The README and contributor docs must explain the Local Node deprecation and advise developers on how to navigate it (prefer unit tests day-to-day; testnet for integration; watch Solo as the future path).

## Alternatives considered

- **Hedera Local Node in CI** — rejected. It is deprecating and already breaking for unpinned versions; building the harness on it now is a dead end.
- **Adopt Solo now** — rejected for v1. Not yet stable or feature-complete enough to depend on; revisit later.
- **Mock the network entirely** — rejected. Mocking the SDK gives false confidence for the execution layer and produces implementation-mirroring tests (ADR-0002).

## Consequences

Easier: integration tests reflect real network behavior on the same network users deploy to; no dependency on deprecating local tooling.

Harder: integration tests are slow, cost testnet HBAR, and are not deterministic, so they cannot gate CI; contributors need a funded testnet account; and the docs carry an explicit, dated note about the Local Node deprecation that will itself need maintenance.

## Revisit if

Solo reaches a stable release suitable for CI, or local-network testing otherwise becomes fast and deterministic enough to host an integration suite — at which point integration coverage could move off testnet (and possibly into CI).
