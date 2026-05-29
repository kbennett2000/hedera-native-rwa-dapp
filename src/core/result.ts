/**
 * Discriminated-union result types for the pure-logic core.
 *
 * Two flavors:
 *  - `Result<T>`        — parsers of external data (Mirror Node): valid | malformed.
 *  - `DecodeResult<T>`  — audit-message decode, which additionally distinguishes a
 *                         well-formed-but-unknown message (future event type / schema
 *                         version) so the audit feed can render it as a generic row
 *                         instead of erroring (see docs/hcs-audit-schema.md).
 *
 * Nothing here throws; callers branch on `status`.
 */

export type Ok<T> = { status: 'valid'; value: T };
export type Malformed = { status: 'malformed'; error: string; raw: string };
export type Unrecognized = { status: 'unrecognized'; raw: unknown };

export type Result<T> = Ok<T> | Malformed;
export type DecodeResult<T> = Ok<T> | Malformed | Unrecognized;

export const ok = <T>(value: T): Ok<T> => ({ status: 'valid', value });

export const malformed = (error: string, raw: string): Malformed => ({
  status: 'malformed',
  error,
  raw,
});

export const unrecognized = (raw: unknown): Unrecognized => ({ status: 'unrecognized', raw });
