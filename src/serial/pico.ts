/** The one connection manager the whole app shares. */
import { PicoConnectionManager } from './PicoConnectionManager';

export const pico = new PicoConnectionManager();

if (typeof window !== 'undefined') {
  // Release the port if the tab goes away, so the next visit can reopen it.
  window.addEventListener('pagehide', () => {
    void pico.disconnect();
  });
}
