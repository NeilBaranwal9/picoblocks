/**
 * PicoBlocks talks to the board with the Web Serial API, which only exists in
 * Chromium browsers on a desktop, and only on a secure origin. Rather than
 * letting someone build a program they could never run, say so up front.
 */
import type { ReactNode } from 'react';
import { isWebSerialSupported } from '../serial/webSerialTransport';
import { PicoLogo } from './PicoLogo';

export function BrowserSupportGate({ children }: { children: ReactNode }) {
  const secure = typeof window === 'undefined' || window.isSecureContext;
  if (isWebSerialSupported() && secure) return <>{children}</>;

  return (
    <div className="flex min-h-full items-center justify-center p-6">
      <main className="max-w-xl rounded-2xl border-[1.5px] border-line-strong bg-surface p-8 shadow-lg">
        <PicoLogo className="h-10 w-auto" />
        <h1 className="mt-5 font-display text-2xl font-semibold">
          This browser can&apos;t talk to a Pico
        </h1>
        {secure ? (
          <>
            <p className="mt-3 text-ink-soft">
              PicoBlocks connects to your Raspberry Pi Pico over USB using the Web
              Serial API. Firefox and Safari have not implemented it, so the editor
              would have no way to reach your board.
            </p>
            <p className="mt-3 text-ink-soft">
              Open this page in <strong>Chrome</strong>, <strong>Edge</strong>,{' '}
              <strong>Opera</strong> or another Chromium browser on a desktop or
              laptop, and everything here works with no installs.
            </p>
          </>
        ) : (
          <p className="mt-3 text-ink-soft">
            Web Serial is only available on secure origins. Open this page over{' '}
            <strong>https://</strong> (or from <strong>localhost</strong> while
            developing) and reload.
          </p>
        )}
      </main>
    </div>
  );
}
