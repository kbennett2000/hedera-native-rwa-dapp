# 0008. Frontend wallet integration: hedera-wallet-connect 1.x + single @hashgraph/sdk

Date: 2026-05-29
Status: Accepted

## Context

The investor frontend (Cycle 3) must sign two native HTS transactions — token
**associate** and **transfer** — through a Hedera wallet. MetaMask cannot sign native
transactions (ADR-0001), so we use Hedera WalletConnect → HashPack.

The ecosystem has forked. `@hashgraph/hedera-wallet-connect@2.x` migrated its peer
dependencies to `@hiero-ledger/sdk` (the Linux-Foundation-renamed SDK) and `@reown/appkit`.
Our `core/` and `sdk/` are pinned to `@hashgraph/sdk ^2.81.0` (frozen). Pulling a _second_
SDK into the browser would mean two distinct `Transaction` classes (no shared `instanceof`),
forcing base64-RPC marshalling to cross the boundary — extra moving parts for a teaching repo
whose product is legibility.

The latest 1.x (`^1.3.4`, which resolves to **1.5.1**) still peer-depends on
`@hashgraph/sdk ^2.40.0`. **Verified against the live registry and a real install:** with our
`^2.81.0`, npm dedupes to a single `@hashgraph/sdk@2.81.0` (the wallet lib's copy collapses to
ours), no unmet/invalid peers. The 1.x line exposes `DAppConnector` (`init`, `openModal`,
`disconnect`, `getSigner`, `signers[]`) and `DAppSigner`, which implements the `@hashgraph/sdk`
`Signer` interface — so `tx.freezeWithSigner(signer)` / `tx.executeWithSigner(signer)` /
`resp.getReceiptWithSigner(signer)` work directly with transactions our code builds.

## Decision

Use **`@hashgraph/hedera-wallet-connect@^1.3.4`** (`DAppConnector` + `DAppSigner`) with the
single, repo-wide **`@hashgraph/sdk`**. Associate/transfer are built with `@hashgraph/sdk`
transactions and signed via `signer.executeWithSigner` — one SDK, one `Transaction` type, the
most legible signing path. Investor argument validation lives in `core/` as additive builders
(`buildAssociateArgs` / `buildTransferArgs`); the frontend signs/submits the validated data.

## Alternatives considered

- **`@hashgraph/hedera-wallet-connect@2.x` + `@reown/appkit` + `@hiero-ledger/sdk`** — rejected
  for v1. Current/maintained, but introduces a second SDK in the browser (type friction vs the
  frozen `@hashgraph/sdk` core), base64-RPC marshalling, and a heavier AppKit modal stack.
- **A different Hedera wallet SDK** — rejected; WalletConnect/HashPack is the standard native
  path and what the SPEC names.

## Consequences

Easier: one SDK end-to-end; `executeWithSigner` is a clean, teachable signing path; no
cross-SDK serialization.

Harder / accepted risks:

- The 1.x line is **working but not actively developed** (2.x/Reown is upstream's direction).
- It carries **deprecated WalletConnect v1 transitive deps**; `npm audit` reports several
  high/critical advisories in that subtree. Acceptable for a **testnet teaching app** with no
  custody of mainnet value; recorded so it is a conscious choice, not an oversight.
- The package uses directory imports that **raw Node ESM rejects** (`ERR_UNSUPPORTED_DIR_IMPORT`)
  but Vite/Rollup resolve. Therefore wallet-lib imports must stay in **browser-bundled modules
  only** — never imported by the node-environment vitest suite (the pure view-logic tests do not
  import it).

## Revisit if

The 1.x line stops resolving against our pinned `@hashgraph/sdk`, HashPack drops 1.x support,
the security posture of the 1.x dependency tree becomes unacceptable, or we target mainnet —
at which point migrate to `@reown/appkit` + `@hiero-ledger/sdk` (and reconcile the SDK rename
across `core/`/`sdk/`).
