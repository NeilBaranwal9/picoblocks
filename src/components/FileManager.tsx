/** Browse, upload, download, rename and delete the files on the Pico's flash. */
import { useCallback, useEffect, useRef, useState } from 'react';
import { describeError } from '../serial/errors';
import { joinPath, parentPath, type DirListing } from '../serial/fileTransfer';
import type { PicoConnectionManager } from '../serial/PicoConnectionManager';
import { useDialogs } from './Dialogs';
import {
  DownloadIcon,
  FileIcon,
  FolderIcon,
  PencilIcon,
  RefreshIcon,
  TrashIcon,
  UploadIcon,
} from './Icons';
import { useToast } from './Toasts';

interface Props {
  pico: PicoConnectionManager;
  connected: boolean;
  busy: boolean;
}

export function FileManager({ pico, connected, busy }: Props) {
  const [path, setPath] = useState('/');
  const [listing, setListing] = useState<DirListing | null>(null);
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const dialogs = useDialogs();
  const uploadRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(
    async (target = path) => {
      if (!pico.isConnected) {
        setListing(null);
        return;
      }
      setLoading(true);
      try {
        setListing(await pico.listFiles(target));
        setPath(target);
      } catch (error) {
        toast.show(describeError(error), 'error');
      } finally {
        setLoading(false);
      }
    },
    [path, pico, toast],
  );

  useEffect(() => {
    return pico.onEvent((event) => {
      if (event.type === 'connected') void refresh('/');
      if (event.type === 'filesChanged') void refresh();
      if (event.type === 'disconnected') setListing(null);
    });
  }, [pico, refresh]);

  useEffect(() => {
    if (connected && !listing && !loading) void refresh('/');
    // Only chase the connection flag; refresh handles the rest.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected]);

  const disabled = !connected || busy || loading;

  const onUpload = async (file: File) => {
    const target = joinPath(path, file.name);
    const bytes = new Uint8Array(await file.arrayBuffer());
    try {
      await pico.saveFile(target, bytes);
      toast.show(`Uploaded ${file.name} (${formatSize(bytes.length)})`, 'success');
    } catch (error) {
      toast.show(describeError(error), 'error');
    }
  };

  const onDownload = async (name: string, filePath: string) => {
    try {
      const data = await pico.readBoardFile(filePath);
      const url = URL.createObjectURL(new Blob([data as BlobPart]));
      const link = document.createElement('a');
      link.href = url;
      link.download = name;
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      toast.show(describeError(error), 'error');
    }
  };

  const onRename = async (name: string, filePath: string) => {
    const next = await dialogs.prompt({
      title: `Rename ${name}`,
      label: 'New name',
      defaultValue: name,
      confirmLabel: 'Rename',
    });
    if (!next || next === name) return;
    try {
      await pico.renameEntry(filePath, joinPath(path, next));
    } catch (error) {
      toast.show(describeError(error), 'error');
    }
  };

  const onDelete = async (name: string, filePath: string, isDir: boolean) => {
    const ok = await dialogs.confirm({
      title: `Delete ${name}?`,
      message: isDir
        ? 'The folder must be empty. This cannot be undone.'
        : 'This removes the file from the Pico for good.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    try {
      await pico.deleteEntry(filePath, isDir);
      toast.show(`Deleted ${name}`);
    } catch (error) {
      toast.show(describeError(error), 'error');
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap items-center gap-1.5 border-b-[1.5px] border-line px-3 py-2">
        <Breadcrumbs path={path} onNavigate={(next) => void refresh(next)} disabled={disabled} />
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            className="pb-btn pb-btn-ghost px-2 py-1"
            onClick={() => void refresh()}
            disabled={disabled}
            title="Refresh"
          >
            <RefreshIcon size={16} />
          </button>
          <button
            type="button"
            className="pb-btn px-2 py-1"
            onClick={() => uploadRef.current?.click()}
            disabled={disabled}
            title="Upload a file to the Pico"
          >
            <UploadIcon size={16} />
            <span className="hidden sm:inline">Upload</span>
          </button>
          <input
            ref={uploadRef}
            type="file"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = '';
              if (file) void onUpload(file);
            }}
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        {!connected ? (
          <Empty text="Connect your Pico to see the files on it." />
        ) : loading && !listing ? (
          <Empty text="Reading the files on the Pico…" />
        ) : listing && listing.entries.length === 0 ? (
          <Empty text="This folder is empty. Save a program to put main.py here." />
        ) : (
          <table className="w-full border-collapse text-sm">
            <tbody>
              {listing?.entries.map((entry) => (
                <tr key={entry.path} className="border-b border-line/60 hover:bg-paper">
                  <td className="w-6 py-1.5 pl-3 text-ink-faint">
                    {entry.isDir ? <FolderIcon size={16} /> : <FileIcon size={16} />}
                  </td>
                  <td className="py-1.5 pl-2 font-mono">
                    {entry.isDir ? (
                      <button
                        type="button"
                        className="hover:underline"
                        onClick={() => void refresh(entry.path)}
                        disabled={disabled}
                      >
                        {entry.name}/
                      </button>
                    ) : (
                      <span className={entry.name === 'main.py' ? 'font-bold text-brand' : ''}>
                        {entry.name}
                      </span>
                    )}
                  </td>
                  <td className="py-1.5 pr-2 text-right tabular-nums text-ink-faint">
                    {entry.isDir ? '' : formatSize(entry.size)}
                  </td>
                  <td className="py-1 pr-2 text-right whitespace-nowrap">
                    {!entry.isDir && (
                      <button
                        type="button"
                        className="pb-btn pb-btn-ghost px-1.5 py-1"
                        title={`Download ${entry.name}`}
                        onClick={() => void onDownload(entry.name, entry.path)}
                        disabled={disabled}
                      >
                        <DownloadIcon size={15} />
                      </button>
                    )}
                    <button
                      type="button"
                      className="pb-btn pb-btn-ghost px-1.5 py-1"
                      title={`Rename ${entry.name}`}
                      onClick={() => void onRename(entry.name, entry.path)}
                      disabled={disabled}
                    >
                      <PencilIcon size={15} />
                    </button>
                    <button
                      type="button"
                      className="pb-btn pb-btn-ghost px-1.5 py-1 text-stop"
                      title={`Delete ${entry.name}`}
                      onClick={() => void onDelete(entry.name, entry.path, entry.isDir)}
                      disabled={disabled}
                    >
                      <TrashIcon size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {listing && <StorageBar listing={listing} />}
    </div>
  );
}

function Breadcrumbs({
  path,
  onNavigate,
  disabled,
}: {
  path: string;
  onNavigate(path: string): void;
  disabled: boolean;
}) {
  const parts = path.split('/').filter(Boolean);
  return (
    <nav className="flex items-center gap-1 font-mono text-xs text-ink-soft">
      <button
        type="button"
        className="pb-btn pb-btn-ghost px-1.5 py-0.5 text-xs"
        onClick={() => onNavigate('/')}
        disabled={disabled}
      >
        Pico
      </button>
      {parts.map((part, index) => {
        const target = `/${parts.slice(0, index + 1).join('/')}`;
        return (
          <span key={target} className="flex items-center gap-1">
            <span aria-hidden="true">/</span>
            <button
              type="button"
              className="pb-btn pb-btn-ghost px-1.5 py-0.5 text-xs"
              onClick={() => onNavigate(target)}
              disabled={disabled || index === parts.length - 1}
            >
              {part}
            </button>
          </span>
        );
      })}
      {path !== '/' && (
        <button
          type="button"
          className="pb-btn pb-btn-ghost px-1.5 py-0.5 text-xs"
          onClick={() => onNavigate(parentPath(path))}
          disabled={disabled}
        >
          up
        </button>
      )}
    </nav>
  );
}

function StorageBar({ listing }: { listing: DirListing }) {
  const used = listing.totalBytes - listing.freeBytes;
  const percent = listing.totalBytes ? (used / listing.totalBytes) * 100 : 0;
  return (
    <div className="border-t-[1.5px] border-line px-3 py-2 text-xs text-ink-soft">
      <div className="flex justify-between">
        <span>{formatSize(used)} used</span>
        <span>{formatSize(listing.freeBytes)} free</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-paper-deep">
        <div
          className="h-full rounded-full bg-brand"
          style={{ width: `${Math.min(100, Math.max(2, percent))}%` }}
        />
      </div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <p className="px-4 py-8 text-center text-sm text-ink-soft">{text}</p>
  );
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} kB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
