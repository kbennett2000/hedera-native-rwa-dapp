# Screenshot capture fixtures

Simulated Mirror Node response bodies served by `scripts/screenshots.mjs` via
Playwright route interception (ADR-0010, amended) — no live deployment backs the
README screenshots. `topic-messages.json` stores each audit payload as readable
JSON under `payload`; the capture script (and the guard test) base64-encode it
into the `message` wire field at use time.

Schema-validated by `test/unit/screenshot-fixtures.test.ts` against the same
core Zod schemas the app applies on read — if a parser or the audit schema
changes, that test fails before a capture can silently render an error state.
