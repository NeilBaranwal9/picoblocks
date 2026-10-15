import * as Blockly from 'blockly';
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { BlocklyWorkspace, loadWorkspaceState, type SelectedBlock } from './components/BlocklyWorkspace';
import { BrowserSupportGate } from './components/BrowserSupportGate';
import { CodePanel } from './components/CodePanel';
import { DialogProvider, useDialogs } from './components/Dialogs';
import { FileManager } from './components/FileManager';
import { CloseIcon, FolderIcon, RefreshIcon, TerminalIcon, TrashIcon } from './components/Icons';
import { TerminalPanel, type TerminalHandle } from './components/TerminalPanel';
import { ToastProvider, useToast } from './components/Toasts';
import { TopBar } from './components/TopBar';
import { WiringHelper } from './components/WiringHelper';
import { EXAMPLES } from './examples';
import { generateProgram, type GeneratedProgram } from './generators/assemble';
import { describeError } from './serial/errors';
import { pico } from './serial/pico';
import {
  exportProject,
  loadLocalProject,
  makeProject,
  readProjectFile,
  safeFilename,
  saveLocalProject,
  STARTER_WORKSPACE,
  type ProjectFile,
} from './store/project';
import { useSettings } from './store/settings';

const EMPTY_PROGRAM: GeneratedProgram = { code: '', pwmPins: [], hasCode: false };
const AUTOSAVE_MS = 700;

export default function App() {
  return (
    <ToastProvider>
      <DialogProvider>
        <BrowserSupportGate>
          <Editor />
        </BrowserSupportGate>
      </DialogProvider>
    </ToastProvider>
  );
}

