/**
 * The serial terminal: everything the board prints, and anything you type
 * goes straight back to the REPL.
 */
import { FitAddon } from '@xterm/addon-fit';
import { Terminal } from '@xterm/xterm';
import { useEffect, useImperativeHandle, useRef } from 'react';
import type { Ref } from 'react';
import type { PicoConnectionManager } from '../serial/PicoConnectionManager';

export interface TerminalHandle {
  clear(): void;
}

interface Props {
  pico: PicoConnectionManager;
  /** Hidden panels must not be laid out, but must keep their scrollback. */
  visible: boolean;
  ref?: Ref<TerminalHandle>;
}

const TERMINAL_THEME = {
  background: '#221f1c',
  foreground: '#f3e9d6',
  cursor: '#f5b81a',
  selectionBackground: '#4a423a',
  black: '#221f1c',
  red: '#ff8e8e',
  green: '#8ce99a',
  yellow: '#ffd66b',
  blue: '#8cb4ff',
  magenta: '#ffa8d8',
  cyan: '#7fe3d4',
  white: '#f3e9d6',
  brightBlack: '#a0968a',
  brightRed: '#ffb3b3',
  brightGreen: '#b2f2bb',
  brightYellow: '#ffe3a3',
  brightBlue: '#b3ccff',
  brightMagenta: '#ffc9e6',
  brightCyan: '#a8ece1',
  brightWhite: '#ffffff',
};

export function TerminalPanel({ pico, visible, ref }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const terminal = new Terminal({
      fontFamily: "'JetBrains Mono', ui-monospace, monospace",
      fontSize: 13,
      lineHeight: 1.25,
      cursorBlink: true,
      theme: TERMINAL_THEME,
      scrollback: 5000,
      convertEol: false,
    });
    const fit = new FitAddon();
    terminal.loadAddon(fit);
    terminal.open(host);
    fit.fit();
    termRef.current = terminal;
    fitRef.current = fit;

    terminal.writeln('\x1b[90mConnect your Pico to start talking to MicroPython.\x1b[0m');

    const unsubscribeData = pico.onTerminalData((data) => terminal.write(data));
    const typed = terminal.onData((data) => pico.sendTerminalInput(data));

    const resizeObserver = new ResizeObserver(() => {
      if (host.clientHeight > 0 && host.clientWidth > 0) {
        try {
          fit.fit();
        } catch {
          // The panel can be measured mid-layout; the next tick fixes it.
        }
      }
    });
    resizeObserver.observe(host);

    return () => {
      resizeObserver.disconnect();
      unsubscribeData();
      typed.dispose();
      terminal.dispose();
      termRef.current = null;
      fitRef.current = null;
    };
  }, [pico]);

  useImperativeHandle(ref, () => ({ clear: () => termRef.current?.clear() }), []);

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => {
      try {
        fitRef.current?.fit();
      } catch {
        // Ignore: the observer will catch up.
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [visible]);

  return <div ref={hostRef} className="h-full w-full bg-terminal p-2" />;
}
