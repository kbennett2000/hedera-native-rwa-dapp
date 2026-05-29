import type { WalletApi } from '../wallet/WalletContext';

export function Header({ wallet }: { wallet: WalletApi }) {
  return (
    <header className="app-head">
      <div className="brand">
        <h1>Hedera-Native RWA</h1>
        <span className="net-pill">testnet</span>
      </div>
      <div className="wallet-controls">
        {wallet.accountId ? (
          <>
            <span className="account-pill" title="Connected account">
              {wallet.accountId}
            </span>
            <button className="secondary" onClick={() => void wallet.disconnect()}>
              Disconnect
            </button>
          </>
        ) : (
          <button
            className="primary"
            onClick={() => void wallet.connect()}
            disabled={wallet.connecting}
          >
            {wallet.connecting ? 'Connecting…' : 'Connect HashPack'}
          </button>
        )}
      </div>
      {wallet.error && <p className="note note-error head-error">⚠ {wallet.error}</p>}
    </header>
  );
}
