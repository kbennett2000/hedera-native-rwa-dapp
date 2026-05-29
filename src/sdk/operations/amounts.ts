/**
 * Marshal a base-unit amount STRING into the SDK's signed-int64 `Long`.
 *
 * `core/` represents amounts as arbitrary-length positive-integer strings; HTS amounts
 * are signed int64. `Long.fromString` silently WRAPS on overflow (uint64-max → -1),
 * which is the same class of silent numeric corruption ADR-0006 exists to prevent. So
 * we round-trip-check and throw rather than hand a wrapped value to the network.
 */

import { Long } from '@hashgraph/sdk';

export function toInt64Long(amount: string): Long {
  const value = Long.fromString(amount);
  if (value.toString() !== amount) {
    throw new Error(`amount '${amount}' exceeds signed int64 range`);
  }
  if (value.isNegative()) {
    throw new Error(`amount '${amount}' must be non-negative`);
  }
  return value;
}
