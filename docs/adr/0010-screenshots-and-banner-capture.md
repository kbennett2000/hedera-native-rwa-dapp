# 0010. Screenshots via demo mode; hero banner as SVG source + PNG

Date: 2026-05-29
Status: Accepted

## Context

The v1 README needs to "stand out" with a hero banner and real-looking screenshots of the
investor dApp, including the payoff shot: a **transfer blocked by the network** because the
recipient isn't KYC-approved. Two capture problems:

1. **Read-only panels** (token info, compliance status, audit feed) are Mirror-driven and
   need no wallet — straightforward to capture against real testnet state.
2. **Wallet-gated views** (connected header, associate, transfer form, pending, and the
   blocked-transfer message) require a connected HashPack wallet. HashPack is a browser
   extension; Playwright automation of a real extension is brittle, slow, and hard to
   reproduce — a poor fit for a teaching repo that must stay easy to regenerate.

Also: GitHub renders a referenced `.svg` via `<img>`, but font availability and some SVG
features vary across GitHub's sanitizer; a PNG renders identically everywhere.

## Decision

- **Wallet-gated shots use a dev-only demo mode**, gated on `import.meta.env.VITE_DEMO === '1'`.
  In demo mode the `WalletProvider` supplies a stub account id (`VITE_DEMO_ACCOUNT_ID`) and a
  sentinel signer, and the two action modules take a clearly-marked dev-only branch returning
  canned outcomes — the blocked transfer returns the **real** network status
  `ACCOUNT_KYC_NOT_GRANTED_FOR_TOKEN`. **Mirror reads stay real** (the demo account should be a
  real testnet account), so on-chain state shown is genuine. The branch is unreachable without
  the flag and never ships in a normal build.
- **Read-only shots are captured against real testnet token/topic state** (no wallet).
- **Capture is automated with Playwright** as a frontend dev tool (`npm run screenshots`,
  fixed viewport, dark theme → `docs/images/*.png`), regenerable, and **not in CI**.
- **The banner is committed as `banner.svg` (editable source) and `banner.png` (used in the
  README)**. PNG is the reliable on-GitHub render; the SVG stays the source of truth.
- **Honesty rule.** Captions state plainly when a shot is the app's demo mode, and that the
  rejection code is the real network status verified on testnet. Real reads may be staged for
  a shot; fabricated on-chain balances must never be presented as real. Testnet `0.0.x` ids
  are not secret (ADR-0007); confirm no keys/secrets appear in any image.

## Alternatives considered

- **Unpacked-extension Playwright automation of real HashPack** — rejected. Brittle, slow,
  needs a funded account + the extension wired into the harness; high maintenance, low repro.
- **Manual capture only** — viable and fully real, but not regenerable; kept as a fallback for
  anyone who wants the truly-real wallet flow.
- **Inline `<svg>` banner in the README** — rejected; GitHub strips inline SVG in markdown.
  A referenced `.svg` works but with font/rendering variance, so PNG is the README target.

## Consequences

Easier: every shot is scriptable and regenerable; the payoff blocked-transfer shot is
capturable without a flaky extension; the banner renders identically everywhere.

Harder: a small, clearly-fenced dev-only code path exists in the frontend (the demo branch);
captions must carry the honesty note; the screenshot run needs a live deployment (so capture
is done on a machine that has `deployments.json` + the demo account, not in CI).

## Revisit if

A reliable headless wallet emerges (capture the real signed flow end-to-end), or the demo
branch starts drifting from real behavior (then prefer manual real capture).
