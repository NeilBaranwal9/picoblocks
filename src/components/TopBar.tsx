/** Project name, board connection, and the Run / Stop / Save controls. */
import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { EXAMPLES } from '../examples';
import type { ConnectionState } from '../serial/PicoConnectionManager';
import type { Settings } from '../store/settings';
import {
  BookIcon,
  BoltIcon,
  ChevronDownIcon,
  DownloadIcon,
  GearIcon,
  PlayIcon,
  PlugIcon,
  SaveIcon,
  SparkIcon,
  StopIcon,
  UploadIcon,
} from './Icons';
import { PicoLogo } from './PicoLogo';

interface Props {
  projectName: string;
  onRename(name: string): void;
  connection: ConnectionState;
  settings: Settings;
  onSettingsChange(patch: Partial<Settings>): void;
  canRun: boolean;
  onConnect(): void;
  onDisconnect(): void;
  onRun(): void;
  onStop(): void;
  onSaveMain(): void;
  onSaveAs(): void;
  onLoadExample(id: string): void;
  onNewProject(): void;
  onImport(): void;
  onExport(): void;
}

export function TopBar(props: Props) {
  const { connection } = props;
  const connected = connection.status !== 'disconnected' && connection.status !== 'connecting';
  const running = connection.status === 'running';
  const busy = connection.status === 'busy' || connection.status === 'connecting';

  return (
    <header className="flex flex-wrap items-center gap-2 border-b-[1.5px] border-line bg-surface px-3 py-2">
      <PicoLogo className="h-7 w-auto shrink-0" />

      <input
        aria-label="Project name"
        className="pb-input w-36 font-display font-semibold sm:w-52"
        value={props.projectName}
        onChange={(event) => props.onRename(event.target.value)}
        maxLength={60}
      />

      <Menu label="Examples" icon={<BookIcon size={16} />}>
        {(close) =>
          EXAMPLES.map((example) => (
            <button
              key={example.id}
              type="button"
              className="pb-menu-item flex-col items-start"
              onClick={() => {
                close();
                props.onLoadExample(example.id);
              }}
            >
              <span className="font-display font-semibold">{example.title}</span>
              <span className="text-xs text-ink-soft">{example.summary}</span>
              <span className="text-xs text-ink-faint">{example.hardware}</span>
            </button>
          ))
        }
      </Menu>

      <Menu label="Project" icon={<SparkIcon size={16} />}>
        {(close) => (
          <>
            <MenuItem
              onClick={() => {
                close();
                props.onNewProject();
              }}
            >
              <SparkIcon size={16} /> New project
            </MenuItem>
            <MenuItem
              onClick={() => {
                close();
                props.onImport();
              }}
            >
              <UploadIcon size={16} /> Open a project file…
            </MenuItem>
            <MenuItem
              onClick={() => {
                close();
                props.onExport();
              }}
            >
              <DownloadIcon size={16} /> Save project to my computer
            </MenuItem>
          </>
        )}
      </Menu>

      <Menu label="Settings" icon={<GearIcon size={16} />} align="left">
        {() => (
          <div className="p-2 text-sm">
            <p className="font-display font-semibold">Board</p>
            <label className="mt-1 flex items-center gap-2">
              <input
                type="radio"
                name="led"
                checked={props.settings.onboardLed === 'LED'}
                onChange={() => props.onSettingsChange({ onboardLed: 'LED' })}
              />
              <span>
                Pico W / Pico 2 W <span className="text-ink-faint">(LED by name)</span>
              </span>
            </label>
            <label className="mt-1 flex items-center gap-2">
              <input
                type="radio"
                name="led"
                checked={props.settings.onboardLed === '25'}
                onChange={() => props.onSettingsChange({ onboardLed: '25' })}
              />
              <span>
                Classic Pico <span className="text-ink-faint">(LED on GP25)</span>
              </span>
            </label>
            <p className="mt-3 font-display font-semibold">Connecting</p>
            <label className="mt-1 flex items-start gap-2">
              <input
                type="checkbox"
                className="mt-1"
                checked={props.settings.showAllDevices}
                onChange={(event) =>
                  props.onSettingsChange({ showAllDevices: event.target.checked })
                }
              />
              <span>
                Show every serial device
                <span className="block text-xs text-ink-faint">
                  Turn on if your board does not appear in the picker.
                </span>
              </span>
            </label>
          </div>
        )}
      </Menu>

      <div className="ml-auto flex flex-wrap items-center gap-2">
        <StatusPill connection={connection} />

        <button
          type="button"
          className={`pb-btn ${connected ? '' : 'pb-btn-brand'}`}
          onClick={connected ? props.onDisconnect : props.onConnect}
          disabled={connection.status === 'connecting'}
        >
          <PlugIcon size={16} />
          {connected ? 'Disconnect' : 'Connect'}
        </button>

        <button
          type="button"
          className="pb-btn pb-btn-run"
          onClick={props.onRun}
          disabled={!connected || running || busy || !props.canRun}
          title={props.canRun ? 'Run this program on the Pico' : 'Add some blocks first'}
        >
          <PlayIcon size={16} /> Run
        </button>

        <button
          type="button"
          className="pb-btn pb-btn-stop"
          onClick={props.onStop}
          disabled={!running}
        >
          <StopIcon size={16} /> Stop
        </button>

        <div className="flex">
          <button
            type="button"
            className="pb-btn rounded-r-none border-r-0"
            onClick={props.onSaveMain}
            disabled={!connected || busy || !props.canRun}
            title="Copy this program onto the Pico as main.py so it runs on power-up"
          >
            <SaveIcon size={16} /> Save to Pico
          </button>
          <button
            type="button"
            className="pb-btn rounded-l-none px-1.5"
            onClick={props.onSaveAs}
            disabled={!connected || busy || !props.canRun}
            title="Save with another filename"
            aria-label="Save with another filename"
          >
            <ChevronDownIcon size={16} />
          </button>
        </div>
      </div>
    </header>
  );
}

