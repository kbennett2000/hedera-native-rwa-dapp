# Test Fixtures

These are hand-authored fixtures grounded in the real Hedera Mirror Node REST API
response shapes documented in docs/SPEC.md and docs/hcs-audit-schema.md.

They represent realistic but synthetic data — never real testnet state.
They can later be refreshed from real testnet captures (copy-paste the raw response
body text) without any structural changes, since the parsers accept the same shapes.

## Mirror Node fixture shapes

Verified against Mirror Node API v1 documentation:

- `token-info.json` — GET /api/v1/tokens/{id} full response with all keys present
- `token-info-null-keys.json` — same endpoint; wipe_key and pause_key are null
- `account-tokens-granted.json` — GET /api/v1/accounts/{id}/tokens; KYC GRANTED, UNFROZEN
- `account-tokens-revoked.json` — same endpoint; KYC REVOKED
- `account-tokens-frozen.json` — same endpoint; KYC GRANTED, FROZEN
- `account-tokens-not-applicable.json` — same endpoint; KYC NOT_APPLICABLE, UNFROZEN
- `account-tokens-empty.json` — same endpoint; empty tokens array
- `balances-bignum.json` — GET /api/v1/tokens/{id}/balances; balance > 2^53 (unquoted)
- `balances-empty.json` — same endpoint; empty balances array

## Important: read as TEXT

Always read fixtures with readFileSync(..., 'utf8') and pass the raw string to parsers.
Never `import` a fixture file — resolveJsonModule would JSON.parse it, destroying
large-integer precision (the very thing we are testing for).