function Editor() {
  const initialProject = useMemo<ProjectFile>(
    () => loadLocalProject() ?? makeProject('My first program', STARTER_WORKSPACE),
    [],
  );

  const [projectName, setProjectName] = useState(initialProject.name);
  const [program, setProgram] = useState<GeneratedProgram>(EMPTY_PROGRAM);
  const [selected, setSelected] = useState<SelectedBlock | null>(null);
  const [tab, setTab] = useState<'terminal' | 'files'>('terminal');
  const [settings, updateSettings] = useSettings();

  const connection = useSyncExternalStore(pico.subscribe, pico.getState);
  const toast = useToast();
  const dialogs = useDialogs();

  const workspaceRef = useRef<Blockly.WorkspaceSvg | null>(null);
  const terminalRef = useRef<TerminalHandle>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const connected =
    connection.status !== 'disconnected' && connection.status !== 'connecting';

  // ------------------------------------------------- workspace -> code

  const regenerate = useCallback(
    (workspace: Blockly.WorkspaceSvg) => {
      setProgram(generateProgram(workspace, { onboardLed: settings.onboardLed }));
    },
    [settings.onboardLed],
  );

  const autosave = useCallback(
    (workspace: Blockly.WorkspaceSvg) => {
      clearTimeout(autosaveTimer.current);
      autosaveTimer.current = setTimeout(() => {
        const state = Blockly.serialization.workspaces.save(workspace);
        saveLocalProject(makeProject(projectName, state));
      }, AUTOSAVE_MS);
    },
    [projectName],
  );

  const handleChange = useCallback(
    (workspace: Blockly.WorkspaceSvg) => {
      regenerate(workspace);
      autosave(workspace);
    },
    [regenerate, autosave],
  );

  // Regenerate when the board setting changes the generated code.
  useEffect(() => {
    const workspace = workspaceRef.current;
    if (workspace) regenerate(workspace);
  }, [regenerate]);

  // Keep the autosaved project name in step with the input.
  useEffect(() => {
    const workspace = workspaceRef.current;
    if (workspace) autosave(workspace);
  }, [projectName, autosave]);

  const replaceWorkspace = useCallback(
    async (project: ProjectFile, confirmMessage: string) => {
      const workspace = workspaceRef.current;
      if (!workspace) return;
      if (workspace.getAllBlocks(false).length > 0) {
        const ok = await dialogs.confirm({
          title: 'Replace your blocks?',
          message: confirmMessage,
          confirmLabel: 'Replace',
          destructive: true,
        });
        if (!ok) return;
      }
      loadWorkspaceState(workspace, project.workspace);
      setProjectName(project.name);
      handleChange(workspace);
    },
    [dialogs, handleChange],
  );

  // ------------------------------------------------------ board actions

  const handleConnect = useCallback(async () => {
    try {
      const opened = await pico.connect({ showAllDevices: settings.showAllDevices });
      if (opened) toast.show('Connected to your Pico.', 'success');
    } catch (error) {
      toast.show(describeError(error), 'error');
    }
  }, [settings.showAllDevices, toast]);

  const handleRun = useCallback(async () => {
    if (!program.hasCode) return;
    setTab('terminal');
    try {
      await pico.run(program);
    } catch (error) {
      toast.show(describeError(error), 'error');
    }
  }, [program, toast]);

  const handleStop = useCallback(async () => {
    try {
      await pico.stop();
    } catch (error) {
      toast.show(describeError(error), 'error');
    }
  }, [toast]);

  const saveToPico = useCallback(
    async (filename: string) => {
      try {
        await pico.saveFile(`/${filename}`, program.code);
        toast.show(
          filename === 'main.py'
            ? 'Saved as main.py. It now runs whenever the Pico powers up.'
            : `Saved ${filename} to the Pico.`,
          'success',
        );
      } catch (error) {
        toast.show(describeError(error), 'error');
      }
    },
    [program.code, toast],
  );

  const handleSaveAs = useCallback(async () => {
    const name = await dialogs.prompt({
      title: 'Save to the Pico',
      message: 'Only main.py starts by itself when the board powers up.',
      label: 'Filename',
      defaultValue: `${safeFilename(projectName)}.py`,
      confirmLabel: 'Save',
    });
    if (name) await saveToPico(name.replace(/^\/+/, ''));
  }, [dialogs, projectName, saveToPico]);

  // ------------------------------------------------------------ project

  const handleExport = useCallback(() => {
    const workspace = workspaceRef.current;
    if (!workspace) return;
    exportProject(
      makeProject(projectName, Blockly.serialization.workspaces.save(workspace)),
    );
  }, [projectName]);

  const handleImport = useCallback(
    async (file: File) => {
      try {
        const project = await readProjectFile(file);
        await replaceWorkspace(project, `Opening "${project.name}" replaces what is here now.`);
      } catch (error) {
        toast.show(describeError(error), 'error');
      }
    },
    [replaceWorkspace, toast],
  );

  // ------------------------------------------------------------ effects

  useEffect(() => {
    return pico.onEvent((event) => {
      if (event.type === 'disconnected' && event.unexpected) {
        toast.show('The Pico was disconnected. Check the USB cable, then connect again.', 'error');
      }
    });
  }, [toast]);

  // Development only: `picoblocksSimulate()` in the console attaches a
  // simulated board so the UI can be exercised without hardware.
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    void import('./dev/simulatedPico').then(({ attachSimulatedBoard }) => {
      Object.assign(window, { picoblocksSimulate: () => attachSimulatedBoard(pico) });
    });
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault();
        if (connected && connection.status !== 'running') void handleRun();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [connected, connection.status, handleRun]);

  // --------------------------------------------------------------- view

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-paper">
      <TopBar
        projectName={projectName}
        onRename={setProjectName}
        connection={connection}
        settings={settings}
        onSettingsChange={updateSettings}
        canRun={program.hasCode}
        onConnect={() => void handleConnect()}
        onDisconnect={() => void pico.disconnect()}
        onRun={() => void handleRun()}
        onStop={() => void handleStop()}
        onSaveMain={() => void saveToPico('main.py')}
        onSaveAs={() => void handleSaveAs()}
        onLoadExample={(id) => {
          const example = EXAMPLES.find((candidate) => candidate.id === id);
          if (example) {
            void replaceWorkspace(
              example.project,
              `Loading "${example.title}" replaces what is here now.`,
            );
          }
        }}
        onNewProject={() =>
          void replaceWorkspace(
            makeProject('My program', STARTER_WORKSPACE),
            'Starting a new project clears the workspace.',
          )
        }
        onImport={() => importRef.current?.click()}
        onExport={handleExport}
      />

      <input
        ref={importRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) void handleImport(file);
        }}
      />

      <main className="grid min-h-0 flex-1 gap-3 overflow-y-auto p-3 lg:grid-cols-[minmax(0,1fr)_minmax(340px,38%)] lg:overflow-hidden">
        <section className="pb-panel relative h-[62vh] lg:h-auto">
          <BlocklyWorkspace
            initialState={initialProject.workspace}
            onReady={(workspace) => {
              workspaceRef.current = workspace;
            }}
            onChange={handleChange}
            onSelect={setSelected}
          />
          <WiringHelper block={selected} onDismiss={() => setSelected(null)} />
          {!program.hasCode && <StartHint />}
        </section>

        <div className="grid min-h-0 gap-3 md:grid-cols-2 lg:grid-cols-1 lg:grid-rows-[minmax(0,1fr)_minmax(0,1fr)]">
          <CodePanel
            code={program.code || '# Add blocks to see MicroPython here.\n'}
            filename={`${safeFilename(projectName)}.py`}
            onCopied={() => toast.show('Code copied to the clipboard.')}
          />

          <section className="pb-panel h-[46vh] md:h-auto">
            <header className="pb-panel-head">
              <div role="tablist" aria-label="Board panels" className="flex gap-1">
                <button
                  type="button"
                  role="tab"
                  aria-selected={tab === 'terminal'}
                  className="pb-tab flex items-center gap-1.5"
                  onClick={() => setTab('terminal')}
                >
                  <TerminalIcon size={15} /> Terminal
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={tab === 'files'}
                  className="pb-tab flex items-center gap-1.5"
                  onClick={() => setTab('files')}
                >
                  <FolderIcon size={15} /> Files on Pico
                </button>
              </div>
              {tab === 'terminal' && (
                <div className="ml-auto flex items-center gap-1">
                  <button
                    type="button"
                    className="pb-btn pb-btn-ghost px-2 py-1 text-xs"
                    onClick={() => pico.sendTerminalInput('\x03')}
                    disabled={!connected}
                    title="Send Ctrl-C to interrupt whatever the board is doing"
                  >
                    <CloseIcon size={14} /> Ctrl-C
                  </button>
                  <button
                    type="button"
                    className="pb-btn pb-btn-ghost px-2 py-1 text-xs"
                    onClick={() => void pico.resetBoard()}
                    disabled={connection.status !== 'connected'}
                    title="Soft-reboot MicroPython, which runs main.py just like a power cycle"
                  >
                    <RefreshIcon size={14} /> Reset board
                  </button>
                  <button
                    type="button"
                    className="pb-btn pb-btn-ghost px-2 py-1 text-xs"
                    onClick={() => terminalRef.current?.clear()}
                    title="Clear the terminal"
                  >
                    <TrashIcon size={14} />
                  </button>
                </div>
              )}
            </header>

            <div className="min-h-0 flex-1">
              <div className={tab === 'terminal' ? 'h-full' : 'hidden h-full'}>
                <TerminalPanel ref={terminalRef} pico={pico} visible={tab === 'terminal'} />
              </div>
              <div className={tab === 'files' ? 'h-full' : 'hidden h-full'}>
                <FileManager
                  pico={pico}
                  connected={connected}
                  busy={connection.status === 'busy' || connection.status === 'running'}
                />
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function StartHint() {
  return (
    <div className="pointer-events-none absolute bottom-4 left-1/2 max-w-xs -translate-x-1/2 rounded-xl border-[1.5px] border-dashed border-line-strong bg-surface/90 px-4 py-3 text-sm text-ink-soft shadow-sm">
      <p className="font-display font-semibold text-ink">Start here</p>
      <p className="mt-1">
        Drag blocks from the palette into <strong>forever</strong> to make them repeat, or into{' '}
        <strong>on start</strong> to run them once. The MicroPython appears on the right as you
        build.
      </p>
    </div>
  );
}
