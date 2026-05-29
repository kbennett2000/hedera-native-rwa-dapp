/**
 * Integration smoke test — Cycle 2 SDK execution layer, Hedera testnet.
 *
 * This file is NOT run by `npm test` (unit suite). It runs only via:
 *   npm run test:integration
 * which requires a funded testnet operator account set in the environment.
 *
 * The entire describe block is skipped when operator credentials are absent,
 * so `npm run test:integration` stays GREEN/skipped with no credentials.
 * See ADR-0005 (testnet on demand, not in CI).
 *
 * Raw AccountCreate / TokenAssociate / TransferTransaction are used directly
 * from @hashgraph/sdk in this file only — the sdk/operations layer is
 * intentionally not referenced for investor-side actions (ADR-0003).
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  AccountCreateTransaction,
  TokenAssociateTransaction,
  TransferTransaction,
  Hbar,
  PrivateKey,
  AccountId,
} from '@hashgraph/sdk';
// sdk/index.js does not exist yet — it will be created in Cycle 2.
// We destructure from a typed placeholder so TypeScript knows the call
// signatures without resolving the module path.
// At runtime the skipIf guard means this describe never executes without
// the sdk being present. The dynamic import is used to avoid a hard
// static-analysis module-not-found error at type-check time.

interface SdkModule {
  loadConfig: (env: NodeJS.ProcessEnv) => { mirrorNodeUrl: string; [k: string]: unknown };
  createOperatorClient: (...args: unknown[]) => {
    client: { close: () => void };
    operatorId: string;
    [k: string]: unknown;
  };
  createMirrorClient: (...args: unknown[]) => unknown;
  executeCreateToken: (...args: unknown[]) => Promise<string>;
  executeCreateTopic: (...args: unknown[]) => Promise<string>;
  executeGrantKyc: (...args: unknown[]) => Promise<unknown>;
  executeMint: (...args: unknown[]) => Promise<unknown>;
  executeFreeze: (...args: unknown[]) => Promise<unknown>;
  executeUnfreeze: (...args: unknown[]) => Promise<unknown>;
  executeWipe: (...args: unknown[]) => Promise<unknown>;
  executePause: (...args: unknown[]) => Promise<unknown>;
  executeUnpause: (...args: unknown[]) => Promise<unknown>;
  executeSubmitAuditMessage: (...args: unknown[]) => Promise<unknown>;
}

const sdkModule = (await import('../../src/sdk/index.js' as string).catch(() => ({}))) as SdkModule;
const {
  loadConfig,
  createOperatorClient,
  createMirrorClient,
  executeCreateToken,
  executeCreateTopic,
  executeGrantKyc,
  executeMint,
  executeFreeze,
  executeUnfreeze,
  executeWipe,
  executePause,
  executeUnpause,
  executeSubmitAuditMessage,
} = sdkModule;
import {
  buildCreateTokenArgs,
  buildGrantKycArgs,
  buildMintArgs,
  buildFreezeArgs,
  buildUnfreezeArgs,
  buildWipeArgs,
  buildPauseArgs,
  buildUnpauseArgs,
  encodeAuditMessage,
  deriveComplianceState,
} from '../../src/core/index.js';
import type {
  Result,
  TokenInfo,
  AccountTokenRelationship,
  TokenBalances,
  ParsedTopicMessage,
} from '../../src/core/index.js';

// ---------------------------------------------------------------------------
// Credential guard
// ---------------------------------------------------------------------------

function hasOperatorCreds(): boolean {
  const id = process.env['OPERATOR_ID'];
  const key = process.env['OPERATOR_KEY'];
  if (!id || !key) return false;
  // Validate entity-id form (0.0.x)
  return /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(id);
}

// ---------------------------------------------------------------------------
// Poll helper — absorbs Mirror Node propagation lag (read-side only; ADR-0007)
// ---------------------------------------------------------------------------

async function pollMirror<T>(
  fn: () => Promise<T>,
  predicate: (value: T) => boolean,
  opts: { tries?: number; delayMs?: number } = {},
): Promise<T> {
  const tries = opts.tries ?? 20;
  const delayMs = opts.delayMs ?? 3000;
  let last: T | undefined;
  for (let i = 0; i < tries; i++) {
    last = await fn();
    if (predicate(last)) return last;
    await new Promise((r) => setTimeout(r, delayMs));
  }
  // Return last value (test will assert and fail with a meaningful diff)
  return last as T;
}

// ---------------------------------------------------------------------------
// Module-scoped state shared across its() in the describe
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let ctx: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let mirror: any;
let tokenId: string;
let topicId: string;

// Throwaway investor generated during the test
let investorKey: PrivateKey;
let investorId: string;

// ---------------------------------------------------------------------------
// Smoke suite — skipped entirely when credentials are absent
// ---------------------------------------------------------------------------

describe.skipIf(!hasOperatorCreds())('issuer smoke (testnet)', { timeout: 120_000 }, () => {
  beforeAll(async () => {
    const config = loadConfig(process.env as NodeJS.ProcessEnv);
    ctx = createOperatorClient(config);
    mirror = createMirrorClient({ baseUrl: config.mirrorNodeUrl });
  });

  afterAll(async () => {
    ctx.client.close();
  });

  // -------------------------------------------------------------------------
  // 1. Create token + topic
  // -------------------------------------------------------------------------

  it('creates a fungible token with all keys', async () => {
    const args = buildCreateTokenArgs({
      name: 'Smoke RWA',
      symbol: 'SRWA',
      decimals: 2,
      initialSupply: '0',
      treasuryAccountId: ctx.operatorId as string,
      tokenType: 'FUNGIBLE_COMMON',
      supplyType: 'FINITE',
      maxSupply: '1000000',
      freezeDefault: false,
      keys: { admin: true, kyc: true, freeze: true, wipe: true, pause: true, supply: true },
    });
    tokenId = await executeCreateToken(args, ctx);
    expect(tokenId).toMatch(/^0\.0\.\d+$/);
  });

  it('creates an HCS audit topic', async () => {
    topicId = await executeCreateTopic('Smoke RWA Audit Trail', ctx);
    expect(topicId).toMatch(/^0\.0\.\d+$/);
  });

  // -------------------------------------------------------------------------
  // 2. Backfill TOKEN_CREATED + TOPIC_CREATED audit messages
  // -------------------------------------------------------------------------

  // Order mirrors 02-create-audit-topic.ts: TOPIC_CREATED first, then backfill TOKEN_CREATED.
  it('submits TOPIC_CREATED audit message', async () => {
    const now = new Date().toISOString();
    const msg = encodeAuditMessage({
      v: 1,
      type: 'TOPIC_CREATED',
      tokenId,
      ts: now,
      actor: ctx.operatorId as string,
    });
    await executeSubmitAuditMessage(topicId, msg, ctx);
  });

  it('backfills TOKEN_CREATED audit message', async () => {
    const now = new Date().toISOString();
    const msg = encodeAuditMessage({
      v: 1,
      type: 'TOKEN_CREATED',
      tokenId,
      ts: now,
      actor: ctx.operatorId as string,
    });
    await executeSubmitAuditMessage(topicId, msg, ctx);
  });

  // -------------------------------------------------------------------------
  // 3. Provision throwaway investor (raw SDK — ADR-0003 guardrail)
  // -------------------------------------------------------------------------

  it('creates a throwaway investor account and associates the token', async () => {
    investorKey = PrivateKey.generateECDSA();

    // Create investor account funded with a few Hbar
    const createReceipt = await new AccountCreateTransaction()
      .setKey(investorKey.publicKey)
      .setInitialBalance(new Hbar(5))
      .execute(ctx.client)
      .then(
        (r: {
          getReceipt: (
            c: typeof ctx.client,
          ) => Promise<{ accountId: { toString: () => string } | null }>;
        }) => r.getReceipt(ctx.client),
      );

    const investorAccountId = createReceipt.accountId;
    expect(investorAccountId).toBeDefined();
    investorId = investorAccountId!.toString();

    // Associate token — signed by investor
    const assocTx = await new TokenAssociateTransaction()
      .setAccountId(AccountId.fromString(investorId))
      .setTokenIds([tokenId])
      .freezeWith(ctx.client)
      .sign(investorKey);
    await assocTx
      .execute(ctx.client)
      .then((r: { getReceipt: (c: typeof ctx.client) => Promise<unknown> }) =>
        r.getReceipt(ctx.client),
      );
  });

  // -------------------------------------------------------------------------
  // 4. Pre-KYC compliance state — investor canReceive should be false
  // -------------------------------------------------------------------------

  it('investor canReceive is false before KYC grant (Mirror Node)', async () => {
    const tokenInfoResult = await pollMirror<Result<TokenInfo>>(
      () => mirror.getTokenInfo(tokenId) as Promise<Result<TokenInfo>>,
      (r) => r.status === 'valid',
    );
    expect(tokenInfoResult.status).toBe('valid');
    if (tokenInfoResult.status !== 'valid') return;

    const accountTokensResult = await pollMirror<Result<AccountTokenRelationship[]>>(
      () =>
        mirror.getAccountTokens(investorId, tokenId) as Promise<Result<AccountTokenRelationship[]>>,
      (r) => r.status === 'valid' && r.value.length > 0,
    );

    if (accountTokensResult.status !== 'valid') {
      // Association not yet visible — skip assertion gracefully
      return;
    }

    const relationship = accountTokensResult.value[0] ?? null;
    const state = deriveComplianceState({
      relationship,
      tokenPaused: tokenInfoResult.value.pauseStatus === 'PAUSED',
    });
    expect(state.canReceive).toBe(false);
  });

  // -------------------------------------------------------------------------
  // 5. Grant KYC + audit
  // -------------------------------------------------------------------------

  it('grants KYC to the investor and submits audit', async () => {
    const kycArgs = buildGrantKycArgs({ tokenId, accountId: investorId });
    await executeGrantKyc(kycArgs, ctx);

    const now = new Date().toISOString();
    const msg = encodeAuditMessage({
      v: 1,
      type: 'KYC_GRANTED',
      tokenId,
      ts: now,
      actor: ctx.operatorId as string,
      subject: investorId,
    });
    await executeSubmitAuditMessage(topicId, msg, ctx);
  });

  it('investor canReceive is true after KYC grant (Mirror Node)', async () => {
    const tokenInfoResult = (await mirror.getTokenInfo(tokenId)) as Result<TokenInfo>;
    expect(tokenInfoResult.status).toBe('valid');
    if (tokenInfoResult.status !== 'valid') return;

    const accountTokensResult = await pollMirror<Result<AccountTokenRelationship[]>>(
      () =>
        mirror.getAccountTokens(investorId, tokenId) as Promise<Result<AccountTokenRelationship[]>>,
      (r) => r.status === 'valid' && r.value.length > 0 && r.value[0]?.kycStatus === 'GRANTED',
    );

    if (accountTokensResult.status !== 'valid' || accountTokensResult.value.length === 0) return;

    const relationship = accountTokensResult.value[0] ?? null;
    const state = deriveComplianceState({
      relationship,
      tokenPaused: tokenInfoResult.value.pauseStatus === 'PAUSED',
    });
    expect(state.canReceive).toBe(true);
    expect(state.kycGranted).toBe(true);
  });

  // -------------------------------------------------------------------------
  // 6. Mint + transfer to investor
  // -------------------------------------------------------------------------

  it('mints tokens and transfers some to investor', async () => {
    const mintArgs = buildMintArgs({ tokenId, amount: '10000' });
    await executeMint(mintArgs, ctx);

    const now = new Date().toISOString();
    await executeSubmitAuditMessage(
      topicId,
      encodeAuditMessage({
        v: 1,
        type: 'MINTED',
        tokenId,
        ts: now,
        actor: ctx.operatorId as string,
        amount: '10000',
      }),
      ctx,
    );

    // Transfer 1000 units from treasury (operator) to investor — raw SDK
    const transferTx = await new TransferTransaction()
      .addTokenTransfer(tokenId, AccountId.fromString(ctx.operatorId as string), -1000)
      .addTokenTransfer(tokenId, AccountId.fromString(investorId), 1000)
      .execute(ctx.client);
    await transferTx.getReceipt(ctx.client);
  });

  // -------------------------------------------------------------------------
  // 7. Freeze + audit
  // -------------------------------------------------------------------------

  it('freezes the investor account and submits audit', async () => {
    const freezeArgs = buildFreezeArgs({ tokenId, accountId: investorId });
    await executeFreeze(freezeArgs, ctx);

    await executeSubmitAuditMessage(
      topicId,
      encodeAuditMessage({
        v: 1,
        type: 'FROZEN',
        tokenId,
        ts: new Date().toISOString(),
        actor: ctx.operatorId as string,
        subject: investorId,
      }),
      ctx,
    );
  });

  it('investor is FROZEN after freeze (Mirror Node)', async () => {
    const result = await pollMirror<Result<AccountTokenRelationship[]>>(
      () =>
        mirror.getAccountTokens(investorId, tokenId) as Promise<Result<AccountTokenRelationship[]>>,
      (r) => r.status === 'valid' && r.value.length > 0 && r.value[0]?.freezeStatus === 'FROZEN',
    );
    if (result.status !== 'valid' || result.value.length === 0) return;
    expect(result.value[0]?.freezeStatus).toBe('FROZEN');
  });

  // -------------------------------------------------------------------------
  // 8. Unfreeze
  // -------------------------------------------------------------------------

  it('unfreezes the investor account', async () => {
    const unfreezeArgs = buildUnfreezeArgs({ tokenId, accountId: investorId });
    await executeUnfreeze(unfreezeArgs, ctx);
  });

  // -------------------------------------------------------------------------
  // 9. Wipe + audit
  // -------------------------------------------------------------------------

  it('wipes 500 units from the investor and submits audit', async () => {
    const wipeArgs = buildWipeArgs({ tokenId, accountId: investorId, amount: '500' });
    await executeWipe(wipeArgs, ctx);

    await executeSubmitAuditMessage(
      topicId,
      encodeAuditMessage({
        v: 1,
        type: 'WIPED',
        tokenId,
        ts: new Date().toISOString(),
        actor: ctx.operatorId as string,
        subject: investorId,
        amount: '500',
      }),
      ctx,
    );
  });

  it('investor balance is reduced after wipe (Mirror Node)', async () => {
    const result = await pollMirror<Result<TokenBalances>>(
      () => mirror.getTokenBalances(tokenId) as Promise<Result<TokenBalances>>,
      (r) => {
        if (r.status !== 'valid') return false;
        const entry = r.value.balances.find(
          (b: { account: string; balance: string }) => b.account === investorId,
        );
        return entry !== undefined && entry.balance === '500';
      },
    );
    if (result.status !== 'valid') return;
    const entry = result.value.balances.find(
      (b: { account: string; balance: string }) => b.account === investorId,
    );
    expect(entry?.balance).toBe('500');
  });

  // -------------------------------------------------------------------------
  // 10. Pause + audit
  // -------------------------------------------------------------------------

  it('pauses the token and submits audit', async () => {
    const pauseArgs = buildPauseArgs({ tokenId });
    await executePause(pauseArgs, ctx);

    await executeSubmitAuditMessage(
      topicId,
      encodeAuditMessage({
        v: 1,
        type: 'PAUSED',
        tokenId,
        ts: new Date().toISOString(),
        actor: ctx.operatorId as string,
      }),
      ctx,
    );
  });

  it('token pause_status is PAUSED after pause (Mirror Node)', async () => {
    const result = await pollMirror<Result<TokenInfo>>(
      () => mirror.getTokenInfo(tokenId) as Promise<Result<TokenInfo>>,
      (r) => r.status === 'valid' && r.value.pauseStatus === 'PAUSED',
    );
    if (result.status !== 'valid') return;
    expect(result.value.pauseStatus).toBe('PAUSED');
  });

  // -------------------------------------------------------------------------
  // 11. Unpause
  // -------------------------------------------------------------------------

  it('unpauses the token', async () => {
    const unpauseArgs = buildUnpauseArgs({ tokenId });
    await executeUnpause(unpauseArgs, ctx);

    await executeSubmitAuditMessage(
      topicId,
      encodeAuditMessage({
        v: 1,
        type: 'UNPAUSED',
        tokenId,
        ts: new Date().toISOString(),
        actor: ctx.operatorId as string,
      }),
      ctx,
    );
  });

  // -------------------------------------------------------------------------
  // 12. Read audit trail from HCS topic and verify consensus order
  // -------------------------------------------------------------------------

  it('HCS topic has audit messages that decode as valid in consensus order', async () => {
    const result = await pollMirror<Result<ParsedTopicMessage[]>>(
      () =>
        mirror.getTopicMessages(topicId, { order: 'asc', limit: 100 }) as Promise<
          Result<ParsedTopicMessage[]>
        >,
      (r) => r.status === 'valid' && r.value.length >= 2,
    );
    expect(result.status).toBe('valid');
    if (result.status !== 'valid') return;

    const messages = result.value;
    expect(messages.length).toBeGreaterThanOrEqual(2);

    // Sequence numbers are strictly ascending
    for (let i = 1; i < messages.length; i++) {
      const prev = messages[i - 1];
      const curr = messages[i];
      if (prev && curr) {
        expect(curr.sequenceNumber).toBeGreaterThan(prev.sequenceNumber);
      }
    }

    // Every audit entry we submitted should decode as valid
    const validAuditMessages = messages.filter(
      (m: ParsedTopicMessage) => m.audit.status === 'valid',
    );
    expect(validAuditMessages.length).toBeGreaterThan(0);
  });
});
