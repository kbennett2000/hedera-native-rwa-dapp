import { describe, it, expect } from 'vitest';
import { createLogger } from '../../../src/core/log.js';

const FIXED_TS = '2026-05-28T00:00:00.000Z';
const fixedNow = (): string => FIXED_TS;

/** Typed sink factory — avoids repeating the explicit annotation on every lambda. */
function makeSink(lines: string[]): (line: string) => void {
  return (line: string) => lines.push(line);
}

describe('createLogger', () => {
  describe('output format', () => {
    it('writes one valid JSON line per call', () => {
      const lines: string[] = [];
      const logger = createLogger('test-module', { sink: makeSink(lines), now: fixedNow });
      logger.info('hello');
      expect(lines).toHaveLength(1);
      expect(() => JSON.parse(lines[0]!)).not.toThrow();
    });

    it('includes level, module, msg, and ts fields', () => {
      const lines: string[] = [];
      const logger = createLogger('my-module', { sink: makeSink(lines), now: fixedNow });
      logger.info('hello');
      const parsed = JSON.parse(lines[0]!) as Record<string, unknown>;
      expect(parsed['level']).toBe('info');
      expect(parsed['module']).toBe('my-module');
      expect(parsed['msg']).toBe('hello');
      expect(parsed['ts']).toBe(FIXED_TS);
    });

    it('merges extra fields into the log line', () => {
      const lines: string[] = [];
      const logger = createLogger('my-module', { sink: makeSink(lines), now: fixedNow });
      logger.info('hello', { tokenId: '0.0.5', count: 3 });
      const parsed = JSON.parse(lines[0]!) as Record<string, unknown>;
      expect(parsed['tokenId']).toBe('0.0.5');
      expect(parsed['count']).toBe(3);
    });

    it('emits exactly the fields documented for a full info call', () => {
      const lines: string[] = [];
      const logger = createLogger('audit', { sink: makeSink(lines), now: fixedNow });
      logger.info('hello', { tokenId: '0.0.5' });
      const parsed = JSON.parse(lines[0]!) as Record<string, unknown>;
      expect(parsed).toMatchObject({
        level: 'info',
        module: 'audit',
        msg: 'hello',
        ts: FIXED_TS,
        tokenId: '0.0.5',
      });
    });
  });

  describe('log levels', () => {
    it('emits debug calls when level is debug', () => {
      const lines: string[] = [];
      const logger = createLogger('m', { level: 'debug', sink: makeSink(lines), now: fixedNow });
      logger.debug('d');
      expect(lines).toHaveLength(1);
    });

    it('emits info calls when level is info', () => {
      const lines: string[] = [];
      const logger = createLogger('m', { level: 'info', sink: makeSink(lines), now: fixedNow });
      logger.info('i');
      expect(lines).toHaveLength(1);
    });

    it('emits warn calls', () => {
      const lines: string[] = [];
      const logger = createLogger('m', { sink: makeSink(lines), now: fixedNow });
      logger.warn('w');
      const parsed = JSON.parse(lines[0]!) as Record<string, unknown>;
      expect(parsed['level']).toBe('warn');
    });

    it('emits error calls', () => {
      const lines: string[] = [];
      const logger = createLogger('m', { sink: makeSink(lines), now: fixedNow });
      logger.error('e');
      const parsed = JSON.parse(lines[0]!) as Record<string, unknown>;
      expect(parsed['level']).toBe('error');
    });

    it('drops debug calls when level is warn', () => {
      const lines: string[] = [];
      const logger = createLogger('m', { level: 'warn', sink: makeSink(lines), now: fixedNow });
      logger.debug('d');
      expect(lines).toHaveLength(0);
    });

    it('drops info calls when level is warn', () => {
      const lines: string[] = [];
      const logger = createLogger('m', { level: 'warn', sink: makeSink(lines), now: fixedNow });
      logger.info('i');
      expect(lines).toHaveLength(0);
    });

    it('emits warn calls when level is warn', () => {
      const lines: string[] = [];
      const logger = createLogger('m', { level: 'warn', sink: makeSink(lines), now: fixedNow });
      logger.warn('w');
      expect(lines).toHaveLength(1);
    });

    it('emits error calls when level is warn', () => {
      const lines: string[] = [];
      const logger = createLogger('m', { level: 'warn', sink: makeSink(lines), now: fixedNow });
      logger.error('e');
      expect(lines).toHaveLength(1);
    });

    it('drops debug, info and warn calls when level is error', () => {
      const lines: string[] = [];
      const logger = createLogger('m', { level: 'error', sink: makeSink(lines), now: fixedNow });
      logger.debug('d');
      logger.info('i');
      logger.warn('w');
      expect(lines).toHaveLength(0);
    });

    it('emits error calls when level is error', () => {
      const lines: string[] = [];
      const logger = createLogger('m', { level: 'error', sink: makeSink(lines), now: fixedNow });
      logger.error('e');
      expect(lines).toHaveLength(1);
    });
  });

  describe('determinism', () => {
    it('uses injected now() for the ts field (no real Date.now)', () => {
      const lines: string[] = [];
      let callCount = 0;
      const deterministicNow = (): string => {
        callCount++;
        return `2026-01-0${callCount}T00:00:00.000Z`;
      };
      const logger = createLogger('m', { sink: makeSink(lines), now: deterministicNow });
      logger.info('first');
      logger.info('second');
      const first = JSON.parse(lines[0]!) as Record<string, unknown>;
      const second = JSON.parse(lines[1]!) as Record<string, unknown>;
      expect(first['ts']).toBe('2026-01-01T00:00:00.000Z');
      expect(second['ts']).toBe('2026-01-02T00:00:00.000Z');
    });
  });
});
