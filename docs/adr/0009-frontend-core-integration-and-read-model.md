# 0009. Frontend ↔ core integration and the Mirror read/refresh model

Date: 2026-05-29
Status: Accepted

## Context

The investor frontend must reuse `core/` for ALL parsing, validation, compliance derivation,
and audit decode (ADR-0002) — it defines none of that itself. Three integration realities
shape how:

1. `core/` source uses NodeNext `.js` import specifiers (e.g. `./result.js`). Vite cannot
   resolve those against the `.ts` source without a bespoke resolver.
2. `core/mirror/parse.ts` decodes base64 topic messages with Node's `Buffer`, and
   `core/log.ts` references `process` — both absent in the browser. (`log` only touches
   `process` at call-time, so importing is safe; the frontend simply never calls it.)
3. `core/mirror/json.ts` relies on `JSON.parse` source-text access (the bigint-safe reviver,
   ADR-0006), which evergreen browsers have shipped since ~2024.

Separately, the Mirror Node reflects consensus state only **after a short propagation delay**,
so the UI must never assume a read immediately reflects a just-signed action.

## Decision

**Consumption.** The frontend imports the **built artifact** `../dist/core` through a stable
`@core` alias (and reuses the canonical Mirror read layer via `@sdkMirror` →
`../dist/sdk/mirrorClient.js`, the specific module, not the `sdk` barrel, to avoid bundling the
issuer operations). `predev`/`prebuild` scripts run the root `npm run build` so a fresh clone's
`npm run dev` cannot hit a stale or missing `dist`. This is the same "core is a reusable
library" model the issuer scripts use — no custom Vite resolver to maintain (restraint:
hot-reloading core edits buys nothing when core is frozen).

**Browser shims.** A `Buffer` polyfill is installed in `main.tsx`
(`import { Buffer } from 'buffer'; globalThis.Buffer ??= Buffer`) before render, so
`parseTopicMessages` works in the browser. The README documents a modern-evergreen-browser
requirement for the source-text-access `JSON.parse` (the bigint-safe parser throws loudly
rather than silently truncating on an unsupported engine).

**Read/refresh + lag model.** A `useMirrorResource` hook exposes `{data, loading, error,
refetch}` with optional interval polling, and every panel has a manual **Refresh**. After a
signed action the affected panel shows a **pending** affordance and runs a **bounded
post-action poll** (~2.5s interval, ~30s cap) until the expected change appears (association
present / balance changed), then settles. The audit feed polls (~8s) and is manually
refreshable. A persistent UI note explains that Mirror reflects network state a few seconds
after a transaction.

## Alternatives considered

- **Vite alias to `core/` TS source + a `.js`→`.ts` resolver** — rejected; bespoke Vite
  machinery for hot-reload we don't need on a frozen package.
- **Re-implement Mirror fetch in the frontend** — rejected; `sdk/mirrorClient` is the tested,
  browser-safe `fetch().text()` → core-parser layer. Reuse it.
- **Optimistic UI without polling** — rejected; it would lie about consensus state during the
  Mirror lag. The pending affordance + bounded poll tells the truth.

## Consequences

Easier: zero duplication of parsing/compliance logic; honest, observable read state; a clean
library-consumption story.

Harder: a build step precedes frontend dev (automated via `predev`); the `@core` artifact must
be rebuilt if `core/` ever changes; the lag model adds polling code (kept in hooks, not in the
pure view layer).

## Revisit if

`core/` is repackaged as a published workspace package (drop the dist-path alias), Vite gains
first-class NodeNext `.js`→`.ts` resolution, or Mirror Node adds a push/subscription read path
that replaces polling.
