/**
 * A simulated Pico: the half of the raw REPL that lives on the board.
 *
 * The tests run the whole connection layer against it, and `npm run dev`
 * exposes it as `picoblocksSimulate()` in the console so the UI can be tried
 * without hardware. It is never part of a production build.
 *
 * It follows MicroPython's `pyexec.c` state machine closely enough to catch
 * real protocol mistakes — prompts, the "OK" acknowledgement, the 0x04
 * framing, raw-paste flow control, and the firmware variants that do not
 * support raw paste. Code is not actually executed: an "executor" answers the
 * handful of snippets PicoBlocks sends, against an in-memory filesystem.
 */
import type { PicoConnectionManager } from '../serial/PicoConnectionManager';
import type { SerialTransport, TransportCloseReason } from '../serial/transport';

const RAW_BANNER = 'raw REPL; CTRL-B to exit\r\n';
const FRIENDLY_BANNER =
  'MicroPython v1.24.1 on 2024-11-29; Raspberry Pi Pico W with RP2040\r\n' +
  'Type "help()" for more information.\r\n>>> ';

export type ExecOutcome = { stdout: string; stderr: string } | 'running';
export type Executor = (code: string, board: FakePico) => ExecOutcome;

export interface FakePicoOptions {
  /**
   * How the firmware answers a raw-paste request:
   *   modern      - supports it (MicroPython 1.14+)
   *   unsupported - understands the request and declines ("R\0")
   *   ancient     - never heard of it, resets the raw REPL instead
   */
  rawPaste?: 'modern' | 'unsupported' | 'ancient';
  windowSize?: number;
  executor?: Executor;
  files?: Record<string, string | Uint8Array>;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export class FakePico implements SerialTransport {
  onData: ((data: Uint8Array) => void) | null = null;
  onClose: ((reason: TransportCloseReason, error?: unknown) => void) | null = null;
  readonly device = { usbVendorId: 0x2e8a, usbProductId: 0x0005 };

  /** The board's flash, keyed by absolute path. */
  files = new Map<string, Uint8Array>();
  /** Every source string the host asked the board to execute. */
  executed: string[] = [];
  /** Bytes typed at the board while a program was running. */
  stdin = '';
  /** How many soft resets the host has triggered. */
  softResets = 0;

  private mode: 'friendly' | 'raw' | 'rawpaste' | 'running' = 'friendly';
  private line: number[] = [];
  private paste: number[] = [];
  private pasteUngranted = 0;
  private rawPaste: 'modern' | 'unsupported' | 'ancient';
  private windowSize: number;
  /** Swappable so a test can simulate a board that starts misbehaving. */
  executor: Executor;
  private closed = false;

  constructor(options: FakePicoOptions = {}) {
    this.rawPaste = options.rawPaste ?? 'modern';
    this.windowSize = options.windowSize ?? 128;
    this.executor = options.executor ?? filesystemExecutor;
    for (const [path, content] of Object.entries(options.files ?? {})) {
      this.files.set(
        path,
        typeof content === 'string' ? encoder.encode(content) : content,
      );
    }
  }

  // ----------------------------------------------------- transport side

  async write(data: Uint8Array): Promise<void> {
    for (const byte of data) this.receive(byte);
  }

  async close(): Promise<void> {
    if (this.closed) return;
    this.closed = true;
    this.onClose?.('closed');
  }

  /** Simulates the cable being pulled out. */
  unplug(): void {
    if (this.closed) return;
    this.closed = true;
    this.onClose?.('lost');
  }

  /** Output from a program that is currently running. */
  emitStdout(text: string): void {
    this.send(text);
  }

  private send(text: string | Uint8Array): void {
    if (this.closed) return;
    const bytes = typeof text === 'string' ? encoder.encode(text) : text;
    // Deliver asynchronously, the way a real serial port does.
    setTimeout(() => {
      if (!this.closed) this.onData?.(bytes);
    }, 0);
  }

  // -------------------------------------------------- the REPL itself

  private receive(byte: number): void {
    switch (this.mode) {
      case 'friendly':
        this.friendly(byte);
        break;
      case 'raw':
        this.raw(byte);
        break;
      case 'rawpaste':
        this.rawpaste(byte);
        break;
      case 'running':
        this.whileRunning(byte);
        break;
    }
  }

  private friendly(byte: number): void {
    if (byte === 0x01) {
      this.mode = 'raw';
      this.line = [];
      this.send(`${RAW_BANNER}>`);
    } else if (byte === 0x03) {
      this.send('\r\n>>> ');
    } else if (byte === 0x04) {
      this.softResets++;
      this.send('MPY: soft reboot\r\n');
      this.runMainPy();
      this.send(FRIENDLY_BANNER);
    } else if (byte === 0x0d) {
      this.send('\r\n>>> ');
    } else {
      this.send(String.fromCharCode(byte)); // echo
    }
  }

  private raw(byte: number): void {
    if (byte === 0x01) {
      // Ctrl-A after exactly "\x05A" is the raw-paste request.
      if (this.line.length === 2 && this.line[0] === 0x05 && this.line[1] === 0x41) {
        this.line = [];
        if (this.rawPaste === 'modern') {
          this.mode = 'rawpaste';
          this.paste = [];
          this.pasteUngranted = 0;
          this.send(
            new Uint8Array([
              0x52,
              0x01,
              this.windowSize & 0xff,
              (this.windowSize >> 8) & 0xff,
            ]),
          );
          return;
        }
        if (this.rawPaste === 'unsupported') {
          this.send(new Uint8Array([0x52, 0x00]));
          return;
        }
      }
      this.line = [];
      this.send(`${RAW_BANNER}>`); // reset raw REPL
    } else if (byte === 0x02) {
      this.mode = 'friendly';
      this.line = [];
      this.send(`\r\n${FRIENDLY_BANNER}`);
    } else if (byte === 0x03) {
      this.line = [];
    } else if (byte === 0x04) {
      this.send('OK');
      if (!this.line.length) {
        // Empty command means "soft reset and stay in raw mode".
        this.softResets++;
        this.send(`\r\nMPY: soft reboot\r\n${RAW_BANNER}>`);
        return;
      }
      const code = decoder.decode(new Uint8Array(this.line));
      this.line = [];
      this.execute(code);
    } else {
      this.line.push(byte);
    }
  }

  private rawpaste(byte: number): void {
    if (byte === 0x04) {
      this.send(new Uint8Array([0x04])); // acknowledge end of data
      const code = decoder.decode(new Uint8Array(this.paste));
      this.paste = [];
      this.mode = 'raw';
      this.execute(code);
      return;
    }
    this.paste.push(byte);
    this.pasteUngranted++;
    if (this.pasteUngranted >= this.windowSize) {
      this.pasteUngranted = 0;
      this.send(new Uint8Array([0x01])); // room for another window
    }
  }

  private whileRunning(byte: number): void {
    if (byte === 0x03) {
      this.finishExec({
        stdout: '',
        stderr:
          'Traceback (most recent call last):\r\n' +
          '  File "<stdin>", line 7, in <module>\r\n' +
          'KeyboardInterrupt: \r\n',
      });
      return;
    }
    this.stdin += String.fromCharCode(byte);
  }

  private execute(code: string): void {
    this.executed.push(code);
    const outcome = this.executor(code, this);
    if (outcome === 'running') {
      this.mode = 'running';
      return;
    }
    this.finishExec(outcome);
  }

  private finishExec(result: { stdout: string; stderr: string }): void {
    this.mode = 'raw';
    this.send(`${result.stdout}\x04${result.stderr}\x04>`);
  }

  private runMainPy(): void {
    const main = this.files.get('/main.py');
    if (!main) return;
    this.send(`[main.py ran: ${decoder.decode(main).split('\n').length} lines]\r\n`);
  }
}

// --------------------------------------------------------------------------
// A stand-in for MicroPython: understands exactly the snippets PicoBlocks
// sends, so file transfers can be tested end to end.
// --------------------------------------------------------------------------

interface WriteSession {
  path: string;
  chunks: Uint8Array[];
}

const writeSessions = new WeakMap<FakePico, WriteSession>();

export const filesystemExecutor: Executor = (code, board) => {
  const ok = (stdout = '') => ({ stdout, stderr: '' });
  const oops = (message: string) => ({
    stdout: '',
    stderr: `Traceback (most recent call last):\r\n  File "<stdin>", line 1, in <module>\r\n${message}\r\n`,
  });

  // open(path, 'wb') — start of a file upload
  const open = code.match(/_f = open\((".*?"), 'wb'\)/);
  if (open) {
    writeSessions.set(board, { path: JSON.parse(open[1]), chunks: [] });
    return ok();
  }

  // _w(b'...') — one chunk of the upload
  const chunk = code.match(/^_w\((b'.*')\)$/s);
  if (chunk) {
    const session = writeSessions.get(board);
    if (!session) return oops('NameError: name \'_w\' is not defined');
    session.chunks.push(parsePyBytes(chunk[1]));
    return ok();
  }

  // _f.close() ... os.rename(tmp, path) — commit the upload
  if (code.includes('_f.close()') && code.includes('os.rename(')) {
    const session = writeSessions.get(board);
    if (!session) return oops('NameError: name \'_f\' is not defined');
    const rename = code.match(/os\.rename\((".*?"), (".*?")\)/);
    if (!rename) return oops('SyntaxError: invalid syntax');
    const target = JSON.parse(rename[2]) as string;
    const data = concat(session.chunks);
    board.files.set(target, data);
    writeSessions.delete(board);
    return ok(`${data.length}\r\n`);
  }

  // Abandoned upload: close and delete the temporary file.
  if (code.includes('_f.close()') && code.includes('os.remove(')) {
    const session = writeSessions.get(board);
    writeSessions.delete(board);
    if (session) return ok();
    return ok();
  }

  // hexlify loop — download a file
  if (code.includes('_ba.hexlify')) {
    const path = code.match(/_f = open\((".*?"), 'rb'\)/);
    if (!path) return oops('SyntaxError: invalid syntax');
    const data = board.files.get(JSON.parse(path[1]) as string);
    if (!data) return oops('OSError: [Errno 2] ENOENT');
    let stdout = '';
    for (let i = 0; i < data.length; i += 256) {
      stdout += `${toHex(data.slice(i, i + 256))}\r\n`;
    }
    return ok(stdout);
  }

  // os.ilistdir(path) — directory listing plus free space
  if (code.includes('os.ilistdir(')) {
    const match = code.match(/os\.ilistdir\((".*?")\)/);
    const path = JSON.parse(match?.[1] ?? '"/"') as string;
    const prefix = path.endsWith('/') ? path : `${path}/`;
    const seen = new Map<string, [string, boolean, number]>();
    for (const [filePath, data] of board.files) {
      if (!filePath.startsWith(prefix)) continue;
      const rest = filePath.slice(prefix.length);
      const slash = rest.indexOf('/');
      if (slash === -1) seen.set(rest, [rest, false, data.length]);
      else seen.set(rest.slice(0, slash), [rest.slice(0, slash), true, 0]);
    }
    const total = 1441792;
    const used = [...board.files.values()].reduce((sum, d) => sum + d.length, 0);
    return ok(`${JSON.stringify([[...seen.values()], total, total - used])}\r\n`);
  }

  // os.remove / os.rmdir
  const remove = code.match(/os\.(remove|rmdir)\((".*?")\)/);
  if (remove) {
    const path = JSON.parse(remove[2]) as string;
    if (!board.files.has(path) && remove[1] === 'remove') {
      return oops('OSError: [Errno 2] ENOENT');
    }
    board.files.delete(path);
    return ok();
  }

  // Standalone rename
  const rename = code.match(/^import os\nos\.rename\((".*?"), (".*?")\)$/);
  if (rename) {
    const from = JSON.parse(rename[1]) as string;
    const to = JSON.parse(rename[2]) as string;
    const data = board.files.get(from);
    if (!data) return oops('OSError: [Errno 2] ENOENT');
    board.files.delete(from);
    board.files.set(to, data);
    return ok();
  }

  // A generated program: an endless loop keeps running until Ctrl-C.
  if (/^while True:/m.test(code)) return 'running';

  // Anything else (pin cleanup, mkdir, one-off statements) just succeeds.
  return ok();
};

function concat(chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

function toHex(data: Uint8Array): string {
  return [...data].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

/** Decodes a Python `bytes` literal the way MicroPython's parser would. */
export function parsePyBytes(literal: string): Uint8Array {
  const body = literal.slice(2, -1); // strip b' and '
  const out: number[] = [];
  for (let i = 0; i < body.length; i++) {
    const char = body[i];
    if (char !== '\\') {
      out.push(char.charCodeAt(0));
      continue;
    }
    const next = body[++i];
    if (next === 'x') {
      out.push(Number.parseInt(body.slice(i + 1, i + 3), 16));
      i += 2;
    } else if (next === 'n') out.push(0x0a);
    else if (next === 'r') out.push(0x0d);
    else if (next === 't') out.push(0x09);
    else out.push(next.charCodeAt(0)); // \\ and \'
  }
  return new Uint8Array(out);
}

/**
 * Attaches a simulated board to the app's connection manager. Development
 * only: call `picoblocksSimulate()` from the browser console.
 */
export function attachSimulatedBoard(manager: PicoConnectionManager): FakePico {
  const board = new FakePico({
    files: {
      '/main.py': ['# Code automatically generated by PicoBlocks', 'print("hello")', ''].join('\n'),
      '/boot.py': '# runs before main.py\n',
      '/lib/helper.py': ['def hello():', '    print("hi")', ''].join('\n'),
    },
  });
  manager.attach(board);
  return board;
}
