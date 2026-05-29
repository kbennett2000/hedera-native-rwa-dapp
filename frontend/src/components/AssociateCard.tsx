import { useState } from 'react';
import { useWallet } from '../wallet/useWallet';
import { associateToken } from '../actions/associate';
import { Panel, PendingNote, ErrorNote, MutedNote } from './common';

export function AssociateCard({
  accountId,
  tokenId,
  associated,
  onRefresh,
}: {
  accountId: string;
  tokenId: string;
  associated: boolean;
  onRefresh: () => void;
}) {
  const { getSigner } = useWallet();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (associated) {
    return (
      <Panel title="Associate">
        <MutedNote>This account is associated with the token. ✓</MutedNote>
      </Panel>
    );
  }

  async function onAssociate() {
    const signer = getSigner();
    if (!signer) {
      setError('Connect a wallet first');
      return;
    }
    setBusy(true);
    setError(null);
    setStatus(null);
    try {
      const result = await associateToken(signer, { accountId, tokenId });
      setStatus(result);
      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'association failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel title="Associate">
      <p>
        On Hedera you must associate with a token before you can hold it — there is no EVM
        equivalent. This is the first wallet-signed step.
      </p>
      <button className="primary" onClick={() => void onAssociate()} disabled={busy}>
        {busy ? 'Signing…' : 'Associate token'}
      </button>
      {status && (
        <PendingNote>Submitted ({status}). Waiting for the Mirror Node to reflect it…</PendingNote>
      )}
      {error && <ErrorNote>{error}</ErrorNote>}
    </Panel>
  );
}
