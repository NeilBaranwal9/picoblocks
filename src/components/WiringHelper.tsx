/** The wiring card that follows the selected hardware block. */
import { useState } from 'react';
import { WiringDiagram, wiringFor } from '../wiring';
import type { SelectedBlock } from './BlocklyWorkspace';
import { ChevronDownIcon, CloseIcon } from './Icons';

interface Props {
  block: SelectedBlock | null;
  onDismiss(): void;
}

export function WiringHelper({ block, onDismiss }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const guide = block ? wiringFor(block.type) : null;
  if (!block || !guide) return null;

  const gpio = block.pin !== null ? Number(block.pin) : undefined;

  return (
    <aside className="pointer-events-auto absolute top-3 right-3 z-10 w-[260px] rounded-xl border-[1.5px] border-line-strong bg-surface/97 shadow-xl backdrop-blur-sm sm:w-[290px]">
      <header className="flex items-center gap-1 border-b-[1.5px] border-line px-3 py-2">
        <h2 className="font-display text-sm font-semibold">{guide.title}</h2>
        <div className="ml-auto flex items-center">
          <button
            type="button"
            className="pb-btn pb-btn-ghost px-1 py-0.5"
            onClick={() => setCollapsed((value) => !value)}
            aria-expanded={!collapsed}
            title={collapsed ? 'Show the diagram' : 'Hide the diagram'}
          >
            <ChevronDownIcon
              size={16}
              className={collapsed ? '-rotate-90 transition-transform' : 'transition-transform'}
            />
          </button>
          <button
            type="button"
            className="pb-btn pb-btn-ghost px-1 py-0.5"
            onClick={onDismiss}
            title="Close"
          >
            <CloseIcon size={16} />
          </button>
        </div>
      </header>

      {!collapsed && (
        <div className="px-3 py-2">
          <WiringDiagram kind={guide.kind} gpio={gpio} className="h-64 w-full" />
          <ul className="mt-2 space-y-1.5 text-[12.5px] leading-snug text-ink-soft">
            {guide.steps.map((step) => (
              <li key={step} className="flex gap-1.5">
                <span aria-hidden="true" className="text-brand">
                  •
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </aside>
  );
}
