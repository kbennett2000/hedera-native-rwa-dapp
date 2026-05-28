# 0001. Use native Hedera services instead of EVM/Solidity for compliance

Date: 2026-05-28
Status: Accepted

## Context

Part 1 of this series (`hedera-first-rwa-dapp`) built a compliance-gated RWA token by treating Hedera as a generic EVM chain: a hand-written `ComplianceRegistry.sol`, an OpenZeppelin `_update` hook to gate transfers, viem/wagmi, and MetaMask. That approach is a great on-ramp for Solidity developers but never touches the services that distinguish Hedera.

This repo (Part 2) exists to teach the native approach. Native HTS provides consensus-level compliance keys (KYC, freeze, wipe, pause, supply, admin) directly on the token; HCS provides an ordered audit stream; Mirror Nodes provide free queryable history.

## Decision

Implement the RWA compliance token using native Hedera services — HTS token keys, HCS, Mirror Node, and `@hashgraph/sdk` — rather than Solidity contracts. A Solidity path is preserved only as an optional, clearly-separated hybrid module (driving HTS from a contract via the `0x167` system contract).

## Alternatives considered

- **Reuse Part 1's EVM approach** — rejected. It duplicates an existing repo and defeats the entire teaching purpose of contrasting the two models.
- **Pure SDK with no Solidity at all, including the hybrid bridge** — rejected for completeness, but the hybrid bridge is demoted to an optional final module so it doesn't bloat the core.

## Consequences

Easier: far less code, native compliance with no per-transfer cross-contract call, capabilities (freeze/wipe/pause) that Part 1 lacked, free Mirror Node reads instead of an indexer.

Harder: a new wallet story (MetaMask cannot sign native transactions; the frontend needs a Hedera wallet via WalletConnect), a new concept to teach (token association), and a learning curve on the SDK and account-ID model.

## Revisit if

A target use case needs arbitrary custom transfer logic that cannot be expressed through native HTS keys, or maximal EVM-tooling portability becomes a hard requirement — in which case Part 1's contract-based model is the better fit.
