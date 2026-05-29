/**
 * Pure display formatters. No React, no network. Amounts use BigInt (never float)
 * so values beyond 2^53 render exactly — matching the core base-unit-string rule.
 */

/** Format a base-unit integer string to a decimal string with exactly `decimals` digits. */
export function formatAmount(baseUnits: string, decimals: number): string {
  const negative = baseUnits.startsWith('-');
  const digits = negative ? baseUnits.slice(1) : baseUnits;
  const value = BigInt(digits); // throws on non-integer input — caller passes validated base units
  const sign = negative ? '-' : '';

  if (decimals <= 0) {
    return sign + value.toString();
  }
  const padded = value.toString().padStart(decimals + 1, '0');
  const cut = padded.length - decimals;
  return `${sign}${padded.slice(0, cut)}.${padded.slice(cut)}`;
}

/**
 * Render a Hedera consensus timestamp ("<seconds>.<nanos>") as the UTC ISO string of
 * its seconds. Returns the input unchanged if it isn't a recognizable timestamp.
 */
export function formatConsensusTimestamp(consensusTimestamp: string): string {
  const dot = consensusTimestamp.indexOf('.');
  const secondsStr = dot === -1 ? consensusTimestamp : consensusTimestamp.slice(0, dot);
  if (!/^\d+$/.test(secondsStr)) return consensusTimestamp;
  return new Date(Number(secondsStr) * 1000).toISOString();
}
