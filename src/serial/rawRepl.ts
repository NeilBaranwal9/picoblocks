/**
 * MicroPython's raw REPL, spoken over any byte channel.
 *
 * This is the same wire protocol `mpremote`, `ampy` and Thonny use:
 *
 *   Ctrl-C  (0x03)  interrupt whatever is running
 *   Ctrl-A  (0x01)  enter raw REPL   -> "raw REPL; CTRL-B to exit\r\n>"
 *   Ctrl-D  (0x04)  at the ">" prompt with no code: soft reset
 *   \x05A\x01       ask for raw-paste mode (flow-controlled upload)
 *   <source> Ctrl-D run it          -> "OK" <stdout> 0x04 <stderr> 0x04 ">"
 *   Ctrl-B  (0x02)  back to the friendly ">>>" REPL
 *
 * Nothing here knows about Web Serial, which is what makes it testable
 * against a simulated board.
 */
import { concatBytes, decodeUtf8, sleep, toBytes } from './bytes';
import type { ByteQueue } from './byteQueue';
import { ProtocolError, PythonError } from './errors';

export interface ReplChannel {
  write(data: string | Uint8Array): Promise<void>;
  rx: ByteQueue;
}

/** Raw-paste support is decided once per connection and remembered. */
export interface ReplState {
  useRawPaste: boolean;
}

export const RAW_BANNER = 'raw REPL; CTRL-B to exit\r\n';
export const FRIENDLY_PROMPT = '>>> ';
export const EOF = 0x04;

/** Chunk size for the non-flow-controlled fallback, as mpremote uses. */
const PLAIN_CHUNK = 256;
const PROTOCOL_TIMEOUT = 5000;
const RESET_TIMEOUT = 10000;
/** Time for a program to notice Ctrl-C and for its output to drain. */
const INTERRUPT_SETTLE_MS = 60;

/**
 * Interrupts any running program and enters the raw REPL, leaving the ">"
 * prompt unread for `execNoFollow`.
 *
 * With `softReset`, the board also restarts MicroPython (clearing variables,
 * timers and PWM) before returning, which is what makes a Run reproducible.
 * `main.py` does *not* run on this reset, because the board is in raw mode.
 */