function StatusPill({ connection }: { connection: ConnectionState }) {
  const { status, activity, progress } = connection;
  const look: Record<ConnectionState['status'], { dot: string; text: string }> = {
    disconnected: { dot: 'bg-ink-faint', text: 'No board' },
    connecting: { dot: 'bg-control animate-pulse', text: 'Connecting…' },
    connected: { dot: 'bg-run', text: 'Connected' },
    busy: { dot: 'bg-control animate-pulse', text: activity ?? 'Working…' },
    running: { dot: 'bg-run animate-pulse', text: 'Running' },
  };
  const { dot, text } = look[status];
  return (
    <span
      className="flex items-center gap-2 rounded-full border-[1.5px] border-line-strong bg-paper px-3 py-1.5 text-xs font-semibold"
      role="status"
      aria-live="polite"
    >
      <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />
      {text}
      {progress !== null && <span className="tabular-nums">{Math.round(progress * 100)}%</span>}
      {status === 'running' && <BoltIcon size={14} className="text-run" />}
    </span>
  );
}

function MenuItem({ children, onClick }: { children: ReactNode; onClick(): void }) {
  return (
    <button type="button" className="pb-menu-item" onClick={onClick}>
      {children}
    </button>
  );
}

function Menu({
  label,
  icon,
  align = 'left',
  children,
}: {
  label: string;
  icon: ReactNode;
  align?: 'left' | 'right';
  children: (close: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!hostRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={hostRef} className="relative">
      <button
        type="button"
        className="pb-btn"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        {icon}
        <span className="hidden md:inline">{label}</span>
        <ChevronDownIcon size={14} />
      </button>
      {open && (
        <div
          className="pb-menu mt-1"
          style={align === 'left' ? { left: 0 } : { right: 0 }}
          role="menu"
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}
