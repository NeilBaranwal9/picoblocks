/**
 * Everything the UI knows about the board.
 *
 * It owns the transport, routes incoming bytes either to the terminal or to
 * the REPL protocol, and runs board operations one at a time through a queue
 * so a file listing can never interleave with a program upload.
 */
import type { GeneratedProgram } from '../generators/assemble';
import { quietPinsCode } from '../generators/assemble';
import { concatBytes, decodeUtf8, toBytes } from './bytes';
import { ByteQueue } from './byteQueue';
import { ConnectionLostError, PythonError } from './errors';
import {
  joinPath,
  listDir,
  makeDirectory,
  readFile,
  removeEntry,
  renameEntry,
  writeFile,
  type DirListing,
  type ReplSession,
} from './fileTransfer';
import {
  enterRawRepl,
  execNoFollow,
  exitRawRepl,
  follow,
  softReset,
  type ReplChannel,
  type ReplState,
} from './rawRepl';
import type { SerialTransport, TransportCloseReason } from './transport';
import {
  requestPicoPort,
  WebSerialTransport,
  isWebSerialSupported,
} from './webSerialTransport';

export type ConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'busy'
  | 'running';

export interface ConnectionState {
  status: ConnectionStatus;
  /** Short description of the current job, for the status pill. */
  activity: string | null;
  /** 0 to 1 while a file transfer is in flight. */
  progress: number | null;
  device: { usbVendorId?: number; usbProductId?: number } | null;
}

export type ConnectionEvent =
  | { type: 'connected' }
  | { type: 'disconnected'; unexpected: boolean }
  | { type: 'filesChanged' };

const DIM = '\x1b[90m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

const INITIAL_STATE: ConnectionState = {
  status: 'disconnected',
  activity: null,
  progress: null,
  device: null,
};

export class PicoConnectionManager {
  private transport: SerialTransport | null = null;
  private rx = new ByteQueue();
  private mode: 'passthrough' | 'protocol' = 'passthrough';
  private state: ConnectionState = INITIAL_STATE;
  private replState: ReplState = { useRawPaste: true };
  private queue: Promise<unknown> = Promise.resolve();
  private stateListeners = new Set<() => void>();
  private terminalListeners = new Set<(data: Uint8Array) => void>();
  private eventListeners = new Set<(event: ConnectionEvent) => void>();
  private stopRequested = false;
  private runningPwmPins: number[] = [];

  // ---------------------------------------------------------------- state

  getState = (): ConnectionState => this.state;

  subscribe = (listener: () => void): (() => void) => {
    this.stateListeners.add(listener);
    return () => this.stateListeners.delete(listener);
  };

  /** Raw bytes for the terminal: board output plus our own status lines. */
  onTerminalData(listener: (data: Uint8Array) => void): () => void {
    this.terminalListeners.add(listener);
    return () => this.terminalListeners.delete(listener);
  }

  onEvent(listener: (event: ConnectionEvent) => void): () => void {
    this.eventListeners.add(listener);
    return () => this.eventListeners.delete(listener);
  }

  get isConnected(): boolean {
    return this.state.status !== 'disconnected' && this.state.status !== 'connecting';
  }

  // ----------------------------------------------------------- connecting

  /**
   * Shows the browser's port picker and opens the chosen board. Returns false
   * if the user dismissed the picker.
   */
  async connect(options: { showAllDevices?: boolean } = {}): Promise<boolean> {
    if (this.state.status !== 'disconnected') return this.isConnected;
    if (!isWebSerialSupported()) {
      throw new Error('This browser does not support Web Serial.');
    }
    this.setState({ status: 'connecting', activity: 'Waiting for you to pick a port' });
    let port: SerialPort | null;
    try {
      port = await requestPicoPort(options.showAllDevices);
    } catch (error) {
      this.setState(INITIAL_STATE);
      throw error;
    }
    if (!port) {
      this.setState(INITIAL_STATE);
      return false;
    }
    try {
      this.setState({ status: 'connecting', activity: 'Opening the port' });
      const transport = await WebSerialTransport.open(port);
      this.attach(transport);
      return true;
    } catch (error) {
      this.setState(INITIAL_STATE);
      throw error;
    }
  }

  /** Attaches an already-open transport. The tests use this with a fake board. */
  attach(transport: SerialTransport): void {
    this.transport = transport;
    this.rx.reset();
    this.mode = 'passthrough';
    this.replState = { useRawPaste: true };
    transport.onData = (data) => {
      if (this.mode === 'protocol') this.rx.push(data);
      else this.emitTerminal(data);
    };
    transport.onClose = (reason) => this.handleClosed(reason);
    this.setState({
      status: 'connected',
      activity: null,
      progress: null,
      device: transport.device,
    });
    this.emit({ type: 'connected' });
    // Nudge the board so the terminal shows a prompt straight away.
    void this.writeRaw('\r').catch(() => undefined);
  }

