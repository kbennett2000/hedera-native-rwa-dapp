import type { Result, TokenInfo, TokenKey } from '@core';
import { formatAmount } from '../view/format';
import { Panel, RefreshButton, ErrorNote, Badge } from './common';

const KEY_LABELS: Array<[keyof TokenInfo, string]> = [
  ['kycKey', 'KYC'],
  ['freezeKey', 'Freeze'],
  ['wipeKey', 'Wipe'],
  ['pauseKey', 'Pause'],
  ['supplyKey', 'Supply'],
  ['adminKey', 'Admin'],
];

export function TokenInfoPanel({
  res,
  loading,
  onRefresh,
}: {
  res: Result<TokenInfo> | null;
  loading: boolean;
  onRefresh: () => void;
}) {
  return (
    <Panel title="Token" action={<RefreshButton onRefresh={onRefresh} loading={loading} />}>
      {res?.status === 'malformed' && <ErrorNote>Could not load token info: {res.error}</ErrorNote>}
      {res?.status === 'valid' && (
        <dl className="kv">
          <dt>Name</dt>
          <dd>
            {res.value.name} ({res.value.symbol})
          </dd>
          <dt>Token ID</dt>
          <dd>{res.value.tokenId}</dd>
          <dt>Total supply</dt>
          <dd>{formatAmount(res.value.totalSupply, res.value.decimals)}</dd>
          <dt>Pause status</dt>
          <dd>
            <Badge tone={res.value.pauseStatus === 'PAUSED' ? 'bad' : 'ok'}>
              {res.value.pauseStatus}
            </Badge>
          </dd>
          <dt>Compliance keys</dt>
          <dd className="keys">
            {KEY_LABELS.map(([field, label]) => (
              <Badge key={label} tone={(res.value[field] as TokenKey) ? 'ok' : 'neutral'}>
                {label} {(res.value[field] as TokenKey) ? '✓' : '—'}
              </Badge>
            ))}
          </dd>
        </dl>
      )}
      {!res && <p className="note note-muted">Loading…</p>}
    </Panel>
  );
}
