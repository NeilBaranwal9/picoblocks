/**
 * A byte pipe to a board. Web Serial implements this in the browser; the tests
 * implement it with a simulated Pico.
 */
export type TransportCloseReason = 'closed' | 'lost';

export interface SerialTransport {
  /** Bytes from the board. */
  onData: ((data: Uint8Array) => void) | null;
  /** Called once, when the pipe goes away for any reason. */
  onClose: ((reason: TransportCloseReason, error?: unknown) => void) | null;
  write(data: Uint8Array): Promise<void>;
  close(): Promise<void>;
  readonly device: { usbVendorId?: number; usbProductId?: number };
}
