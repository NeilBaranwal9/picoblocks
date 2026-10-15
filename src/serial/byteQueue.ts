/**
 * A byte buffer the REPL protocol can await.
 *
 * Serial data arrives in whatever chunks the USB stack feels like, but the
 * protocol wants to read "everything up to the next 0x04" or "exactly two
 * bytes". This queue bridges the two: pushes fill it, reads await it, and a
 * dropped connection fails every pending read at once instead of hanging.
 */
import { concatBytes, decodeUtf8, indexOfSequence, toBytes } from './bytes';
import { TimeoutError } from './errors';

export interface ReadOptions {
  /** Milliseconds to wait. `null` waits forever (a running program). */
  timeoutMs?: number | null;
  /**
   * Restart the timeout every time new data arrives, so a slow-but-alive
   * transfer is not cut off while a genuinely dead board still times out.
   */
  idle?: boolean;
}

export class ByteQueue {
  private buffer: Uint8Array = new Uint8Array(0);
  private waiters = new Set<{ resolve: () => void; reject: (e: Error) => void }>();
  private failure: Error | null = null;

  get length(): number {
    return this.buffer.length;
  }

  push(data: Uint8Array): void {
    if (!data.length) return;
    this.buffer = concatBytes(this.buffer, data);
    this.wake();
  }

  /** Fails every pending and future read until `reset()`. */
  fail(error: Error): void {
    this.failure = error;
    for (const waiter of [...this.waiters]) waiter.reject(error);
    this.waiters.clear();
  }

  /** Drops buffered bytes and clears any failure. */
  reset(): void {
    this.buffer = new Uint8Array(0);
    this.failure = null;
  }

  /** Removes and returns everything buffered right now. */
  takeAll(): Uint8Array {
    const data = this.buffer;
    this.buffer = new Uint8Array(0);
    return data;
  }

  /** Reads up to and including `pattern`, returning everything consumed. */
  async readUntil(
    pattern: string | Uint8Array,
    options: ReadOptions = {},
  ): Promise<Uint8Array> {
    const needle = toBytes(pattern);
    let searchFrom = 0;
    return this.read(options, () => {
      const at = indexOfSequence(this.buffer, needle, searchFrom);
      if (at < 0) {
        // Next time, resume just far enough back to catch a split pattern.
        searchFrom = Math.max(0, this.buffer.length - needle.length + 1);
        return null;
      }
      return this.take(at + needle.length);
    });
  }

  /** Reads exactly `count` bytes. */
  async readExactly(count: number, options: ReadOptions = {}): Promise<Uint8Array> {
    return this.read(options, () =>
      this.buffer.length >= count ? this.take(count) : null,
    );
  }

  /**
   * Streams bytes to `onChunk` until `terminator` shows up, consuming the
   * terminator itself. Used to pipe a running program's output to the terminal
   * as it arrives rather than when it finishes.
   */
  async streamUntil(
    terminator: number,
    onChunk: (chunk: Uint8Array) => void,
    options: ReadOptions = {},
  ): Promise<void> {
    await this.read(options, () => {
      const at = this.buffer.indexOf(terminator);
      if (at < 0) {
        const chunk = this.takeAll();
        if (chunk.length) onChunk(chunk);
        return null;
      }
      const chunk = this.take(at);
      if (chunk.length) onChunk(chunk);
      this.take(1); // the terminator
      return true as const;
    });
  }

  private take(count: number): Uint8Array {
    const data = this.buffer.slice(0, count);
    this.buffer = this.buffer.slice(count);
    return data;
  }

  /** Runs `attempt` after every push until it returns a non-null result. */
  private async read<T>(
    options: ReadOptions,
    attempt: () => T | null,
  ): Promise<T> {
    const { timeoutMs = 5000, idle = false } = options;
    let deadline = timeoutMs === null ? Infinity : Date.now() + timeoutMs;
    for (;;) {
      if (this.failure) throw this.failure;
      const result = attempt();
      if (result !== null) return result;
      const remaining = deadline - Date.now();
      if (remaining <= 0) {
        throw new TimeoutError(
          'The Pico did not answer in time.',
          decodeUtf8(this.buffer),
        );
      }
      const before = this.buffer.length;
      await this.waitForData(remaining);
      if (idle && this.buffer.length > before && timeoutMs !== null) {
        deadline = Date.now() + timeoutMs;
      }
    }
  }

  private waitForData(timeoutMs: number): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const waiter = {
        resolve: () => {
          clearTimeout(timer);
          this.waiters.delete(waiter);
          resolve();
        },
        reject: (error: Error) => {
          clearTimeout(timer);
          this.waiters.delete(waiter);
          reject(error);
        },
      };
      const timer =
        timeoutMs === Infinity
          ? undefined
          : setTimeout(() => waiter.resolve(), timeoutMs);
      this.waiters.add(waiter);
    });
  }

  private wake(): void {
    for (const waiter of [...this.waiters]) waiter.resolve();
  }
}