  async disconnect(): Promise<void> {
    const transport = this.transport;
    if (!transport) return;
    this.transport = null;
    this.rx.fail(new ConnectionLostError('Disconnected.'));
    await transport.close().catch(() => undefined);
    this.setState(INITIAL_STATE);
    this.emit({ type: 'disconnected', unexpected: false });
  }

  private handleClosed(reason: TransportCloseReason): void {
    if (!this.transport) return;
    this.transport = null;
    this.rx.fail(new ConnectionLostError());
    this.mode = 'passthrough';
    this.setState(INITIAL_STATE);
    if (reason === 'lost') {
      this.emitTerminal(`\r\n${RED}-- connection lost --${RESET}\r\n`);
    }
    this.emit({ type: 'disconnected', unexpected: reason === 'lost' });
  }

  // -------------------------------------------------------------- terminal

  /** Sends what the user typed in the terminal straight to the board. */
  sendTerminalInput(data: string): void {
    if (this.mode === 'protocol' && this.state.status !== 'running') return;
    if (this.state.status === 'running' && data.includes('\x03')) {
      this.stopRequested = true;
    }
    void this.writeRaw(data).catch(() => undefined);
  }

  /**
   * Soft-reboots MicroPython from the friendly REPL, which is what a power
   * cycle does: `main.py` runs and its output lands in the terminal.
   */
  async resetBoard(): Promise<void> {
    if (this.state.status !== 'connected') return;
    await this.writeRaw('\x03');
    await this.writeRaw('\r\x04');
  }

  // ------------------------------------------------------------ programs

  /**
   * Runs a program on the board. The returned promise settles when the
   * program ends, which for a `forever` loop means when Stop is pressed.
   */
  async run(program: GeneratedProgram): Promise<void> {
    await this.exclusive('Starting program', async () => {
      this.stopRequested = false;
      this.runningPwmPins = program.pwmPins;
      // A soft reset first, so every run starts from the same clean state.
      await enterRawRepl(this.channel, { softReset: true });
      await execNoFollow(this.channel, program.code, this.replState);

      this.setState({ status: 'running', activity: 'Program running' });
      this.emitTerminal(`${DIM}-- running --${RESET}\r\n`);

      let stderr: Uint8Array = new Uint8Array(0);
      await follow(this.channel, {
        onStdout: (chunk) => this.emitTerminal(chunk),
        onStderr: (chunk) => {
          stderr = concatBytes(stderr, chunk);
        },
        timeoutMs: null,
      });

      const traceback = decodeUtf8(stderr).trim();
      const interrupted = this.stopRequested && traceback.includes('KeyboardInterrupt');
      if (interrupted) {
        this.emitTerminal(`${DIM}-- stopped --${RESET}\r\n`);
      } else if (traceback) {
        this.emitTerminal(`${RED}${traceback.replace(/\n/g, '\r\n')}${RESET}\r\n`);
      } else {
        this.emitTerminal(`${DIM}-- finished --${RESET}\r\n`);
      }

      if (this.stopRequested) await this.quieten();
      await exitRawRepl(this.channel);
      this.emitTerminal('>>> ');

      if (traceback && !interrupted) throw new PythonError(traceback);
    });
  }

  /** Interrupts a running program with Ctrl-C, escalating if it ignores us. */
  async stop(): Promise<void> {
    if (this.state.status !== 'running') return;
    this.stopRequested = true;
    this.setState({ activity: 'Stopping' });
    for (let attempt = 0; attempt < 3; attempt++) {
      await this.writeRaw('\x03');
      if (await this.waitWhileRunning(1500)) return;
    }
    throw new Error(
      'The program is not responding to Stop. Unplug the Pico and plug it back in.',
    );
  }

  /**
   * After a Stop, put the pins the program used back to a quiet state: a
   * buzzer interrupted mid-tone would otherwise keep screaming.
   */
  private async quieten(): Promise<void> {
    await softReset(this.channel);
    const code = quietPinsCode(this.runningPwmPins);
    if (!code) return;
    await execNoFollow(this.channel, code, this.replState);
    await follow(this.channel, { timeoutMs: 3000 });
  }

  // ----------------------------------------------------------------- files

