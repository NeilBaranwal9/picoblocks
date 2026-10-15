/** The Web Serial implementation of `SerialTransport`. */
import type { SerialTransport, TransportCloseReason } from './transport';

/** Raspberry Pi's USB vendor id, shared by every Pico running MicroPython. */
export const RASPBERRY_PI_VENDOR_ID = 0x2e8a;

/** MicroPython talks at 115200 baud (USB CDC ignores it, but it is required). */
const BAUD_RATE = 115200;
const WRITE_TIMEOUT_MS = 5000;

export function isWebSerialSupported(): boolean {
  return typeof navigator !== 'undefined' && 'serial' in navigator;
}

/**
 * Shows the browser's device picker. Returns null if the user cancelled,
 * which is not an error worth shouting about.
 */
export async function requestPicoPort(
  showAllDevices = false,
): Promise<SerialPort | null> {
  const filters = showAllDevices
    ? []
    : [{ usbVendorId: RASPBERRY_PI_VENDOR_ID }];
  try {
    return await navigator.serial.requestPort({ filters });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'NotFoundError') {
      return null; // the picker was dismissed
    }
    throw error;
  }
}

export class WebSerialTransport implements SerialTransport {
  onData: ((data: Uint8Array) => void) | null = null;
  onClose: ((reason: TransportCloseReason, error?: unknown) => void) | null = null;

  private port: SerialPort;
  private reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  private writer: WritableStreamDefaultWriter<Uint8Array> | null = null;
  private readLoop: Promise<void>;
  private closing = false;
  private closed = false;

  static async open(port: SerialPort): Promise<WebSerialTransport> {
    await port.open({ baudRate: BAUD_RATE });
    try {
      // MicroPython only transmits while DTR says a terminal is attached.
      await port.setSignals({ dataTerminalReady: true, requestToSend: true });
    } catch {
      // Not every platform implements setSignals; the port still works.
    }
    return new WebSerialTransport(port);
  }

  private constructor(port: SerialPort) {
    this.port = port;
    this.writer = port.writable?.getWriter() ?? null;
    navigator.serial.addEventListener('disconnect', this.handleUsbDisconnect);
    this.readLoop = this.pump();
  }

  get device(): { usbVendorId?: number; usbProductId?: number } {
    const info = this.port.getInfo();
    return { usbVendorId: info.usbVendorId, usbProductId: info.usbProductId };
  }

  async write(data: Uint8Array): Promise<void> {
    if (!this.writer) throw new Error('The serial port is closed.');
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(
        () => reject(new Error('Timed out writing to the Pico.')),
        WRITE_TIMEOUT_MS,
      );
    });
    try {
      await Promise.race([this.writer.write(data), timeout]);
    } finally {
      clearTimeout(timer);
    }
  }

  async close(): Promise<void> {
    if (this.closing) return;
    this.closing = true;
    navigator.serial.removeEventListener('disconnect', this.handleUsbDisconnect);

    try {
      await this.reader?.cancel();
    } catch {
      // Already gone.
    }
    await Promise.race([this.readLoop, delay(500)]);

    if (this.writer) {
      // abort() drops anything still queued for a board that stopped reading;
      // without it close() can wait forever on a wedged device.
      await this.writer.abort().catch(() => undefined);
      try {
        this.writer.releaseLock();
      } catch {
        // Lock already released by abort().
      }
      this.writer = null;
    }

    try {
      await this.port.close();
    } catch {
      // The device may already have been unplugged.
    }
    this.finish('closed');
  }

  /** Reads until the port closes, restarting after recoverable framing errors. */
  private async pump(): Promise<void> {
    let failure: unknown;
    while (this.port.readable && !this.closing) {
      const reader = this.port.readable.getReader();
      this.reader = reader;
      try {
        for (;;) {
          const { value, done } = await reader.read();
          if (done) return this.endPump(failure);
          if (value?.length) this.onData?.(value);
        }
      } catch (error) {
        // Parity/framing/overrun errors are recoverable: the platform hands
        // us a fresh readable. A lost device sets readable to null instead.
        failure = error;
      } finally {
        try {
          reader.releaseLock();
        } catch {
          // Cancelled readers release themselves.
        }
        this.reader = null;
      }
    }
    this.endPump(failure);
  }

  private endPump(failure: unknown): void {
    if (!this.closing) this.finish('lost', failure);
  }

  private handleUsbDisconnect = (event: Event): void => {
    if (event.target !== this.port) return;
    this.finish('lost');
  };

  private finish(reason: TransportCloseReason, error?: unknown): void {
    if (this.closed) return;
    this.closed = true;
    navigator.serial.removeEventListener('disconnect', this.handleUsbDisconnect);
    this.onClose?.(reason, error);
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
