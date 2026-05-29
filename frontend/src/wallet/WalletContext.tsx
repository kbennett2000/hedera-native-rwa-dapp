/**
 * WalletConnect → HashPack integration (ADR-0008). One DAppConnector for the app;
 * connect opens the WalletConnect modal, disconnect tears down all sessions. Exposes
 * the connected account id and the DAppSigner used to sign associate/transfer.
 *
 * MetaMask cannot sign native HTS transactions (ADR-0001) — this is why we use a
 * Hedera wallet here, not an EVM wallet.
 */

import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { LedgerId } from '@hashgraph/sdk';
import {
  DAppConnector,
  HederaChainId,
  HederaJsonRpcMethod,
  HederaSessionEvent,
} from '@hashgraph/hedera-wallet-connect';
import type { DAppSigner } from '@hashgraph/hedera-wallet-connect';
import type { AppConfig } from '../config';

export interface WalletApi {
  accountId: string | null;
  connecting: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  getSigner: () => DAppSigner | null;
}

export const WalletContext = createContext<WalletApi | null>(null);

function firstAccountId(connector: DAppConnector): string | null {
  const signer = connector.signers[0];
  return signer ? signer.getAccountId().toString() : null;
}

export function WalletProvider({ config, children }: { config: AppConfig; children: ReactNode }) {
  const connectorRef = useRef<DAppConnector | null>(null);
  const [ready, setReady] = useState(false);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize the connector once. The guard keeps StrictMode's double-invoke (and any
  // re-render) from creating a second DAppConnector / leaking a WalletConnect session.
  useEffect(() => {
    if (connectorRef.current) {
      setReady(true);
      return;
    }
    let cancelled = false;
    const connector = new DAppConnector(
      {
        name: 'Hedera-Native RWA (Investor)',
        description: 'Investor view for a native-Hedera compliance-gated RWA token',
        url: window.location.origin,
        icons: [`${window.location.origin}/favicon.ico`],
      },
      LedgerId.TESTNET,
      config.walletConnectProjectId,
      Object.values(HederaJsonRpcMethod),
      [HederaSessionEvent.ChainChanged, HederaSessionEvent.AccountsChanged],
      [HederaChainId.Testnet],
    );
    connectorRef.current = connector;
    connector
      .init()
      .then(() => {
        if (cancelled) return;
        setAccountId(firstAccountId(connector));
        setReady(true);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'wallet init failed');
      });
    return () => {
      cancelled = true;
    };
  }, [config.walletConnectProjectId]);

  const connect = useCallback(async () => {
    const connector = connectorRef.current;
    if (!connector) return;
    setConnecting(true);
    setError(null);
    try {
      await connector.openModal();
      setAccountId(firstAccountId(connector));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'wallet connection cancelled');
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    const connector = connectorRef.current;
    if (!connector) return;
    try {
      await connector.disconnectAll();
    } finally {
      setAccountId(null);
    }
  }, []);

  const getSigner = useCallback((): DAppSigner | null => {
    return connectorRef.current?.signers[0] ?? null;
  }, []);

  const value = useMemo<WalletApi>(
    () => ({
      accountId: ready ? accountId : null,
      connecting,
      error,
      connect,
      disconnect,
      getSigner,
    }),
    [ready, accountId, connecting, error, connect, disconnect, getSigner],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}
