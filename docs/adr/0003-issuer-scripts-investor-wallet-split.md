# 0003. Issuer actions as SDK scripts; frontend wallet for investor actions only

Date: 2026-05-28
Status: Accepted

## Context

Native HTS transactions are not EVM transactions, so MetaMask (used in Part 1) cannot sign them; native signing requires a Hedera wallet via WalletConnect (e.g. HashPack). We need to decide where each kind of action runs and where wallet signing is actually required.

Two distinct actors exist: the **issuer** (creates the token, grants/revokes KYC, mints, freezes, wipes, pauses) and the **investor** (associates with the token, receives, transfers).

## Decision

- **Issuer/admin actions run as SDK scripts** under `src/scripts/`, signed with an operator key from `.env` — the same pattern as Part 1's `deploy.ts`. No browser wallet involved.
- **The frontend is investor-facing** and uses Hedera WalletConnect (HashPack) only for the two actions an investor must sign: **associate** and **transfer**.
- **All reads come from the Mirror Node** and require no wallet at all.

## Alternatives considered

- **Full admin UI with wallet-signed issuer operations** — rejected for v1. It roughly doubles frontend complexity and obscures the teaching path; the interesting native mechanics are clearer as discrete scripts. An admin UI is a reasonable post-v1 addition.
- **MetaMask for everything (as in Part 1)** — not possible; MetaMask cannot sign native HTS transactions.

## Consequences

Easier: a clean, legible teaching surface; the issuer flow is a sequence of inspectable scripts; the frontend stays small and focused on the investor journey.

Harder: issuer operations are CLI-only in v1 (no GUI for the asset issuer). Operator-key handling must be careful — the key lives in `.env`, which must never be committed.

## Revisit if

A target audience needs a no-CLI issuer experience, or the demo needs to show issuer actions being signed by a real wallet rather than an operator key.
