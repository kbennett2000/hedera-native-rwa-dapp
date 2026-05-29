/**
 * The single Mirror Node read client for the app — reuses the canonical, browser-safe
 * sdk/mirrorClient (fetch().text() → core parser). The frontend adds no parsing of its
 * own (ADR-0002/0009).
 */

import { createMirrorClient } from '@sdkMirror';

const baseUrl =
  import.meta.env.VITE_MIRROR_NODE_URL?.trim() || 'https://testnet.mirrornode.hedera.com';

export const mirror = createMirrorClient({ baseUrl });
