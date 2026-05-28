# HCS Audit Message Schema

**Status:** approved for v1 · **Type:** reference (a contract between components)

Every compliance action submits one structured message to the token's HCS audit topic. The frontend reads these back via the Mirror Node to render the audit feed. This document is the single source of truth for that message format. The schema lives in code at `src/core/schema/` (Zod) and is unit-tested; this doc and that schema must not drift (the `doc-auditor` agent will check).

See [ADR-0004](./adr/0004-hcs-topic-as-audit-trail.md) for why HCS is the audit trail.

---

## Envelope

Every message is a UTF-8 JSON object with this envelope. The Mirror Node returns the message base64-encoded under `/api/v1/topics/{topicId}/messages`; consumers base64-decode, then `JSON.parse`, then validate against the schema before trusting any field.

```jsonc
{
  "v": 1,                       // schema version (integer). Bump on breaking change.
  "type": "KYC_GRANTED",        // event type — see table below
  "tokenId": "0.0.123456",      // the token this action concerns
  "ts": "2026-05-28T14:32:00Z", // ISO-8601 UTC; issuer-asserted action time
  "actor": "0.0.1001",          // account that performed the action (the issuer/operator)
  "subject": "0.0.2002",        // account the action targets (optional; see per-type table)
  "amount": "1000",             // string integer in base units (optional; mint/wipe only)
  "note": "Q2 onboarding batch" // optional free-text, <= 120 chars
}
```

> **Why `ts` is issuer-asserted, not authoritative:** the trustworthy ordering and timestamp come from HCS consensus (`consensus_timestamp` on the Mirror Node record), not from this field. `ts` is a convenience/cross-check. The frontend displays the **consensus timestamp** as the canonical time and may surface a mismatch with `ts` as a (low-severity) integrity signal.

> **Why amounts are strings:** token amounts can exceed JS safe-integer range. Always string-encode integer base-unit amounts; never use JS `number` for balances.

---

## Event types

| `type`           | `subject` | `amount` | Emitted by                  |
| ---------------- | --------- | -------- | --------------------------- |
| `TOKEN_CREATED`  | —         | —        | `01-create-token`           |
| `TOPIC_CREATED`  | —         | —        | `02-create-audit-topic`     |
| `KYC_GRANTED`    | required  | —        | `03-grant-kyc`              |
| `KYC_REVOKED`    | required  | —        | `04-revoke-kyc`             |
| `MINTED`         | optional¹ | required | `05-mint`                   |
| `FROZEN`         | required  | —        | `06-freeze`                 |
| `UNFROZEN`       | required  | —        | `06-freeze` (unfreeze path) |
| `WIPED`          | required  | required | `07-wipe`                   |
| `PAUSED`         | —         | —        | `08-pause`                  |
| `UNPAUSED`       | —         | —        | `08-pause` (unpause path)   |

¹ `MINTED` `subject` is the recipient when minting directly to an account; omit when minting to treasury.

---

## Rules

- **Validate on read.** Treat topic contents as untrusted input. A message that fails schema validation is surfaced as a malformed-entry row in the feed, never silently dropped or trusted.
- **Forward compatibility.** Unknown `type` values from a newer `v` are displayed as a generic "unrecognized event" row rather than erroring the whole feed. Add new event types at the end; never repurpose an existing one.
- **Size.** Keep messages small (well under HCS single-message limits). The `note` cap exists to prevent chunking; if richer payloads are ever needed, that's a schema-version bump and an ADR, not an ad-hoc field.
- **No PII.** Never put names, emails, document numbers, or KYC evidence in a message. The audit trail records *that* an account was approved/frozen/etc., not the underlying identity data. Account IDs only.
- **Versioning.** `v` is an integer. A breaking change (renamed/removed field, changed meaning) increments `v` and requires updating both the Zod schema and this doc in the same change, plus a note in the relevant ADR.

---

## Encode / decode contract (for `src/core/schema/`)

```ts
// Shape only — real implementation is Zod, unit-tested against fixtures.
type AuditMessage = {
  v: 1;
  type: AuditEventType;
  tokenId: string;
  ts: string;
  actor: string;
  subject?: string;
  amount?: string;
  note?: string;
};

encodeAuditMessage(msg: AuditMessage): string   // validate → JSON string for TopicMessageSubmit
decodeAuditMessage(raw: string): Result<AuditMessage>  // base64-decoded JSON → validated | malformed
```

Both functions are pure and live in `core/` — no network, fully unit-tested. The `sdk/` layer only takes the encoded string and submits it.