export async function enterRawRepl(
  channel: ReplChannel,
  options: { softReset?: boolean; attempts?: number } = {},
): Promise<void> {
  const { softReset = false, attempts = 3 } = options;
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      // Two separate Ctrl-Cs: some firmware flushes its input buffer when it
      // sees one, which would swallow a Ctrl-A sent in the same breath.
      await channel.write('\r\x03');
      await sleep(INTERRUPT_SETTLE_MS);
      await channel.write('\x03');
      await sleep(INTERRUPT_SETTLE_MS);
      channel.rx.takeAll(); // drop the interrupted program's output
      await channel.write('\r\x01');

      if (softReset) {
        await channel.rx.readUntil(`${RAW_BANNER}>`, { timeoutMs: PROTOCOL_TIMEOUT });
        await channel.write('\x04');
        // Split in two reads so anything boot.py prints lands in between.
        await channel.rx.readUntil('soft reboot\r\n', { timeoutMs: RESET_TIMEOUT });
        await channel.rx.readUntil(RAW_BANNER, { timeoutMs: RESET_TIMEOUT });
      } else {
        await channel.rx.readUntil(RAW_BANNER, { timeoutMs: PROTOCOL_TIMEOUT });
      }
      return;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

/** Returns the board to the friendly `>>>` REPL, swallowing its banner. */
export async function exitRawRepl(channel: ReplChannel): Promise<void> {
  await channel.write('\r\x02');
  await channel.rx
    .readUntil(FRIENDLY_PROMPT, { timeoutMs: 2000 })
    .catch(() => undefined);
}

/**
 * Uploads code and starts it, without waiting for it to finish. On return the
 * board is executing, and `follow()` collects the output.
 */
export async function execNoFollow(
  channel: ReplChannel,
  code: string,
  state: ReplState,
): Promise<void> {
  const data = toBytes(code);
  await channel.rx.readUntil('>', { timeoutMs: PROTOCOL_TIMEOUT });

  if (state.useRawPaste) {
    await channel.write('\x05A\x01');
    const response = await channel.rx.readExactly(2, { timeoutMs: PROTOCOL_TIMEOUT });
    if (response[0] === 0x52 && response[1] === 0x01) {
      await rawPasteWrite(channel, data);
      return;
    }
    state.useRawPaste = false;
    if (!(response[0] === 0x52 && response[1] === 0x00)) {
      // Firmware older than 1.14: it took "\x05A" as input and the Ctrl-A
      // reset the raw REPL, so wait for the banner it just printed.
      await channel.rx.readUntil('w REPL; CTRL-B to exit\r\n>', {
        timeoutMs: PROTOCOL_TIMEOUT,
      });
    }
  }

  for (let i = 0; i < data.length; i += PLAIN_CHUNK) {
    await channel.write(data.slice(i, i + PLAIN_CHUNK));
    await sleep(10);
  }
  await channel.write('\x04');
  const ack = await channel.rx.readExactly(2, { timeoutMs: PROTOCOL_TIMEOUT });
  if (decodeUtf8(ack) !== 'OK') {
    throw new ProtocolError(
      `the board would not accept the code (it replied ${JSON.stringify(decodeUtf8(ack))})`,
    );
  }
}

/**
 * Raw-paste mode: the board hands out a window of bytes it can accept, and
 * sends 0x01 whenever it has room for another window. Without this, a long
 * program overruns the board's 512-byte input buffer.
 */
async function rawPasteWrite(channel: ReplChannel, data: Uint8Array): Promise<void> {
  const header = await channel.rx.readExactly(2, { timeoutMs: PROTOCOL_TIMEOUT });
  const windowSize = header[0] | (header[1] << 8);
  let windowRemain = windowSize;
  let sent = 0;

  while (sent < data.length) {
    while (windowRemain === 0 || channel.rx.length > 0) {
      const [byte] = await channel.rx.readExactly(1, { timeoutMs: PROTOCOL_TIMEOUT });
      if (byte === 0x01) {
        windowRemain += windowSize;
      } else if (byte === EOF) {
        // The board wants to stop early; acknowledge and let follow() report.
        await channel.write('\x04');
        return;
      } else {
        throw new ProtocolError(
          `unexpected byte 0x${byte.toString(16)} during raw paste`,
        );
      }
    }
    const end = Math.min(sent + windowRemain, data.length);
    await channel.write(data.slice(sent, end));
    windowRemain -= end - sent;
    sent = end;
  }

  await channel.write('\x04');
  await channel.rx.readUntil('\x04', { timeoutMs: PROTOCOL_TIMEOUT });
}

export interface FollowOptions {
  onStdout?: (chunk: Uint8Array) => void;
  onStderr?: (chunk: Uint8Array) => void;
  /** `null` waits indefinitely, for a program with a forever loop. */
  timeoutMs?: number | null;
}

/**
 * Reads a running program's output: stdout up to the first 0x04, then the
 * traceback up to the second. Leaves the ">" prompt for the next exec.
 */
export async function follow(
  channel: ReplChannel,
  options: FollowOptions = {},
): Promise<void> {
  const { onStdout, onStderr, timeoutMs = 10000 } = options;
  await channel.rx.streamUntil(EOF, (chunk) => onStdout?.(chunk), {
    timeoutMs,
    idle: true,
  });
  // Once stdout has ended the traceback follows immediately, so this read
  // always gets a real timeout even when the program itself had none.
  await channel.rx.streamUntil(EOF, (chunk) => onStderr?.(chunk), {
    timeoutMs: PROTOCOL_TIMEOUT,
    idle: true,
  });
}

export interface ExecResult {
  stdout: string;
  stderr: string;
}

/** Runs code and waits for it to finish, collecting its output. */
export async function exec(
  channel: ReplChannel,
  code: string,
  state: ReplState,
  options: { timeoutMs?: number | null } = {},
): Promise<ExecResult> {
  await execNoFollow(channel, code, state);
  let stdout: Uint8Array = new Uint8Array(0);
  let stderr: Uint8Array = new Uint8Array(0);
  await follow(channel, {
    onStdout: (chunk) => {
      stdout = concatBytes(stdout, chunk);
    },
    onStderr: (chunk) => {
      stderr = concatBytes(stderr, chunk);
    },
    timeoutMs: options.timeoutMs ?? 10000,
  });
  return { stdout: decodeUtf8(stdout), stderr: decodeUtf8(stderr) };
}

/** Runs code, turning a MicroPython traceback into a thrown `PythonError`. */
export async function execChecked(
  channel: ReplChannel,
  code: string,
  state: ReplState,
  options: { timeoutMs?: number | null } = {},
): Promise<string> {
  const { stdout, stderr } = await exec(channel, code, state, options);
  if (stderr.trim()) throw new PythonError(stderr);
  return stdout;
}

/** Soft-resets from the raw REPL prompt, staying in raw mode afterwards. */
export async function softReset(channel: ReplChannel): Promise<void> {
  await channel.rx.readUntil('>', { timeoutMs: PROTOCOL_TIMEOUT });
  await channel.write('\x04');
  await channel.rx.readUntil('soft reboot\r\n', { timeoutMs: RESET_TIMEOUT });
  await channel.rx.readUntil(RAW_BANNER, { timeoutMs: RESET_TIMEOUT });
}
