import { useState } from 'react';
import { useWallet } from '../wallet/useWallet';
import { transferToken } from '../actions/transfer';
import type { TransferOutcome } from '../actions/transfer';
import { formatAmount } from '../view/format';
import { Panel, PendingNote, ErrorNote, MutedNote } from './common';

export function TransferCard({
  accountId,
  tokenId,
  decimals,
  onRefresh,
}: {
  accountId: string;
  tokenId: string;
  decimals: number;
  onRefresh: () => void;
}) {
  const { getSigner } = useWallet();
  const [to, setTo] = useState('');
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<TransferOutcome | null>(null);

  async function onTransfer() {
    setBusy(true);
    setOutcome(null);
    try {
      const result = await transferToken(getSigner(), {
        tokenId,
        fromAccountId: accountId,
        toAccountId: to.trim(),
        amount: amount.trim(),
      });
      setOutcome(result);
      if (result.ok) onRefresh();
    } catch (err) {
      setOutcome({
        ok: false,
        kind: 'validation',
        status: err instanceof Error ? err.message : 'invalid input',
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel title="Transfer">
      <p>
        Sending to a non-KYC&rsquo;d or frozen account, or while the token is paused, is rejected by
        the network at consensus — the native analogue of a Solidity revert.
      </p>
      <div className="form">
        <label>
          Recipient account ID
          <input value={to} onChange={(e) => setTo(e.target.value)} placeholder="0.0.x" />
        </label>
        <label>
          Amount (base units)
          <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="100" />
        </label>
        <button
          className="primary"
          onClick={() => void onTransfer()}
          disabled={busy || !to || !amount}
        >
          {busy ? 'Signing…' : 'Transfer'}
        </button>
      </div>
      {outcome?.ok && (
        <PendingNote>
          Transfer submitted ({outcome.status}). Waiting for the Mirror Node…
        </PendingNote>
      )}
      {outcome && !outcome.ok && outcome.kind === 'network' && (
        <ErrorNote>
          Network rejected the transfer: <strong>{outcome.status}</strong>
        </ErrorNote>
      )}
      {outcome && !outcome.ok && outcome.kind === 'validation' && (
        <ErrorNote>Invalid input: {outcome.status}</ErrorNote>
      )}
      <MutedNote>
        Amounts are base units — with {decimals} decimals, 100 base units ={' '}
        {formatAmount('100', decimals)} display units.
      </MutedNote>
    </Panel>
  );
}
