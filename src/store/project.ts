/**
 * Project persistence: the workspace autosaves to localStorage and exports to
 * a `.json` file. No account, no server — a project is a file you own.
 */

export interface ProjectFile {
  app: 'picoblocks';
  version: 1;
  name: string;
  /** `Blockly.serialization.workspaces.save()` output. */
  workspace: Record<string, unknown>;
  savedAt: string;
}

const STORAGE_KEY = 'picoblocks.project.v1';

export function makeProject(
  name: string,
  workspace: Record<string, unknown>,
): ProjectFile {
  return {
    app: 'picoblocks',
    version: 1,
    name,
    workspace,
    savedAt: new Date().toISOString(),
  };
}

export function loadLocalProject(): ProjectFile | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (parseProject(JSON.parse(raw)) as ProjectFile) : null;
  } catch {
    return null; // corrupt or blocked storage: start fresh rather than break
  }
}

export function saveLocalProject(project: ProjectFile): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
  } catch {
    // Private mode or a full quota: autosave is a convenience, not a promise.
  }
}

export function clearLocalProject(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to do.
  }
}

/**
 * Accepts either a PicoBlocks project file or a bare Blockly workspace export,
 * so a workspace JSON from anywhere still opens.
 */
export function parseProject(data: unknown, fallbackName = 'Imported project'): ProjectFile {
  if (!data || typeof data !== 'object') throw new Error('That file is not a project.');
  const value = data as Record<string, unknown>;
  if (value.app === 'picoblocks' && value.workspace) {
    return {
      app: 'picoblocks',
      version: 1,
      name: typeof value.name === 'string' ? value.name : fallbackName,
      workspace: value.workspace as Record<string, unknown>,
      savedAt: typeof value.savedAt === 'string' ? value.savedAt : new Date().toISOString(),
    };
  }
  if (value.blocks || value.variables) {
    return makeProject(fallbackName, value);
  }
  throw new Error('That file does not contain any blocks.');
}

export async function readProjectFile(file: File): Promise<ProjectFile> {
  const text = await file.text();
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('That file is not valid JSON.');
  }
  return parseProject(data, file.name.replace(/\.json$/i, ''));
}

export function downloadText(filename: string, text: string, type = 'application/json'): void {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportProject(project: ProjectFile): void {
  downloadText(`${safeFilename(project.name)}.json`, JSON.stringify(project, null, 2));
}

export function safeFilename(name: string): string {
  const cleaned = name
    .trim()
    .replace(/[^a-z0-9._ -]/gi, '')
    .replace(/\s+/g, '-')
    .toLowerCase();
  return cleaned || 'picoblocks-project';
}

/** What a brand new project starts with: the two blocks a program needs. */
export const STARTER_WORKSPACE: Record<string, unknown> = {
  blocks: {
    languageVersion: 0,
    blocks: [
      { type: 'on_start', id: 'starter-on-start', x: 60, y: 50 },
      { type: 'forever', id: 'starter-forever', x: 60, y: 190 },
    ],
  },
};
