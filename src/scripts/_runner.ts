/**
 * Shared bootstrap for the issuer CLI scripts.
 *
 * Loads `.env` (Node built-in, no dotenv — ADR-0007), validates config, builds the
 * operator client, runs the action, and always closes the client. Also provides the
 * small helpers scripts share: argv access, deployments lookup, and audit-message
 * submission. Scripts stay thin: parse args → call op → log → append audit.
 */

import { createLogger, encodeAuditMessage } from '../core/index.js';
import type { Logger, AuditEventType } from '../core/index.js';
import {
  loadConfig,
  createOperatorClient,
  readDeployments,
  executeSubmitAuditMessage,
} from '../sdk/index.js';
import type { OperatorContext } from '../sdk/index.js';

/** Load `./.env` if present; harmless when env is already set in the shell. */
function loadDotEnv(): void {
  const loadEnvFile = (process as { loadEnvFile?: (path?: string) => void }).loadEnvFile;
  try {
    loadEnvFile?.();
  } catch {
    // no .env file — rely on the shell environment
  }
}

/** Run a named issuer action with a ready operator context; always closes the client. */
export async function runScript(
  name: string,
  fn: (ctx: OperatorContext, log: Logger) => Promise<void>,
): Promise<void> {
  loadDotEnv();
  const log = createLogger(name);
  let operator: OperatorContext | undefined;
  try {
    operator = createOperatorClient(loadConfig());
    await fn(operator, log);
  } catch (err) {
    log.error('script failed', { error: err instanceof Error ? err.message : String(err) });
    process.exitCode = 1;
  } finally {
    operator?.client.close();
  }
}

/** CLI positional args (everything after `tsx script.ts`). */
export function argv(): string[] {
  return process.argv.slice(2);
}

/** Require a positional argument or throw a clear usage error. */
export function requireArg(args: string[], index: number, name: string): string {
  const value = args[index];
  if (value === undefined || value === '') {
    throw new Error(`missing required argument: ${name}`);
  }
  return value;
}

/** True if a `--flag` is present. */
export function hasFlag(args: string[], flag: string): boolean {
  return args.includes(flag);
}

/** Read tokenId + topicId from deployments.json or throw with a clear next step. */
export function requireTokenAndTopic(): { tokenId: string; topicId: string } {
  const { tokenId, topicId } = readDeployments();
  if (!tokenId) throw new Error('no tokenId in deployments.json — run 01-create-token first');
  if (!topicId) throw new Error('no topicId in deployments.json — run 02-create-audit-topic first');
  return { tokenId, topicId };
}

export interface AuditEvent {
  type: AuditEventType;
  tokenId: string;
  subject?: string;
  amount?: string;
  note?: string;
}

/** Encode and submit one audit message to the token's topic. */
export async function appendAudit(
  ctx: OperatorContext,
  topicId: string,
  event: AuditEvent,
  log: Logger,
): Promise<void> {
  const message = encodeAuditMessage({
    v: 1,
    type: event.type,
    tokenId: event.tokenId,
    ts: new Date().toISOString(),
    actor: ctx.operatorId,
    subject: event.subject,
    amount: event.amount,
    note: event.note,
  });
  const result = await executeSubmitAuditMessage(topicId, message, ctx);
  log.info('audit message submitted', { type: event.type, sequenceNumber: result.sequenceNumber });
}
