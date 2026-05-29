/**
 * Bigint-safe JSON parse for Mirror Node response bodies (ADR-0006).
 *
 * Mirror Node serializes some amount fields (notably `balance`) as UNQUOTED JSON
 * numbers. `JSON.parse` coerces those through an IEEE-754 double, silently losing
 * precision past 2^53 BEFORE any of our code can see them. This parser uses the
 * reviver's source-text access (`context.source`, the original numeric literal,
 * available in Node >= 22) to capture designated amount keys as their EXACT string,
 * so balances of any size survive intact. Amounts come out as strings; all other
 * values parse normally (e.g. `decimals` stays a number).
 *
 * If the runtime does not support source-text access, this throws rather than
 * falling back to lossy parsing — a loud failure beats a silently wrong balance.
 */

type SourceReviver = (
  this: unknown,
  key: string,
  value: unknown,
  context?: { source?: string },
) => unknown;

// Re-type JSON.parse to accept the three-argument (source-access) reviver without
// depending on whether the installed lib typings include the `context` parameter.
const parseWithSource = JSON.parse as (text: string, reviver: SourceReviver) => unknown;

let sourceAccessChecked = false;
let sourceAccessSupported = false;

function assertSourceAccess(): void {
  if (!sourceAccessChecked) {
    sourceAccessChecked = true;
    let seen = false;
    parseWithSource('{"probe":1}', (key, value, context) => {
      // Verify exactly what the production path depends on: a string `source`
      // literal. A runtime that passes a context without `source` must NOT pass.
      if (key === 'probe' && typeof context?.source === 'string') seen = true;
      return value;
    });
    sourceAccessSupported = seen;
  }
  if (!sourceAccessSupported) {
    throw new Error(
      'parseJsonBigintSafe requires JSON.parse source-text access (Node >= 22). ' +
        'Upgrade the runtime or supply a lossless JSON parser (see ADR-0006).',
    );
  }
}

/**
 * Parse `text`, preserving the keys in `amountKeys` as exact decimal strings.
 * Throws on invalid JSON or an unsupported runtime.
 */
export function parseJsonBigintSafe(text: string, amountKeys: ReadonlySet<string>): unknown {
  assertSourceAccess();
  return parseWithSource(text, function (key, value, context) {
    if (amountKeys.has(key)) {
      if (typeof value === 'number') {
        // Prefer the exact source literal; fall back to String() only if absent.
        return context?.source ?? String(value);
      }
      // Already a quoted string on the wire — pass through unchanged.
      return value;
    }
    return value;
  });
}

/** Amount keys the Mirror Node serializes as large integers — must stay exact strings. */
export const MIRROR_AMOUNT_KEYS: ReadonlySet<string> = new Set([
  'balance',
  'total_supply',
  'initial_supply',
  'max_supply',
]);
