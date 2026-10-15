/** User settings, remembered in localStorage. */
import { useCallback, useEffect, useState } from 'react';
import type { GeneratorOptions } from '../generators/generator';

export interface Settings extends GeneratorOptions {
  /** Show every serial device in the picker, not just Raspberry Pi boards. */
  showAllDevices: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  onboardLed: 'LED',
  showAllDevices: false,
};

const STORAGE_KEY = 'picoblocks.settings.v1';

function read(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<Settings>) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(read);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // Settings are a convenience; failing to store them is not fatal.
    }
  }, [settings]);

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((current) => ({ ...current, ...patch }));
  }, []);

  return [settings, update] as const;
}
