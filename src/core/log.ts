/**
 * Minimal structured logger for module-boundary logging (Tight Feedback Loops).
 *
 * Emits one JSON object per line: `{ level, module, msg, ts, ...fields }`. Zero
 * dependencies. The sink and clock are injectable so tests are deterministic; in
 * production it writes to stderr with an ISO-8601 timestamp.
 *
 * Never pass secrets (operator key, `.env` contents) as fields — see CLAUDE.md.
 * `fields` must be JSON-serializable: a circular reference will throw from
 * `JSON.stringify`. Pass flat, plain structured data (ids, counts, status strings).
 */

export type Level = 'debug' | 'info' | 'warn' | 'error';

export type LogFn = (msg: string, fields?: Record<string, unknown>) => void;

export interface Logger {
  debug: LogFn;
  info: LogFn;
  warn: LogFn;
  error: LogFn;
}

export interface LoggerOptions {
  level?: Level;
  sink?: (line: string) => void;
  now?: () => string;
}

const RANK: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };

const defaultSink = (line: string): void => {
  process.stderr.write(line + '\n');
};

const defaultNow = (): string => new Date().toISOString();

function resolveLevel(explicit?: Level): Level {
  if (explicit) return explicit;
  const env = process.env['LOG_LEVEL'];
  if (env === 'debug' || env === 'info' || env === 'warn' || env === 'error') return env;
  return 'info';
}

export function createLogger(module: string, opts: LoggerOptions = {}): Logger {
  const minLevel = resolveLevel(opts.level);
  const sink = opts.sink ?? defaultSink;
  const now = opts.now ?? defaultNow;

  const emit = (level: Level, msg: string, fields?: Record<string, unknown>): void => {
    if (RANK[level] < RANK[minLevel]) return;
    const line = JSON.stringify({ level, module, msg, ts: now(), ...fields });
    sink(line);
  };

  return {
    debug: (msg, fields) => emit('debug', msg, fields),
    info: (msg, fields) => emit('info', msg, fields),
    warn: (msg, fields) => emit('warn', msg, fields),
    error: (msg, fields) => emit('error', msg, fields),
  };
}
