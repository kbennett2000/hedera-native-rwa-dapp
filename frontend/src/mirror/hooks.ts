/**
 * Mirror read hooks with the propagation-lag model (ADR-0009): each resource can poll
 * and is manually refetchable; panels show a pending affordance after a signed action
 * and re-poll until Mirror reflects the change. Reads route through core parsers via
 * the shared `mirror` client.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Result } from '@core';
import { mirror } from './client';

export interface MirrorResource<T> {
  result: Result<T> | null;
  loading: boolean;
  refetch: () => Promise<void>;
}

export function useMirrorResource<T>(
  fetcher: () => Promise<Result<T>>,
  opts: { pollMs?: number; enabled?: boolean; deps?: unknown[] } = {},
): MirrorResource<T> {
  const { pollMs, enabled = true, deps = [] } = opts;
  const [result, setResult] = useState<Result<T> | null>(null);
  const [loading, setLoading] = useState(false);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const refetch = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    try {
      setResult(await fetcherRef.current());
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    void refetch();
    if (!pollMs) return;
    const id = setInterval(() => void refetch(), pollMs);
    return () => clearInterval(id);
    // `deps` drive re-fetch when the queried id/account changes.
  }, [enabled, pollMs, refetch, ...deps]);

  return { result, loading, refetch };
}

export function useTokenInfo(tokenId: string) {
  return useMirrorResource(() => mirror.getTokenInfo(tokenId), { pollMs: 20000, deps: [tokenId] });
}

export function useAccountTokens(accountId: string | null, tokenId: string) {
  return useMirrorResource(() => mirror.getAccountTokens(accountId as string, tokenId), {
    enabled: !!accountId,
    pollMs: 8000,
    deps: [accountId, tokenId],
  });
}

export function useAuditFeed(topicId: string) {
  return useMirrorResource(() => mirror.getTopicMessages(topicId, { order: 'asc', limit: 100 }), {
    pollMs: 8000,
    deps: [topicId],
  });
}
