import { useContext } from 'react';
import { WalletContext } from './WalletContext';
import type { WalletApi } from './WalletContext';

export function useWallet(): WalletApi {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be used within a WalletProvider');
  return ctx;
}
