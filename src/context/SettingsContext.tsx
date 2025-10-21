import React from "react";
import axios from "axios";
import { supabase } from "../supabaseClient";

export type TimerSettings = {
  workDuration: number; // minutes
  shortBreakDuration: number; // minutes
  longBreakDuration: number; // minutes
};

type SettingsContextValue = {
  settings: TimerSettings;
  isLoading: boolean;
  refresh: () => Promise<void>;
  applyLocal: (partial: Partial<TimerSettings>) => void;
};

const defaultSettings: TimerSettings = {
  workDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
};

const SettingsContext = React.createContext<SettingsContextValue | undefined>(undefined);

export const SettingsProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [settings, setSettings] = React.useState<TimerSettings>(defaultSettings);
  const [isLoading, setIsLoading] = React.useState(false);

  const refresh = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) return;
      const resp = await axios.get('/api/UserSettings', { headers: { Authorization: `Bearer ${token}` } });
      const s = resp.data;
      setSettings({
        workDuration: typeof s.workDuration === 'number' ? s.workDuration : settings.workDuration,
        shortBreakDuration: typeof s.shortBreakDuration === 'number' ? s.shortBreakDuration : settings.shortBreakDuration,
        longBreakDuration: typeof s.longBreakDuration === 'number' ? s.longBreakDuration : settings.longBreakDuration,
      });
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, [settings.longBreakDuration, settings.shortBreakDuration, settings.workDuration]);

  const applyLocal = React.useCallback((partial: Partial<TimerSettings>) => {
    setSettings((prev) => ({ ...prev, ...partial }));
  }, []);

  const value = React.useMemo(() => ({ settings, isLoading, refresh, applyLocal }), [settings, isLoading, refresh, applyLocal]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};

export function useSettings() {
  const ctx = React.useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}

export default SettingsContext;
