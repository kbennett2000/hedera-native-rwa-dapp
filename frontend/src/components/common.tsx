import type { ReactNode } from 'react';
import type { BadgeTone } from '../view/compliance';

export function Badge({ tone, children }: { tone: BadgeTone; children: ReactNode }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

export function Panel({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="panel">
      <header className="panel-head">
        <h2>{title}</h2>
        {action}
      </header>
      {children}
    </section>
  );
}

export function RefreshButton({
  onRefresh,
  loading,
}: {
  onRefresh: () => void;
  loading?: boolean;
}) {
  return (
    <button className="refresh" onClick={onRefresh} disabled={loading}>
      {loading ? 'Refreshing…' : 'Refresh'}
    </button>
  );
}

export function PendingNote({ children }: { children: ReactNode }) {
  return <p className="note note-pending">⏳ {children}</p>;
}

export function ErrorNote({ children }: { children: ReactNode }) {
  return <p className="note note-error">⚠ {children}</p>;
}

export function MutedNote({ children }: { children: ReactNode }) {
  return <p className="note note-muted">{children}</p>;
}
