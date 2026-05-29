import type { ComplianceState, AccountTokenRelationship } from '@core';
import { statusBadges } from '../view/compliance';
import { formatAmount } from '../view/format';
import { Panel, RefreshButton, Badge, MutedNote } from './common';

export function ComplianceStatusPanel({
  accountId,
  state,
  relationship,
  decimals,
  loading,
  onRefresh,
}: {
  accountId: string;
  state: ComplianceState | null;
  relationship: AccountTokenRelationship | null;
  decimals: number;
  loading: boolean;
  onRefresh: () => void;
}) {
  return (
    <Panel
      title="Your compliance status"
      action={<RefreshButton onRefresh={onRefresh} loading={loading} />}
    >
      <p className="muted-id">Account {accountId}</p>
      {state ? (
        <>
          <div className="badges">
            {statusBadges(state).map((b) => (
              <Badge key={b.key} tone={b.tone}>
                {b.label}
              </Badge>
            ))}
          </div>
          <dl className="kv">
            <dt>Balance</dt>
            <dd>{relationship ? formatAmount(relationship.balance, decimals) : '—'}</dd>
          </dl>
        </>
      ) : (
        <MutedNote>Loading status…</MutedNote>
      )}
    </Panel>
  );
}
