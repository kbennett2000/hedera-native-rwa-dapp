/**
 * Unit tests for src/sdk/deployments.ts
 *
 * Uses real filesystem with unique temp paths per test — no mocking needed.
 * Each test cleans up after itself.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { randomUUID } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { rmSync, existsSync, readFileSync } from 'node:fs';
import { readDeployments, writeDeployments } from '../../../src/sdk/deployments.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a unique temp path that will not exist yet. */
function tempPath(): string {
  return join(tmpdir(), `deployments-test-${randomUUID()}.json`);
}

const createdPaths: string[] = [];

/** Register a path for cleanup and return it. */
function track(p: string): string {
  createdPaths.push(p);
  return p;
}

afterEach(() => {
  for (const p of createdPaths.splice(0)) {
    if (existsSync(p)) {
      rmSync(p);
    }
  }
});

// ---------------------------------------------------------------------------
// readDeployments
// ---------------------------------------------------------------------------

describe('readDeployments', () => {
  it('returns an empty object when the file does not exist', () => {
    const p = tempPath(); // deliberately never created
    const result = readDeployments(p);
    expect(result).toStrictEqual({});
  });

  it('never throws when the file is missing', () => {
    expect(() =>
      readDeployments('/tmp/this-file-definitely-does-not-exist-xyz.json'),
    ).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// writeDeployments
// ---------------------------------------------------------------------------

describe('writeDeployments', () => {
  it('creates the file when it does not exist and stores the deployment', () => {
    const p = track(tempPath());
    writeDeployments({ tokenId: '0.0.5' }, p);
    expect(existsSync(p)).toBe(true);
    const read = readDeployments(p);
    expect(read.tokenId).toBe('0.0.5');
  });

  it('returns the merged object from the write call', () => {
    const p = track(tempPath());
    const result = writeDeployments({ tokenId: '0.0.5' }, p);
    expect(result.tokenId).toBe('0.0.5');
  });

  it('merges a second write with existing data, preserving the first key', () => {
    const p = track(tempPath());
    writeDeployments({ tokenId: '0.0.5' }, p);
    writeDeployments({ topicId: '0.0.6' }, p);
    const read = readDeployments(p);
    expect(read.tokenId).toBe('0.0.5');
    expect(read.topicId).toBe('0.0.6');
  });

  it('second write returns the merged object including the first key', () => {
    const p = track(tempPath());
    writeDeployments({ tokenId: '0.0.5' }, p);
    const result = writeDeployments({ topicId: '0.0.6' }, p);
    expect(result.tokenId).toBe('0.0.5');
    expect(result.topicId).toBe('0.0.6');
  });

  it('overwrites an existing key when the same key is written again', () => {
    const p = track(tempPath());
    writeDeployments({ tokenId: '0.0.5' }, p);
    writeDeployments({ tokenId: '0.0.99' }, p);
    const read = readDeployments(p);
    expect(read.tokenId).toBe('0.0.99');
  });

  it('round-trips a full set of fields', () => {
    const p = track(tempPath());
    const full = { tokenId: '0.0.5', topicId: '0.0.7007', operatorId: '0.0.1001' };
    writeDeployments(full, p);
    const read = readDeployments(p);
    expect(read).toStrictEqual(full);
  });

  it('writes valid JSON (file is parseable)', () => {
    const p = track(tempPath());
    writeDeployments({ tokenId: '0.0.5' }, p);
    const raw = readFileSync(p, 'utf8');
    expect(() => JSON.parse(raw)).not.toThrow();
  });

  it('writes pretty-printed JSON (has newline / indentation)', () => {
    const p = track(tempPath());
    writeDeployments({ tokenId: '0.0.5' }, p);
    const raw = readFileSync(p, 'utf8');
    // Pretty JSON has at least one newline
    expect(raw).toContain('\n');
  });
});
