/**
 * The Blockly workspace.
 *
 * The workspace is the single source of truth for a program: nothing else
 * writes to it, and every change flows outward through `onChange`.
 */
import * as Blockly from 'blockly';
import { useEffect, useRef } from 'react';
import { registerBlocks, toolbox } from '../blocks';
import { picoTheme } from '../theme/blocklyTheme';

export interface SelectedBlock {
  id: string;
  type: string;
  /** Value of the block's PIN field, when it has one. */
  pin: string | null;
}

interface Props {
  /** Serialized workspace to load on first render. */
  initialState: Record<string, unknown>;
  onReady(workspace: Blockly.WorkspaceSvg): void;
  onChange(workspace: Blockly.WorkspaceSvg): void;
  onSelect(block: SelectedBlock | null): void;
}

/** How long to wait after the last change before regenerating code. */
const CHANGE_DEBOUNCE_MS = 100;

export function BlocklyWorkspace({ initialState, onReady, onChange, onSelect }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  // Keep the latest callbacks without re-injecting the workspace.
  const callbacks = useRef({ onReady, onChange, onSelect });
  useEffect(() => {
    callbacks.current = { onReady, onChange, onSelect };
  });

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    registerBlocks();

    const workspace = Blockly.inject(host, {
      toolbox,
      theme: picoTheme,
      renderer: 'zelos',
      media: `${import.meta.env.BASE_URL}blockly-media/`,
      sounds: false,
      // One program entry point and one loop, as the generated file expects.
      maxInstances: { on_start: 1, forever: 1 },
      grid: { spacing: 28, length: 3, colour: '#e7dcc5', snap: true },
      zoom: {
        controls: true,
        wheel: true,
        startScale: 0.85,
        minScale: 0.4,
        maxScale: 2,
        pinch: true,
      },
      move: { scrollbars: true, drag: true, wheel: false },
      trashcan: true,
    });

    Blockly.serialization.workspaces.load(initialState, workspace);
    workspace.clearUndo();

    // Grey out blocks that are not inside `on start` or `forever`: they would
    // silently do nothing, and greying them out says so.
    workspace.addChangeListener(Blockly.Events.disableOrphans);

    let timer: ReturnType<typeof setTimeout> | undefined;
    const listener = (event: Blockly.Events.Abstract) => {
      if (event.type === Blockly.Events.SELECTED) {
        const id = (event as Blockly.Events.Selected).newElementId;
        const block = id ? workspace.getBlockById(id) : null;
        callbacks.current.onSelect(
          block
            ? { id: block.id, type: block.type, pin: block.getFieldValue('PIN') ?? null }
            : null,
        );
        return;
      }
      if (event.isUiEvent) return;
      clearTimeout(timer);
      timer = setTimeout(() => callbacks.current.onChange(workspace), CHANGE_DEBOUNCE_MS);
    };
    workspace.addChangeListener(listener);

    const resizeObserver = new ResizeObserver(() => Blockly.svgResize(workspace));
    resizeObserver.observe(host);

    // Blockly sizes every block from the width of its text. On a cold load the
    // web font is still downloading, so it measures the fallback and the
    // labels end up clipped. Re-render once the real font lands.
    let disposed = false;
    void document.fonts?.ready.then(() => {
      if (disposed) return;
      for (const block of workspace.getAllBlocks(false)) block.queueRender();
      Blockly.svgResize(workspace);
    });

    callbacks.current.onReady(workspace);
    callbacks.current.onChange(workspace);

    return () => {
      disposed = true;
      clearTimeout(timer);
      resizeObserver.disconnect();
      workspace.removeChangeListener(listener);
      workspace.dispose();
    };
    // Injection happens once; later state changes go through the workspace API.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={hostRef} className="h-full w-full" />;
}

/** Replaces everything in the workspace with a saved project. */
export function loadWorkspaceState(
  workspace: Blockly.WorkspaceSvg,
  state: Record<string, unknown>,
): void {
  Blockly.serialization.workspaces.load(state, workspace);
  workspace.clearUndo();
}
