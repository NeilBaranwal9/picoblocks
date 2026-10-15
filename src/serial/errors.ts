/** Error types shared by the connection layer. */

/** The board went away: cable unplugged, port closed, tab suspended. */
export class ConnectionLostError extends Error {
  constructor(message = 'Connection to the Pico was lost.') {
    super(message);
    this.name = 'ConnectionLostError';
  }
}

/** The board did not answer in time. */
export class TimeoutError extends Error {
  /** Whatever had arrived before we gave up, useful when debugging. */
  received: string;

  constructor(message: string, received = '') {
    super(message);
    this.name = 'TimeoutError';
    this.received = received;
  }
}

/** The board answered, but not with anything the REPL protocol allows. */
export class ProtocolError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProtocolError';
  }
}

/** MicroPython raised an exception while running code we sent. */
export class PythonError extends Error {
  /** The full traceback as the board printed it. */
  traceback: string;

  constructor(traceback: string) {
    super(lastLine(traceback) || 'The Pico reported an error.');
    this.name = 'PythonError';
    this.traceback = traceback;
  }
}

/** Another board operation is already in flight. */
export class BusyError extends Error {
  constructor(message = 'The Pico is busy with another job.') {
    super(message);
    this.name = 'BusyError';
  }
}

function lastLine(text: string): string {
  const lines = text.trim().split(/\r?\n/);
  return lines[lines.length - 1]?.trim() ?? '';
}

/** OSError numbers MicroPython raises often, in words a beginner can act on. */
const ERRNO_HINTS: [RegExp, string][] = [
  [/ENOENT|Errno 2\b/, 'There is no file with that name on the Pico.'],
  [/EEXIST|Errno 17\b/, 'Something with that name already exists on the Pico.'],
  [/ENOSPC|Errno 28\b/, "The Pico's storage is full."],
  [/ENOTEMPTY|Errno 39\b/, 'That folder still has files in it.'],
  [/EINVAL|Errno 22\b/, 'The Pico rejected that value. Check the pin number.'],
];

/** A short, human sentence for any error the connection layer can throw. */
export function describeError(error: unknown): string {
  if (error instanceof PythonError) {
    for (const [pattern, hint] of ERRNO_HINTS) {
      if (pattern.test(error.message)) return hint;
    }
    return error.message;
  }
  if (error instanceof TimeoutError) {
    return 'The Pico stopped responding. Try unplugging it and connecting again.';
  }
  if (error instanceof ConnectionLostError) return error.message;
  if (error instanceof ProtocolError) {
    return `Unexpected answer from the Pico: ${error.message}`;
  }
  if (error instanceof DOMException) {
    if (error.name === 'InvalidStateError') return 'That port is already open.';
    if (error.name === 'NetworkError') {
      return 'Could not open the port. Is another program (Thonny, the Arduino IDE, another tab) using the Pico?';
    }
    return error.message;
  }
  return error instanceof Error ? error.message : String(error);
}
