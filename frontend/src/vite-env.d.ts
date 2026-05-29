/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_WALLETCONNECT_PROJECT_ID?: string;
  readonly VITE_HEDERA_NETWORK?: string;
  readonly VITE_MIRROR_NODE_URL?: string;
  readonly VITE_TOKEN_ID?: string;
  readonly VITE_TOPIC_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
