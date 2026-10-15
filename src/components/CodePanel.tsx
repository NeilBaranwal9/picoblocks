/** Live, read-only view of the MicroPython the blocks generate. */
import { python } from '@codemirror/lang-python';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { EditorState } from '@codemirror/state';
import { EditorView, lineNumbers } from '@codemirror/view';
import { tags } from '@lezer/highlight';
import { useEffect, useRef, useState } from 'react';
import { CopyIcon, DownloadIcon } from './Icons';

const highlight = HighlightStyle.define([
  { tag: tags.keyword, color: '#b3103e', fontWeight: '700' },
  { tag: tags.controlKeyword, color: '#a1560a', fontWeight: '700' },
  { tag: tags.definitionKeyword, color: '#6d28d9', fontWeight: '700' },
  { tag: tags.number, color: '#0f766e' },
  { tag: tags.string, color: '#15803d' },
  { tag: tags.comment, color: '#a0968a', fontStyle: 'italic' },
  { tag: tags.function(tags.variableName), color: '#2563eb' },
  { tag: tags.propertyName, color: '#2563eb' },
  { tag: tags.bool, color: '#b3103e' },
  { tag: tags.operator, color: '#6f665b' },
]);

const theme = EditorView.theme({
  '&': {
    height: '100%',
    backgroundColor: 'transparent',
    color: '#22201d',
    fontSize: '13px',
  },
  '.cm-scroller': {
    fontFamily: "'JetBrains Mono', ui-monospace, monospace",
    lineHeight: '1.6',
  },
  '.cm-gutters': {
    backgroundColor: 'transparent',
    border: 'none',
    color: '#c3b69f',
  },
  '.cm-activeLine': { backgroundColor: 'transparent' },
  '.cm-content': { caretColor: 'transparent' },
  '.cm-cursor': { display: 'none' },
});

interface Props {
  code: string;
  filename: string;
  onCopied(): void;
}

export function CodePanel({ code, filename, onCopied }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const view = new EditorView({
      parent: host,
      state: EditorState.create({
        doc: code,
        extensions: [
          lineNumbers(),
          python(),
          syntaxHighlighting(highlight),
          theme,
          EditorView.lineWrapping,
          EditorState.readOnly.of(true),
          EditorView.editable.of(false),
        ],
      }),
    });
    viewRef.current = view;
    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // The document is pushed in by the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const view = viewRef.current;
    if (!view || view.state.doc.toString() === code) return;
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: code },
    });
    setFlash(true);
    const timer = setTimeout(() => setFlash(false), 320);
    return () => clearTimeout(timer);
  }, [code]);

  const download = () => {
    const url = URL.createObjectURL(new Blob([code], { type: 'text/x-python' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <section className="pb-panel min-h-0 flex-1">
      <header className="pb-panel-head">
        <span className="text-code">MicroPython</span>
        <span
          className={`rounded-full border-[1.5px] border-line px-2 py-0.5 font-sans text-[11px] font-normal text-ink-soft transition-colors ${
            flash ? 'border-code/40 bg-code/10 text-code' : ''
          }`}
        >
          {flash ? 'updated' : 'read-only · generated live'}
        </span>
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            className="pb-btn pb-btn-ghost px-2 py-1"
            title="Copy the code"
            onClick={() => {
              void navigator.clipboard.writeText(code).then(onCopied);
            }}
          >
            <CopyIcon size={16} />
          </button>
          <button
            type="button"
            className="pb-btn pb-btn-ghost px-2 py-1"
            title={`Download ${filename}`}
            onClick={download}
          >
            <DownloadIcon size={16} />
          </button>
        </div>
      </header>
      <div ref={hostRef} className="min-h-0 flex-1 overflow-auto bg-paper/40" />
    </section>
  );
}
