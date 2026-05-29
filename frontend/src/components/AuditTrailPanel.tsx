import type { Result, ParsedTopicMessage } from '@core';
import { sortFeedNewestFirst, toAuditRow } from '../view/audit';
import { formatConsensusTimestamp } from '../view/format';
import { Panel, RefreshButton, ErrorNote, MutedNote } from './common';

export function AuditTrailPanel({
  res,
  loading,
  onRefresh,
}: {
  res: Result<ParsedTopicMessage[]> | null;
  loading: boolean;
  onRefresh: () => void;
}) {
  return (
    <Panel
      title="Audit trail (HCS)"
      action={<RefreshButton onRefresh={onRefresh} loading={loading} />}
    >
      <MutedNote>
        The consensus timestamp is the canonical order/time. Mirror reflects new messages a few
        seconds after they are submitted — Refresh to re-check.
      </MutedNote>
      {res?.status === 'malformed' && (
        <ErrorNote>Could not load the audit feed: {res.error}</ErrorNote>
      )}
      {res?.status === 'valid' &&
        (res.value.length === 0 ? (
          <MutedNote>No audit messages yet.</MutedNote>
        ) : (
          <ul className="feed">
            {sortFeedNewestFirst(res.value).map((m) => (
              <AuditRowItem key={`${m.consensusTimestamp}:${m.sequenceNumber}`} m={m} />
            ))}
          </ul>
        ))}
    </Panel>
  );
}

function AuditRowItem({ m }: { m: ParsedTopicMessage }) {
  const row = toAuditRow(m);
  const when = formatConsensusTimestamp(row.consensusTimestamp);

  if (row.kind === 'malformed') {
    return (
      <li className="feed-row feed-bad">
        <span className="feed-type">malformed entry</span>
        <span className="feed-when">{when}</span>
      </li>
    );
  }
  if (row.kind === 'unrecognized') {
    return (
      <li className="feed-row feed-warn">
        <span className="feed-type">unrecognized event</span>
        <span className="feed-when">{when}</span>
      </li>
    );
  }
  return (
    <li className="feed-row">
      <span className="feed-type">{row.type}</span>
      <span className="feed-detail">
        {row.actor}
        {row.subject ? ` → ${row.subject}` : ''}
        {row.amount ? ` · ${row.amount}` : ''}
      </span>
      <span className="feed-when">{when}</span>
    </li>
  );
}
