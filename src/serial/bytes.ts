/** Byte plumbing shared by the REPL protocol and the file transfer code. */

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export function toBytes(data: string | Uint8Array): Uint8Array {
  return typeof data === 'string' ? encoder.encode(data) : data;
}

export function decodeUtf8(data: Uint8Array): string {
  return decoder.decode(data);
}

export function concatBytes(a: Uint8Array, b: Uint8Array): Uint8Array {
  if (!a.length) return b;
  if (!b.length) return a;
  const out = new Uint8Array(a.length + b.length);
  out.set(a, 0);
  out.set(b, a.length);
  return out;
}

/** Index of `needle` in `haystack` at or after `from`, or -1. */
export function indexOfSequence(
  haystack: Uint8Array,
  needle: Uint8Array,
  from = 0,
): number {
  if (!needle.length) return from;
  const last = haystack.length - needle.length;
  outer: for (let i = Math.max(0, from); i <= last; i++) {
    for (let j = 0; j < needle.length; j++) {
      if (haystack[i + j] !== needle[j]) continue outer;
    }
    return i;
  }
  return -1;
}

/**
 * Renders bytes as a Python `bytes` literal, escaping anything that is not
 * plain printable ASCII.
 *
 * Everything we send to the board travels as source code through the REPL, so
 * raw bytes must never appear on the wire: a stray 0x03 in a file would read
 * as Ctrl-C and interrupt the transfer.
 */
export function pyBytesLiteral(data: Uint8Array): string {
  let out = "b'";
  for (const byte of data) {
    if (byte === 0x5c) out += '\\\\';
    else if (byte === 0x27) out += "\\'";
    else if (byte >= 0x20 && byte < 0x7f) out += String.fromCharCode(byte);
    else if (byte === 0x0a) out += '\\n';
    else if (byte === 0x0d) out += '\\r';
    else if (byte === 0x09) out += '\\t';
    else out += `\\x${byte.toString(16).padStart(2, '0')}`;
  }
  return `${out}'`;
}

/**
 * Renders a string as a Python string literal. JSON's escaping rules are a
 * subset of Python's, so `JSON.stringify` output is always valid Python.
 */
export function pyString(value: string): string {
  return JSON.stringify(value);
}

/** Decodes the hex text `binascii.hexlify()` prints back into bytes. */
export function hexToBytes(hex: string): Uint8Array {
  const clean = hex.replace(/\s+/g, '');
  if (clean.length % 2) throw new Error('Truncated hex data from the Pico.');
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = Number.parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
