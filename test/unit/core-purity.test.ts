/**
 * Mechanically enforces ADR-0002: src/core/ must contain ZERO network dependencies.
 *
 * Reads every .ts file under src/core/ (recursive) and asserts none of them imports
 * or calls any forbidden network-touching symbol:
 *   - @hashgraph/sdk   (the execution SDK — belongs in src/sdk/ only)
 *   - node:net         (raw TCP)
 *   - node:http        (HTTP client)
 *   - node:https       (HTTPS client)
 *   - fetch(           (browser/Node fetch)
 *
 * This test passes trivially when src/core/ is empty (TDD red phase — no files yet).
 * It guards the implementation step: any accidental import of network code in core/
 * will be caught immediately in the default fast unit loop.
 */

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const CORE_DIR = fileURLToPath(new URL('../../src/core/', import.meta.url));

const FORBIDDEN_PATTERNS = ['@hashgraph/sdk', 'node:net', 'node:http', 'node:https', 'fetch('];

function collectTsFiles(dir: string): string[] {
  const entries = readdirSync(dir);
  const results: string[] = [];
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      results.push(...collectTsFiles(fullPath));
    } else if (entry.endsWith('.ts')) {
      results.push(fullPath);
    }
  }
  return results;
}

describe('core purity guard (ADR-0002)', () => {
  const tsFiles = collectTsFiles(CORE_DIR);

  it('passes trivially when src/core/ contains no .ts files yet', () => {
    // This assertion ensures the test itself does not error when the dir is empty.
    // Once files exist, the per-file tests below will run.
    expect(Array.isArray(tsFiles)).toBe(true);
  });

  for (const filePath of tsFiles) {
    const relativePath = filePath.replace(CORE_DIR, 'src/core/');
    const source = readFileSync(filePath, 'utf8');

    for (const pattern of FORBIDDEN_PATTERNS) {
      it(`${relativePath} does not contain "${pattern}"`, () => {
        expect(source).not.toContain(pattern);
      });
    }
  }
});
