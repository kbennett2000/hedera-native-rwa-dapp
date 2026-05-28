# 0004. Use an HCS topic as the compliance audit trail

Date: 2026-05-28
Status: Accepted

## Context

A regulated RWA needs an ordered, tamper-evident record of compliance actions (who was KYC-approved, frozen, wiped, when). Part 1 expressed this as Solidity `event` logs, which live inside the contract, are ordered only per block, and require an indexer to query reliably.

Hedera provides the Consensus Service (HCS): a dedicated message stream with consensus-assigned ordering and timestamps, readable for free via the Mirror Node.

## Decision

Create one HCS topic per token. Every compliance action submits a structured JSON message (see [hcs-audit-schema.md](../hcs-audit-schema.md)) to that topic. The frontend renders the audit feed by reading the topic back through the Mirror Node, using the **consensus timestamp** as the canonical time.

## Alternatives considered

- **Solidity event logs (Part 1's approach)** — rejected. Requires an indexer, is not native, and couples the audit trail to a contract we are otherwise not deploying.
- **Off-chain database log** — rejected. Not tamper-evident and defeats the teaching point about native, verifiable audit rails.
- **Encode audit data into transaction/token memos** — rejected. Memos are too small and are not a queryable, ordered stream.

## Consequences

Easier: a consensus-ordered, timestamped, queryable audit trail as a first-class primitive, independent of the token's balance ledger — exactly what an auditor wants.

Harder: a second entity (the topic) to create and track in `deployments.json`; a message schema to version; and HCS single-message size limits to respect (handled by keeping messages small and capping free-text).

## Revisit if

Audit message volume or size needs exceed HCS single-message limits, requiring a chunking strategy or off-chain anchoring; or if regulatory requirements demand richer payloads that don't belong in a public topic.