  /** Writes a file to the board's flash, e.g. `/main.py`. */
  async saveFile(path: string, data: Uint8Array | string): Promise<void> {
    const bytes = toBytes(data);
    await this.withRawRepl(`Saving ${path}`, async (session) => {
      await writeFile(session, path, bytes, (written, total) => {
        this.setState({ progress: total ? written / total : 1 });
      });
    });
    this.emit({ type: 'filesChanged' });
  }

  async listFiles(path = '/'): Promise<DirListing> {
    return this.withRawRepl('Reading files', (session) => listDir(session, path));
  }

  async readBoardFile(path: string): Promise<Uint8Array> {
    return this.withRawRepl(`Reading ${path}`, (session) => readFile(session, path));
  }

  async deleteEntry(path: string, isDir: boolean): Promise<void> {
    await this.withRawRepl(`Deleting ${path}`, (session) =>
      removeEntry(session, path, isDir),
    );
    this.emit({ type: 'filesChanged' });
  }

  async renameEntry(from: string, to: string): Promise<void> {
    await this.withRawRepl(`Renaming ${from}`, (session) =>
      renameEntry(session, from, to),
    );
    this.emit({ type: 'filesChanged' });
  }

  async createFolder(parent: string, name: string): Promise<void> {
    await this.withRawRepl(`Creating ${name}`, (session) =>
      makeDirectory(session, joinPath(parent, name)),
    );
    this.emit({ type: 'filesChanged' });
  }

  // ------------------------------------------------------------ internals

  private get channel(): ReplChannel {
    return { write: (data) => this.writeRaw(data), rx: this.rx };
  }

  private get session(): ReplSession {
    return { channel: this.channel, state: this.replState };
  }

  private async writeRaw(data: string | Uint8Array): Promise<void> {
    const transport = this.transport;
    if (!transport) throw new ConnectionLostError('No Pico is connected.');
    await transport.write(toBytes(data));
  }

  /** Runs `job` inside a raw REPL session, returning to the friendly REPL. */
  private withRawRepl<T>(
    activity: string,
    job: (session: ReplSession) => Promise<T>,
  ): Promise<T> {
    return this.exclusive(activity, async () => {
      await enterRawRepl(this.channel);
      try {
        return await job(this.session);
      } finally {
        await exitRawRepl(this.channel).catch(() => undefined);
      }
    });
  }

  /**
   * Board operations run one at a time. While one is in flight the incoming
   * bytes belong to the protocol, not the terminal.
   */
  private exclusive<T>(activity: string, job: () => Promise<T>): Promise<T> {
    const start = async (): Promise<T> => {
      if (!this.transport) throw new ConnectionLostError('No Pico is connected.');
      this.mode = 'protocol';
      this.rx.reset();
      this.setState({ status: 'busy', activity, progress: null });
      try {
        return await job();
      } catch (error) {
        if (this.transport && !(error instanceof ConnectionLostError)) {
          await this.recover();
        }
        throw error;
      } finally {
        if (this.transport) {
          const leftovers = this.rx.takeAll();
          this.mode = 'passthrough';
          if (leftovers.length) this.emitTerminal(leftovers);
          this.setState({ status: 'connected', activity: null, progress: null });
        }
      }
    };
    const result = this.queue.then(start, start);
    this.queue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

  /** Best-effort return to a usable friendly REPL after a failed operation. */
  private async recover(): Promise<void> {
    try {
      await this.writeRaw('\r\x03\x03');
      await this.writeRaw('\r\x02');
      await this.rx.readUntil('>>> ', { timeoutMs: 1000 });
    } catch {
      // Nothing more we can do from here; the UI will report the failure.
    }
  }

  private waitWhileRunning(timeoutMs: number): Promise<boolean> {
    if (this.state.status !== 'running') return Promise.resolve(true);
    return new Promise((resolve) => {
      const finish = (stopped: boolean) => {
        clearTimeout(timer);
        unsubscribe();
        resolve(stopped);
      };
      const unsubscribe = this.subscribe(() => {
        if (this.state.status !== 'running') finish(true);
      });
      const timer = setTimeout(() => finish(false), timeoutMs);
    });
  }

  private setState(patch: Partial<ConnectionState>): void {
    this.state = { ...this.state, ...patch };
    for (const listener of this.stateListeners) listener();
  }

  private emit(event: ConnectionEvent): void {
    for (const listener of this.eventListeners) listener(event);
  }

  private emitTerminal(data: Uint8Array | string): void {
    const bytes = toBytes(data);
    for (const listener of this.terminalListeners) listener(bytes);
  }
}
