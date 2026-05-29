/**
 * Unit tests for src/sdk/mirrorClient.ts
 *
 * All tests use a stub fetch — no real network. The stub returns fixture text
 * loaded as raw strings, so the real core parsers process the same bytes the
 * live client would receive.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  parseTokenInfo,
  parseAccountTokens,
  parseTokenBalances,
  parseTopicMessages,
} from '../../../src/core/mirror/parse.js';
import type { TokenBalanceEntry } from '../../../src/core/mirror/types.js';
import { createMirrorClient } from '../../../src/sdk/mirrorClient.js';

// ---------------------------------------------------------------------------
// Fixture loader — raw text, never JSON.parse (ADR-0006)
// ---------------------------------------------------------------------------

function fixture(relPath: string): string {
  return readFileSync(
    fileURLToPath(new URL('../fixtures/mirror/' + relPath, import.meta.url)),
    'utf8',
  );
}

const TOKEN_INFO_TEXT = fixture('token-info.json');
const ACCOUNT_TOKENS_GRANTED_TEXT = fixture('account-tokens-granted.json');
const BALANCES_BIGNUM_TEXT = fixture('balances-bignum.json');

// A minimal topic-messages fixture built inline (no fixture file exists for topic messages)
function topicMessagesText(): string {
  const msg = Buffer.from(
    JSON.stringify({
      v: 1,
      type: 'KYC_GRANTED',
      tokenId: '0.0.123456',
      ts: '2026-05-28T14:32:00Z',
      actor: '0.0.1001',
      subject: '0.0.2002',
    }),
    'utf8',
  ).toString('base64');
  return JSON.stringify({
    messages: [
      {
        consensus_timestamp: '1700000000.000000001',
        topic_id: '0.0.7007',
        message: msg,
        payer_account_id: '0.0.1001',
        sequence_number: 1,
        running_hash: 'aabbccdd',
        running_hash_version: 3,
      },
    ],
    links: { next: null },
  });
}

// ---------------------------------------------------------------------------
// Stub fetch factory
// ---------------------------------------------------------------------------

type StubResponse = { ok: boolean; status: number; text: () => Promise<string> };

function makeStubFetch(response: StubResponse): {
  stub: typeof fetch;
  calledWith: () => string | undefined;
} {
  let capturedUrl: string | undefined;
  const stub = ((url: string) => {
    capturedUrl = url;
    return Promise.resolve(response as unknown as Response);
  }) as unknown as typeof fetch;
  return { stub, calledWith: () => capturedUrl };
}

function okStub(text: string): StubResponse {
  return { ok: true, status: 200, text: async () => text };
}

function errorStub(status: number): StubResponse {
  return { ok: false, status, text: async () => '' };
}

const BASE_URL = 'https://m.example';

// ---------------------------------------------------------------------------
// getTokenInfo
// ---------------------------------------------------------------------------

describe('getTokenInfo', () => {
  it('calls fetch with the correct token-info URL', async () => {
    const { stub, calledWith } = makeStubFetch(okStub(TOKEN_INFO_TEXT));
    const client = createMirrorClient({ baseUrl: BASE_URL, fetch: stub });
    await client.getTokenInfo('0.0.123456');
    expect(calledWith()).toBe(`${BASE_URL}/api/v1/tokens/0.0.123456`);
  });

  it('returns a Result that deep-equals parseTokenInfo applied to the fixture text', async () => {
    const { stub } = makeStubFetch(okStub(TOKEN_INFO_TEXT));
    const client = createMirrorClient({ baseUrl: BASE_URL, fetch: stub });
    const result = await client.getTokenInfo('0.0.123456');
    expect(result).toStrictEqual(parseTokenInfo(TOKEN_INFO_TEXT));
  });

  it('returns status valid for a well-formed response', async () => {
    const { stub } = makeStubFetch(okStub(TOKEN_INFO_TEXT));
    const client = createMirrorClient({ baseUrl: BASE_URL, fetch: stub });
    const result = await client.getTokenInfo('0.0.123456');
    expect(result.status).toBe('valid');
  });

  it('returns status malformed when HTTP response is not ok (404)', async () => {
    const { stub } = makeStubFetch(errorStub(404));
    const client = createMirrorClient({ baseUrl: BASE_URL, fetch: stub });
    const result = await client.getTokenInfo('0.0.123456');
    expect(result.status).toBe('malformed');
  });

  it('error message mentions the HTTP status code when response is not ok', async () => {
    const { stub } = makeStubFetch(errorStub(404));
    const client = createMirrorClient({ baseUrl: BASE_URL, fetch: stub });
    const result = await client.getTokenInfo('0.0.123456');
    if (result.status === 'malformed') {
      expect(result.error).toMatch(/404/);
    }
  });

  it('never throws — resolves even on HTTP error', async () => {
    const { stub } = makeStubFetch(errorStub(500));
    const client = createMirrorClient({ baseUrl: BASE_URL, fetch: stub });
    await expect(client.getTokenInfo('0.0.999')).resolves.toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// getAccountTokens
// ---------------------------------------------------------------------------

describe('getAccountTokens', () => {
  it('calls fetch with the correct account-tokens URL (no token filter)', async () => {
    const { stub, calledWith } = makeStubFetch(okStub(ACCOUNT_TOKENS_GRANTED_TEXT));
    const client = createMirrorClient({ baseUrl: BASE_URL, fetch: stub });
    await client.getAccountTokens('0.0.2002');
    expect(calledWith()).toBe(`${BASE_URL}/api/v1/accounts/0.0.2002/tokens`);
  });

  it('appends token.id query param when tokenId is provided', async () => {
    const { stub, calledWith } = makeStubFetch(okStub(ACCOUNT_TOKENS_GRANTED_TEXT));
    const client = createMirrorClient({ baseUrl: BASE_URL, fetch: stub });
    await client.getAccountTokens('0.0.2002', '0.0.123456');
    expect(calledWith()).toContain('token.id=0.0.123456');
  });

  it('URL contains the account id when token filter is provided', async () => {
    const { stub, calledWith } = makeStubFetch(okStub(ACCOUNT_TOKENS_GRANTED_TEXT));
    const client = createMirrorClient({ baseUrl: BASE_URL, fetch: stub });
    await client.getAccountTokens('0.0.2002', '0.0.123456');
    expect(calledWith()).toContain('/api/v1/accounts/0.0.2002/tokens');
  });

  it('returns a Result that deep-equals parseAccountTokens applied to the fixture text', async () => {
    const { stub } = makeStubFetch(okStub(ACCOUNT_TOKENS_GRANTED_TEXT));
    const client = createMirrorClient({ baseUrl: BASE_URL, fetch: stub });
    const result = await client.getAccountTokens('0.0.2002');
    expect(result).toStrictEqual(parseAccountTokens(ACCOUNT_TOKENS_GRANTED_TEXT));
  });

  it('returns status malformed when HTTP response is not ok', async () => {
    const { stub } = makeStubFetch(errorStub(404));
    const client = createMirrorClient({ baseUrl: BASE_URL, fetch: stub });
    const result = await client.getAccountTokens('0.0.9999');
    expect(result.status).toBe('malformed');
  });

  it('never throws — resolves even on HTTP error', async () => {
    const { stub } = makeStubFetch(errorStub(503));
    const client = createMirrorClient({ baseUrl: BASE_URL, fetch: stub });
    await expect(client.getAccountTokens('0.0.2002')).resolves.toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// getTokenBalances
// ---------------------------------------------------------------------------

describe('getTokenBalances', () => {
  it('calls fetch with the correct token-balances URL', async () => {
    const { stub, calledWith } = makeStubFetch(okStub(BALANCES_BIGNUM_TEXT));
    const client = createMirrorClient({ baseUrl: BASE_URL, fetch: stub });
    await client.getTokenBalances('0.0.123456');
    expect(calledWith()).toBe(`${BASE_URL}/api/v1/tokens/0.0.123456/balances`);
  });

  it('returns a Result that deep-equals parseTokenBalances applied to the fixture text', async () => {
    const { stub } = makeStubFetch(okStub(BALANCES_BIGNUM_TEXT));
    const client = createMirrorClient({ baseUrl: BASE_URL, fetch: stub });
    const result = await client.getTokenBalances('0.0.123456');
    expect(result).toStrictEqual(parseTokenBalances(BALANCES_BIGNUM_TEXT));
  });

  it('preserves a balance > 2^53 as the exact digit string through the client', async () => {
    const { stub } = makeStubFetch(okStub(BALANCES_BIGNUM_TEXT));
    const client = createMirrorClient({ baseUrl: BASE_URL, fetch: stub });
    const result = await client.getTokenBalances('0.0.123456');
    expect(result.status).toBe('valid');
    if (result.status === 'valid') {
      const entry = result.value.balances.find((b: TokenBalanceEntry) => b.account === '0.0.2002');
      expect(entry?.balance).toBe('9007199254740993');
    }
  });

  it('returns status malformed when HTTP response is not ok', async () => {
    const { stub } = makeStubFetch(errorStub(404));
    const client = createMirrorClient({ baseUrl: BASE_URL, fetch: stub });
    const result = await client.getTokenBalances('0.0.123456');
    expect(result.status).toBe('malformed');
  });

  it('never throws — resolves even on HTTP error', async () => {
    const { stub } = makeStubFetch(errorStub(500));
    const client = createMirrorClient({ baseUrl: BASE_URL, fetch: stub });
    await expect(client.getTokenBalances('0.0.123456')).resolves.toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// getTopicMessages
// ---------------------------------------------------------------------------

describe('getTopicMessages', () => {
  it('calls fetch with the correct topic-messages URL', async () => {
    const text = topicMessagesText();
    const { stub, calledWith } = makeStubFetch(okStub(text));
    const client = createMirrorClient({ baseUrl: BASE_URL, fetch: stub });
    await client.getTopicMessages('0.0.7007');
    expect(calledWith()).toContain('/api/v1/topics/0.0.7007/messages');
  });

  it('includes limit query param when provided', async () => {
    const text = topicMessagesText();
    const { stub, calledWith } = makeStubFetch(okStub(text));
    const client = createMirrorClient({ baseUrl: BASE_URL, fetch: stub });
    await client.getTopicMessages('0.0.7007', { limit: 25, order: 'asc' });
    expect(calledWith()).toContain('limit=25');
  });

  it('includes order query param when provided', async () => {
    const text = topicMessagesText();
    const { stub, calledWith } = makeStubFetch(okStub(text));
    const client = createMirrorClient({ baseUrl: BASE_URL, fetch: stub });
    await client.getTopicMessages('0.0.7007', { limit: 25, order: 'asc' });
    expect(calledWith()).toContain('order=asc');
  });

  it('returns a Result that deep-equals parseTopicMessages applied to the fixture text', async () => {
    const text = topicMessagesText();
    const { stub } = makeStubFetch(okStub(text));
    const client = createMirrorClient({ baseUrl: BASE_URL, fetch: stub });
    const result = await client.getTopicMessages('0.0.7007');
    expect(result).toStrictEqual(parseTopicMessages(text));
  });

  it('returns status malformed when HTTP response is not ok', async () => {
    const { stub } = makeStubFetch(errorStub(404));
    const client = createMirrorClient({ baseUrl: BASE_URL, fetch: stub });
    const result = await client.getTopicMessages('0.0.7007');
    expect(result.status).toBe('malformed');
  });

  it('error message mentions the status code when response is not ok', async () => {
    const { stub } = makeStubFetch(errorStub(404));
    const client = createMirrorClient({ baseUrl: BASE_URL, fetch: stub });
    const result = await client.getTopicMessages('0.0.7007');
    if (result.status === 'malformed') {
      expect(result.error).toMatch(/404/);
    }
  });

  it('never throws — resolves even on HTTP error', async () => {
    const { stub } = makeStubFetch(errorStub(500));
    const client = createMirrorClient({ baseUrl: BASE_URL, fetch: stub });
    await expect(client.getTopicMessages('0.0.7007')).resolves.toBeDefined();
  });
});
