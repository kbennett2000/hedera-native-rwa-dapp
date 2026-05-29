# 0006. Parse Mirror Node amounts bigint-safe, in `core/`

Date: 2026-05-29
Status: Accepted

## Context

CLAUDE.md mandates that token amounts are **strings** in base units, never JS `number`,
because base-unit balances can exceed the JS safe-integer range (2^53 − 1). The Mirror Node
REST API does not cooperate uniformly with this rule:

- On `GET /api/v1/tokens/{id}` (token info), `total_supply` / `initial_supply` / `max_supply`
  come back as **quoted JSON strings**.
- On `GET /api/v1/tokens/{id}/balances` and `GET /api/v1/accounts/{id}/tokens`, `balance` comes
  back as an **unquoted JSON number** (int64).

The hazard: `JSON.parse` coerces an unquoted number through an IEEE-754 double **before any of
our code runs**. A balance of `9007199254740993` silently becomes `9007199254740992`. By the
time a Zod schema or a parser sees the object, the precision is already gone — validation cannot
recover it. Verified live: `JSON.parse('{"b":9007199254740993}').b === 9007199254740992`.

This raised two coupled questions: (1) _where_ does the raw-text → object parse live — `core/`
(pure) or `sdk/` (execution)? and (2) _how_ do we preserve the exact digits?

ADR-0002 already answers (1) in principle: logic belongs in `core/`; `sdk/` stays thin and is
out of the fast unit loop. The raw-text → object parse is the single highest-risk piece of
logic in the read path. Putting it in `sdk/` would push the part most likely to silently
corrupt data into the layer with the least test coverage — the exact inversion ADR-0002 exists
to prevent.

## Decision

**The Mirror Node parse lives in `core/`, takes the raw response _text_, and preserves amount
fields as exact strings — never coercing an amount through a double.**

- `core/mirror/json.ts` exposes `parseJsonBigintSafe(text, amountKeys)`. It uses
  `JSON.parse(text, reviver)` and the reviver's **source-text access** third argument
  (`context.source`, the original numeric literal) to capture designated amount keys
  (`total_supply`, `initial_supply`, `max_supply`, `balance`) as their exact unquoted source
  string. Fields already serialized as strings pass through unchanged; non-amount numbers
  (e.g. `decimals`, a small safe integer) parse normally.
- `core/` Zod schemas **reject `number`** for amount fields — amounts are strings only.
- A one-time support probe makes an unsupported runtime **throw loudly** ("Node ≥ 22 required")
  rather than silently fall back to lossy parsing. Silent precision loss is the failure mode we
  are eliminating; a hard error is strictly better than a wrong balance.
- `engines.node` is raised to `>= 22` (the repo already pins `.nvmrc` to 22). Source-text access
  shipped in V8 12.1 / Node 21.7+; Node 22 LTS has it.

This defines the contract `sdk/` must honor next cycle: never `JSON.parse` a Mirror Node body
directly — always `fetch(...).text()` → the `core/` parser.

## Alternatives considered

- **String-only Zod schema, parse left in `sdk/` (or to default `JSON.parse`)** — rejected.
  Validating that amounts are strings does nothing if `JSON.parse` already truncated the number
  upstream. The schema would faithfully validate a corrupted value. It also strands the
  riskiest logic in the untested layer.
- **`BigInt` end-to-end** — rejected. CLAUDE.md fixes the wire/representation type as `string`;
  `BigInt` doesn't `JSON.stringify`, complicates Zod and the audit schema, and buys nothing over
  exact strings for a value we only store, display, and pass back to the SDK.
- **A third-party lossless JSON parser (`lossless-json` / `json-bigint`)** — viable and portable
  to Node ≥ 18, but adds a dependency to do what the platform now does natively. Kept on the
  shelf as the fallback if we ever need to lower the Node floor below 21.7.
- **Regex-quote amount fields before `JSON.parse`** — rejected. Fragile (can match inside string
  values), and a teaching repo should not model that.

## Consequences

Easier: balances of any size survive parsing exactly; the precision-critical logic is pure,
fast, and unit-tested in the default loop (a fixture with `balance > 2^53` asserts the digit
string is preserved). `sdk/` stays trivially thin — fetch text, hand to `core/`.

Harder: the Node floor rises to 22, diverging from the previous `>= 18` `engines` value (the
build/CI already run 22). The "amount key" set is hand-maintained; a new amount-bearing Mirror
field must be added to `amountKeys` or it will parse lossily — covered by review and by schema
tests on each parsed shape.

## Revisit if

We need to support Node < 21.7 (swap to `lossless-json`), or the Mirror Node changes amount
serialization such that the `amountKeys` approach no longer covers every large-integer field.
