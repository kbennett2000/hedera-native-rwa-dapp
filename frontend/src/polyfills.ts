// Browser shim for core/mirror/parse.ts, which decodes base64 topic messages with
// Node's Buffer (ADR-0009). Imported first in main.tsx, before anything that calls
// the core parsers at runtime.
import { Buffer } from 'buffer';

if (typeof globalThis.Buffer === 'undefined') {
  globalThis.Buffer = Buffer;
}
