/**
 * Reading and writing the Pico's flash filesystem.
 *
 * MicroPython has no file-transfer command: you move files by running code
 * that reads and writes them. Every helper here is a small snippet executed in
 * the raw REPL whose printed output is parsed back on this side.
 */
import { hexToBytes, pyBytesLiteral, pyString } from './bytes';
import { ProtocolError } from './errors';
import { execChecked, type ReplChannel, type ReplState } from './rawRepl';

export interface ReplSession {
  channel: ReplChannel;
  state: ReplState;
}

export interface PicoFile {
  name: string;
  path: string;
  isDir: boolean;
  size: number;
}

export interface DirListing {
  path: string;
  entries: PicoFile[];
  totalBytes: number;
  freeBytes: number;
}

/**
 * Bytes of file data per `write()` call. Each chunk becomes an escaped Python
 * literal, so 256 raw bytes stay comfortably inside the board's input buffer
 * even in the worst case where every byte escapes to four characters.
 */
export const CHUNK_SIZE = 256;

/** Joins a directory and a name into an absolute board path. */
export function joinPath(dir: string, name: string): string {
  const base = dir.endsWith('/') ? dir.slice(0, -1) : dir;
  return `${base}/${name}`;
}

/** The directory containing `path`, or "/" for a top-level file. */
export function parentPath(path: string): string {
  const at = path.lastIndexOf('/');
  return at <= 0 ? '/' : path.slice(0, at);
}

export async function listDir(
  session: ReplSession,
  path = '/',
): Promise<DirListing> {
  const code = [
    'import os, json',
    '_out = []',
    `for _e in os.ilistdir(${pyString(path)}):`,
    '    _out.append([_e[0], (_e[1] & 0x4000) != 0, _e[3] if len(_e) > 3 else 0])',
    `_st = os.statvfs(${pyString(path)})`,
    'print(json.dumps([_out, _st[0] * _st[2], _st[0] * _st[3]]))',
  ].join('\n');

  const stdout = await execChecked(session.channel, code, session.state);
  let parsed: [[string, boolean, number][], number, number];
  try {
    parsed = JSON.parse(stdout.trim());
  } catch {
    throw new ProtocolError(`could not read the file list (${stdout.trim()})`);
  }
  const [rows, totalBytes, freeBytes] = parsed;
  const entries = rows
    .map(([name, isDir, size]) => ({
      name,
      path: joinPath(path, name),
      isDir,
      size,
    }))
    .sort((a, b) =>
      a.isDir === b.isDir ? a.name.localeCompare(b.name) : a.isDir ? -1 : 1,
    );
  return { path, entries, totalBytes, freeBytes };
}

export async function readFile(
  session: ReplSession,
  path: string,
): Promise<Uint8Array> {
  const code = [
    'try:',
    '    import binascii as _ba',
    'except ImportError:',
    '    import ubinascii as _ba',
    `_f = open(${pyString(path)}, 'rb')`,
    'while True:',
    `    _b = _f.read(${CHUNK_SIZE})`,
    '    if not _b:',
    '        break',
    '    print(_ba.hexlify(_b).decode())',
    '_f.close()',
  ].join('\n');

  const stdout = await execChecked(session.channel, code, session.state, {
    timeoutMs: 30000,
  });
  return hexToBytes(stdout);
}

export async function writeFile(
  session: ReplSession,
  path: string,
  data: Uint8Array,
  onProgress?: (written: number, total: number) => void,
): Promise<void> {
  // Write to a temporary file first: a transfer that dies half way then
  // leaves the previous main.py intact instead of a truncated one.
  const temporary = `${path}.pbtmp`;
  const { channel, state } = session;

  await execChecked(
    channel,
    [`_f = open(${pyString(temporary)}, 'wb')`, '_w = _f.write'].join('\n'),
    state,
  );

  try {
    for (let offset = 0; offset < data.length; offset += CHUNK_SIZE) {
      const chunk = data.slice(offset, offset + CHUNK_SIZE);
      await execChecked(channel, `_w(${pyBytesLiteral(chunk)})`, state);
      onProgress?.(Math.min(offset + CHUNK_SIZE, data.length), data.length);
    }
  } catch (error) {
    await execChecked(
      channel,
      [
        '_f.close()',
        'import os',
        'try:',
        `    os.remove(${pyString(temporary)})`,
        'except OSError:',
        '    pass',
      ].join('\n'),
      state,
    ).catch(() => undefined);
    throw error;
  }

  const stdout = await execChecked(
    channel,
    [
      '_f.close()',
      'import os',
      'try:',
      `    os.remove(${pyString(path)})`,
      'except OSError:',
      '    pass',
      `os.rename(${pyString(temporary)}, ${pyString(path)})`,
      `print(os.stat(${pyString(path)})[6])`,
    ].join('\n'),
    state,
  );

  const written = Number.parseInt(stdout.trim(), 10);
  if (written !== data.length) {
    throw new ProtocolError(
      `the Pico stored ${written} bytes but the file is ${data.length} bytes`,
    );
  }
  onProgress?.(data.length, data.length);
}

export async function removeEntry(
  session: ReplSession,
  path: string,
  isDir = false,
): Promise<void> {
  const call = isDir ? 'rmdir' : 'remove';
  await execChecked(
    session.channel,
    ['import os', `os.${call}(${pyString(path)})`].join('\n'),
    session.state,
  );
}

export async function renameEntry(
  session: ReplSession,
  from: string,
  to: string,
): Promise<void> {
  await execChecked(
    session.channel,
    ['import os', `os.rename(${pyString(from)}, ${pyString(to)})`].join('\n'),
    session.state,
  );
}

export async function makeDirectory(
  session: ReplSession,
  path: string,
): Promise<void> {
  await execChecked(
    session.channel,
    ['import os', `os.mkdir(${pyString(path)})`].join('\n'),
    session.state,
  );
}
