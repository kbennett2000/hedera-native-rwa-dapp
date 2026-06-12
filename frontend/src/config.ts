/**
 * App configuration from Vite env (VITE_*). No secrets live in the frontend — the
 * operator key never leaves the issuer scripts (ADR-0003). tokenId/topicId come from
 * the issuer's deployments.json (see .env.example).
 */

export interface AppConfig {
  walletConnectProjectId: string;
  network: string;
  mirrorNodeUrl: string;
  tokenId: string;
  topicId: string;
}

export type ConfigResult = { ok: true; config: AppConfig } | { ok: false; missing: string[] };

const DEFAULT_MIRROR = 'https://testnet.mirrornode.hedera.com';

/**
 * Dev-only demo mode (ADR-0010): renders the wallet-gated views with a stub signer and
 * canned action outcomes. Mirror reads stay real in normal use; the screenshot script
 * additionally intercepts them with fixtures (see scripts/fixtures/ and the ADR-0010
 * amendment). Never enabled in a normal build — it requires VITE_DEMO=1.
 */
export const isDemoMode = (): boolean => import.meta.env.VITE_DEMO === '1';
export const demoAccountId = (): string => import.meta.env.VITE_DEMO_ACCOUNT_ID?.trim() || '0.0.0';

export function readConfig(): ConfigResult {
  const env = import.meta.env;
  const demo = isDemoMode();
  const projectId = env.VITE_WALLETCONNECT_PROJECT_ID?.trim() ?? '';
  const tokenId = env.VITE_TOKEN_ID?.trim() ?? '';
  const topicId = env.VITE_TOPIC_ID?.trim() ?? '';

  const missing: string[] = [];
  // In demo mode no real wallet connects, so the WalletConnect project id is optional.
  if (!projectId && !demo) missing.push('VITE_WALLETCONNECT_PROJECT_ID');
  if (!tokenId) missing.push('VITE_TOKEN_ID');
  if (!topicId) missing.push('VITE_TOPIC_ID');
  if (missing.length > 0) return { ok: false, missing };

  return {
    ok: true,
    config: {
      walletConnectProjectId: projectId || (demo ? 'demo' : ''),
      network: env.VITE_HEDERA_NETWORK?.trim() || 'testnet',
      mirrorNodeUrl: env.VITE_MIRROR_NODE_URL?.trim() || DEFAULT_MIRROR,
      tokenId,
      topicId,
    },
  };
}
