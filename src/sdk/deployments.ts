/**
 * Local deployment state: the `tokenId` / `topicId` / `operatorId` produced by the
 * issuer scripts, so later scripts and the frontend can find them.
 *
 * `deployments.json` is gitignored local state (ADR-0007); a `deployments.example.json`
 * documents the shape. These functions take an explicit path (default
 * `./deployments.json`) so they are unit-tested against a temp file with no mocking.
 */

import { z } from 'zod';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

export interface Deployments {
  tokenId?: string;
  topicId?: string;
  operatorId?: string;
}

const DeploymentsSchema = z.object({
  tokenId: z.string().optional(),
  topicId: z.string().optional(),
  operatorId: z.string().optional(),
});

const defaultPath = (): string => resolve(process.cwd(), 'deployments.json');

/** Read deployment state. Missing or unparseable file → `{}` (never throws). */
export function readDeployments(path: string = defaultPath()): Deployments {
  let raw: string;
  try {
    raw = readFileSync(path, 'utf8');
  } catch {
    return {};
  }
  try {
    const parsed = DeploymentsSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : {};
  } catch {
    return {};
  }
}

/** Merge `update` into existing deployment state and persist as pretty JSON. Returns the merged result. */
export function writeDeployments(
  update: Partial<Deployments>,
  path: string = defaultPath(),
): Deployments {
  const merged: Deployments = { ...readDeployments(path), ...update };
  writeFileSync(path, JSON.stringify(merged, null, 2) + '\n', 'utf8');
  return merged;
}
