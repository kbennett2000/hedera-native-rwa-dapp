import { deriveComplianceState } from '@core';
import type { AccountTokenRelationship } from '@core';
import { readConfig } from './config';
import type { AppConfig } from './config';
import { WalletProvider } from './wallet/WalletContext';
import { useWallet } from './wallet/useWallet';
import { useTokenInfo, useAccountTokens, useAuditFeed } from './mirror/hooks';
import { Header } from './components/Header';
import { TeachingBanner } from './components/TeachingBanner';
import { TokenInfoPanel } from './components/TokenInfoPanel';
import { ComplianceStatusPanel } from './components/ComplianceStatusPanel';
import { AssociateCard } from './components/AssociateCard';
import { TransferCard } from './components/TransferCard';
import { AuditTrailPanel } from './components/AuditTrailPanel';
import { MutedNote } from './components/common';

export function App() {
  const cfg = readConfig();
  if (!cfg.ok) return <MissingConfig missing={cfg.missing} />;
  return (
    <WalletProvider config={cfg.config}>
      <Dashboard config={cfg.config} />
    </WalletProvider>
  );
}

function Dashboard({ config }: { config: AppConfig }) {
  const wallet = useWallet();
  const tokenInfo = useTokenInfo(config.tokenId);
  const accountTokens = useAccountTokens(wallet.accountId, config.tokenId);
  const audit = useAuditFeed(config.topicId);

  const tokenPaused =
    tokenInfo.result?.status === 'valid' && tokenInfo.result.value.pauseStatus === 'PAUSED';
  const decimals = tokenInfo.result?.status === 'valid' ? tokenInfo.result.value.decimals : 0;
  const relationship: AccountTokenRelationship | null =
    accountTokens.result?.status === 'valid' ? (accountTokens.result.value[0] ?? null) : null;
  const compliance = wallet.accountId ? deriveComplianceState({ relationship, tokenPaused }) : null;

  return (
    <div className="app">
      <Header wallet={wallet} />
      <TeachingBanner />
      <main className="panels">
        <TokenInfoPanel
          res={tokenInfo.result}
          loading={tokenInfo.loading}
          onRefresh={tokenInfo.refetch}
        />
        {wallet.accountId ? (
          <>
            <ComplianceStatusPanel
              accountId={wallet.accountId}
              state={compliance}
              relationship={relationship}
              decimals={decimals}
              loading={accountTokens.loading}
              onRefresh={accountTokens.refetch}
            />
            <AssociateCard
              accountId={wallet.accountId}
              tokenId={config.tokenId}
              associated={!!compliance?.associated}
              onRefresh={accountTokens.refetch}
            />
            <TransferCard
              accountId={wallet.accountId}
              tokenId={config.tokenId}
              decimals={decimals}
              onRefresh={accountTokens.refetch}
            />
          </>
        ) : (
          <section className="panel">
            <MutedNote>
              Connect a Hedera wallet (HashPack) to view your status, associate, and transfer.
            </MutedNote>
          </section>
        )}
        <AuditTrailPanel res={audit.result} loading={audit.loading} onRefresh={audit.refetch} />
      </main>
      <footer className="app-foot">
        Reads via Mirror Node · Signing via Hedera WalletConnect · testnet · Part 2 of the Hedera
        RWA series
      </footer>
    </div>
  );
}

function MissingConfig({ missing }: { missing: string[] }) {
  return (
    <div className="app">
      <div className="config-gate">
        <h1>Configuration needed</h1>
        <p>
          Set these variables in <code>frontend/.env</code> (see <code>.env.example</code>):
        </p>
        <ul>
          {missing.map((name) => (
            <li key={name}>
              <code>{name}</code>
            </li>
          ))}
        </ul>
        <p className="note note-muted">
          <code>VITE_TOKEN_ID</code> / <code>VITE_TOPIC_ID</code> come from the issuer&rsquo;s
          <code> deployments.json</code> after running scripts 01 and 02. The WalletConnect project
          id is from <code>cloud.walletconnect.com</code>.
        </p>
      </div>
    </div>
  );
}
