/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_WALLETCONNECT_PROJECT_ID?: string;
  readonly VITE_HEDERA_NETWORK?: string;
  readonly VITE_MIRROR_NODE_URL?: string;
  readonly VITE_TOKEN_ID?: string;
  readonly VITE_TOPIC_ID?: string;
  // Dev-only demo mode for screenshots (ADR-0010) — never set in a normal build.
  readonly VITE_DEMO?: string;
  readonly VITE_DEMO_ACCOUNT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
