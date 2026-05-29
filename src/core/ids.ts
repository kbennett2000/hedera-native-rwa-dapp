/**
 * Shared Hedera identifier / amount validation patterns.
 *
 * Centralized so the audit schema, transaction-arg builders, and Mirror Node
 * parsers all validate `0.0.x` ids and base-unit amounts the same way.
 */

/**
 * Hedera entity id in `shard.realm.num` form, e.g. `0.0.123456`.
 * Each segment is a non-negative integer with no leading zeros (canonical form;
 * Hedera/Mirror Node never emit `00.0.1`).
 */
export const ENTITY_ID_RE = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

/** Positive integer base-unit amount as a string (no leading zero, no sign, no decimal). */
export const POSITIVE_INT_RE = /^[1-9]\d*$/;

/** Non-negative integer as a string (allows `"0"`); used for supply fields. */
export const NON_NEGATIVE_INT_RE = /^(0|[1-9]\d*)$/;
