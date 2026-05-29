/**
 * Thin HTTP wrapper over the Mirror Node REST API.
 *
 * The ONE place that knows the base URL. It does `fetch(...).text()` and hands the
 * raw text to a `core/` parser — it never `JSON.parse`s a body itself (ADR-0006) and
 * holds no parsing logic (ADR-0002). Returns the parser's `Result`; an HTTP error or
 * network failure becomes a `malformed` Result so callers branch uniformly. Never throws.
 */

import {
  malformed,
  parseTokenInfo,
  parseAccountTokens,
  parseTokenBalances,
  parseTopicMessages,
} from '../core/index.js';
import type {
  Result,
  TokenInfo,
  AccountTokenRelationship,
  TokenBalances,
  ParsedTopicMessage,
} from '../core/index.js';

export interface MirrorClient {
  getTokenInfo(tokenId: string): Promise<Result<TokenInfo>>;
  getAccountTokens(
    accountId: string,
    tokenId?: string,
  ): Promise<Result<AccountTokenRelationship[]>>;
  getTokenBalances(tokenId: string): Promise<Result<TokenBalances>>;
  getTopicMessages(
    topicId: string,
    opts?: { limit?: number; order?: 'asc' | 'desc' },
  ): Promise<Result<ParsedTopicMessage[]>>;
}

export function createMirrorClient(opts: { baseUrl: string; fetch?: typeof fetch }): MirrorClient {
  const f = opts.fetch ?? fetch;
  const baseUrl = opts.baseUrl;

  async function readVia<T>(path: string, parse: (text: string) => Result<T>): Promise<Result<T>> {
    try {
      const res = await f(baseUrl + path);
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        return malformed(`Mirror Node HTTP ${res.status}`, body);
      }
      return parse(await res.text());
    } catch (err) {
      return malformed(err instanceof Error ? err.message : 'fetch failed', '');
    }
  }

  return {
    getTokenInfo(tokenId) {
      return readVia(`/api/v1/tokens/${tokenId}`, parseTokenInfo);
    },
    getAccountTokens(accountId, tokenId) {
      const query = tokenId ? `?token.id=${tokenId}` : '';
      return readVia(`/api/v1/accounts/${accountId}/tokens${query}`, parseAccountTokens);
    },
    getTokenBalances(tokenId) {
      return readVia(`/api/v1/tokens/${tokenId}/balances`, parseTokenBalances);
    },
    getTopicMessages(topicId, opts) {
      const params = new URLSearchParams();
      if (opts?.limit !== undefined) params.set('limit', String(opts.limit));
      if (opts?.order !== undefined) params.set('order', opts.order);
      const query = params.toString();
      const path = `/api/v1/topics/${topicId}/messages${query ? `?${query}` : ''}`;
      return readVia(path, parseTopicMessages);
    },
  };
}
