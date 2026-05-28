# Hedera-Native RWA DApp — Design Spec

**Status:** approved for v1 · **Audience:** contributors + Claude Code (cc) · **Type:** architecture explainer

This is the canonical intent document for the project. It describes *what* we're building and *why* the shape is the way it is. Step-by-step usage lives in the README (a guide), not here. Significant decisions are captured as ADRs in [`docs/adr/`](./adr/); this spec links to them rather than re-arguing them.

---

## 1. What we're building

Part 2 of a teaching series. [Part 1](https://github.com/kbennett2000/hedera-first-rwa-dapp) built a compliance-gated Real World Asset token by treating Hedera as "just an EVM chain" — a hand-rolled `ComplianceRegistry.sol`, an OpenZeppelin `_update` hook, viem/wagmi, MetaMask. This repo builds **the same product using Hedera's native services**, written as a deliberate contrast so a Part 1 reader constantly sees "the network does this for me."

The one-line hook: *in Part 1 you wrote a whole contract to reinvent a KYC gate; on Hedera, KYC is a native key on the token, and the consensus layer enforces it.*

See [ADR-0001](./adr/0001-use-native-hedera-services.md) for the native-over-EVM premise.

```
┌─────────────────────────────────────────────────────────────┐
│                 React Frontend (investor-facing)             │
│   Connect HashPack · Token Info · Associate+Status ·         │
│   Transfer · Compliance Status · Audit Trail (HCS feed)      │
└──────────┬─────────────────────────────────┬─────────────────┘
           │ WalletConnect (signing)          │ REST (reads, no wallet)
           ▼                                  ▼
┌────────────────────────┐        ┌──────────────────────────────┐
│  Hedera Consensus Nodes │        │     Hedera Mirror Node        │
│  (gRPC via @hashgraph/  │        │     (free REST history/state) │
│   sdk)                  │        │  /tokens /accounts /topics    │
│                         │        └──────────────────────────────┘
│  HTS token keys:        │
│   kyc·freeze·wipe·pause· │        ┌──────────────────────────────┐
│   supply·admin          │◄───────│  Issuer tooling (SDK scripts) │
│  HCS topic (audit log)  │◄───────│  create·grantKyc·mint·freeze· │
└────────────────────────┘        │  wipe·pause — each audited     │
                                   └──────────────────────────────┘
```

---

## 2. Key concepts (new since Part 1)

**Native compliance keys.** An HTS token is a network entity configured with optional keys, each unlocking a capability: `kycKey` (the whitelist — replaces the entire `ComplianceRegistry`), `freezeKey` (legal hold), `wipeKey` (clawback), `pauseKey` (emergency halt), `supplyKey` (mint), `adminKey` (key rotation). A token created with a `kycKey` defaults every account to KYC-revoked — native default-deny.

**Token association.** On Hedera an account must associate with a token before holding it. There is no EVM equivalent; this is the biggest new idea for a Part 1 reader. Flow: associate → issuer grants KYC → can receive.

**HCS audit trail.** The Hedera Consensus Service gives an ordered, timestamped, tamper-evident message stream. One topic per token; every compliance action submits a structured message. See [ADR-0004](./adr/0004-hcs-topic-as-audit-trail.md) and the [audit schema](./hcs-audit-schema.md).

**Mirror Nodes.** Free REST mirror of network state; no indexer needed. Token info, per-account KYC/freeze status, balances, and the audit feed are plain HTTP GETs.

**SDK + gRPC, not JSON-RPC relay.** We use `@hashgraph/sdk` over gRPC for writes and Mirror Node REST for reads. Account IDs are `0.0.x`, not `0x…`.

---

## 3. The Rosetta Stone — Part 1 → Part 2

The pedagogical centerpiece. Every Part 1 concept maps to a native equivalent.

| Part 1 (EVM)                                  | Part 2 (Hedera-native)                                    |
| --------------------------------------------- | --------------------------------------------------------- |
| `ComplianceRegistry.sol` whitelist mapping    | Token `kycKey` + `TokenGrantKyc` / `TokenRevokeKyc`       |
| `_update` hook reverts non-compliant transfer | Network rejects the transfer at consensus                 |
| Owner-only `mint`                             | `supplyKey` + `TokenMintTransaction`                      |
| *(no equivalent)*                             | **Token association** — associate before holding          |
| *(not in Part 1)*                             | Native **freeze** / **wipe** (clawback) / **pause**       |
| Solidity `event` logs                         | **HCS topic** messages (consensus-ordered audit trail)    |
| wagmi/viem `useReadContract`                  | **Mirror Node** REST                                      |
| MetaMask (EVM signing only)                   | **Hedera WalletConnect** → HashPack                       |
| Hardhat `deploy.ts`                           | SDK script `scripts/01-create-token.ts`                   |
| HashIO JSON-RPC relay                         | `@hashgraph/sdk` over gRPC + Mirror Node REST             |
| Custom errors / `unchecked` for gas           | USD-denominated, predictable fees (different cost model)  |

---

## 4. Architecture & module layout

The load-bearing decision is a **two-layer split** that keeps the bulk of behavior testable without a network. See [ADR-0002](./adr/0002-separate-pure-logic-from-sdk-execution.md).

```
src/
  core/                 ─── PURE LOGIC. No network. Unit-tested with fixtures. Fast.
    schema/             HCS audit message schema (Zod) + encode/decode/validate
    mirror/             Mirror Node response types + pure parsers
    compliance/         state derivation: Mirror payload → {kyc, frozen, paused, canReceive}
    tx/                 transaction-argument builders (produce params; do NOT execute)
  sdk/                  ─── THIN EXECUTION LAYER. Touches the network. Integration-tested on demand.
    client.ts           operator Client (Client.forTestnet().setOperator)
    mirrorClient.ts     HTTP wrapper around Mirror Node REST
    operations/         execute(): createToken, createTopic, grantKyc, revokeKyc,
                        mint, freeze, wipe, pause, submitAuditMessage
  scripts/              ─── ISSUER CLI ENTRYPOINTS. Compose core + sdk. Operator key from .env.
    01-create-token.ts · 02-create-audit-topic.ts · 03-grant-kyc.ts · …

frontend/               ─── React + TS + Vite. Investor-facing. WalletConnect for signing,
                            Mirror Node for reads. (Mirrors Part 1's frontend layout.)

contracts/              ─── OPTIONAL hybrid module (final cycle): HtsKycController.sol via 0x167.

test/
  unit/                 default `npm test` — pure-logic only, no network, target < 10s
  integration/          `npm run test:integration` — testnet, on demand, NOT in CI
```

**The rule that keeps this honest:** logic goes in `core/`; `sdk/` stays dumb enough that there's little to test beyond "did it call the SDK with the params `core/` produced." The more behavior lives in `core/`, the more of the repo is genuinely test-driven.

---

## 5. Testing strategy

Driven by `test-writer`'s hard rule (deterministic, no real network calls), the < 10s unit budget, and the reality that native ops are async network calls.

- **Unit (default loop).** Everything in `core/`: schema validation, Mirror Node parsing, compliance-state derivation, transaction-arg building. Fixtures are recorded Mirror Node JSON payloads. No network. This is where TDD happens and where `test-writer` does real work.
- **Integration (on demand).** A thin smoke suite against **Hedera testnet** (`npm run test:integration`), requiring a funded testnet operator account. Slow, costs testnet HBAR, not deterministic — so it is **out of CI** and out of the default loop. See [ADR-0005](./adr/0005-testnet-on-demand-for-integration-tests.md).
- **Manual verification.** Frontend (WalletConnect, associate, transfer) and full end-to-end flows. Per Engineering Principles, any task needing manual verification states exactly what to check.

**Local-network testing — important for docs.** The Hiero/Hedera Local Node is in a deprecation window (support ends September 2026; unpinned consensus-node setups began breaking around mid-May 2026), with **Solo** as the successor but still in active development. We deliberately do **not** wire Local Node into the harness or CI. The README and contributor docs must explain this deprecation and advise developers: prefer the zero-network unit tests for day-to-day work; use testnet on demand for integration; watch Solo as the future local-testing path. This is a required documentation item, not optional.

CI runs **unit tests only** — network stays out of CI by design.

---

## 6. Decisions locked for v1

- **Native-first.** Native HTS/HCS/Mirror Node/SDK, not Solidity (except the optional hybrid module). — [ADR-0001](./adr/0001-use-native-hedera-services.md)
- **Two-layer testability split.** `core/` (pure) vs `sdk/` (execution). — [ADR-0002](./adr/0002-separate-pure-logic-from-sdk-execution.md)
- **Wallet split.** Issuer/admin = SDK scripts (operator key). Frontend wallet (HashPack/WalletConnect) only for investor associate + transfer. Reads need no wallet. — [ADR-0003](./adr/0003-issuer-scripts-investor-wallet-split.md)
- **Audit trail = HCS topic.** Structured JSON messages per compliance action. — [ADR-0004](./adr/0004-hcs-topic-as-audit-trail.md)
- **Integration = testnet on demand.** Not Local Node, not Solo (yet), not CI. — [ADR-0005](./adr/0005-testnet-on-demand-for-integration-tests.md)
- **Fungible token** (`TokenType.FungibleCommon`) for fractional ownership. NFT variant deferred.
- **No `complianceEnabled` toggle.** Compliance is structural (the token has a `kycKey` or it doesn't); "disabling" is a deliberate, auditable key rotation.

---

## 7. Out of scope for v1

- Admin/issuer UI (issuer ops are CLI scripts for v1).
- NFT (unique-asset) RWA variant.
- Secondary market / DEX / order book.
- Primary issuance lifecycle (subscription, caps, lockups, vesting).
- ERC-3643 / T-REX modular compliance.
- Mainnet deployment guidance.
- Solo-based local network testing (revisit when Solo stabilizes).

---

## 8. Going Further (post-v1 ideas)

Custom HTS fees for a marketplace cut · scheduled transactions for multi-party signing (the native "multi-sig") · OFAC / deny-list configuration · NFT variant for deeds and unique assets · atomic swaps (DvP) against a stablecoin · pointers to Guardian and the Asset Tokenization Studio for production paths.

---

*Part 2 of the Hedera RWA series · Native services with `@hashgraph/sdk` · Frontend with Vite + Hedera WalletConnect · MIT*
