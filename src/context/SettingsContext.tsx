import React from "react";
import axios from "axios";
import { supabase } from "../supabaseClient";
import { useAuth } from "./AuthContext";

export type TimerSettings = {
  workDuration: number; // minutes
  shortBreakDuration: number; // minutes
  longBreakDuration: number; // minutes
  notificationsEnabled: boolean;
  alarmSound: string;
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
  notificationsEnabled: true,
  alarmSound: "default",
};

const LOCAL_SETTINGS_KEY = "sereno-local-settings";

const readCachedSettings = (): TimerSettings | null => {
  try {
    const raw = localStorage.getItem(LOCAL_SETTINGS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      workDuration?: number;
      shortBreakDuration?: number;
      longBreakDuration?: number;
      notificationsEnabled?: boolean;
      alarmSound?: string;
    };

    return {
      workDuration: typeof parsed.workDuration === "number" ? parsed.workDuration : defaultSettings.workDuration,
      shortBreakDuration: typeof parsed.shortBreakDuration === "number" ? parsed.shortBreakDuration : defaultSettings.shortBreakDuration,
      longBreakDuration: typeof parsed.longBreakDuration === "number" ? parsed.longBreakDuration : defaultSettings.longBreakDuration,
      notificationsEnabled: typeof parsed.notificationsEnabled === "boolean" ? parsed.notificationsEnabled : defaultSettings.notificationsEnabled,
      alarmSound: typeof parsed.alarmSound === "string" ? parsed.alarmSound : defaultSettings.alarmSound,
    };
  } catch {
    return null;
  }
};

const saveCachedSettings = (settings: TimerSettings) => {
  try {
    localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // ignore storage failures
  }
};

const getToken = async (): Promise<string | null> => {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token ?? null;
    if (token) return token;

    const sessionKey = Object.keys(localStorage).find(
      (key) => key.startsWith("sb-") && key.endsWith("-auth-token")
    );
    if (!sessionKey) return null;

    const sessionData = JSON.parse(localStorage.getItem(sessionKey) || "{}");
    return sessionData?.access_token || null;
  } catch {
    return null;
  }
};

const SettingsContext = React.createContext<SettingsContextValue | undefined>(undefined);

export const SettingsProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const { authChecked, isAuthenticated, session } = useAuth();
  const [settings, setSettings] = React.useState<TimerSettings>(defaultSettings);
  const [isLoading, setIsLoading] = React.useState(false);

  const refresh = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const token = session?.access_token ?? await getToken();
      if (!token) return;

      const httpsUrl = "https://localhost:5001/api/UserSettings";
      const httpUrl = "http://localhost:5000/api/UserSettings";
      let resp;
      try {
        resp = await axios.get(httpsUrl, { headers: { Authorization: `Bearer ${token}` } });
      } catch {
        resp = await axios.get(httpUrl, { headers: { Authorization: `Bearer ${token}` } });
      }

      const s = resp.data;
      setSettings((prev) => {
        const next = {
          workDuration: typeof s.workDuration === "number" ? s.workDuration : prev.workDuration,
          shortBreakDuration: typeof s.shortBreakDuration === "number" ? s.shortBreakDuration : prev.shortBreakDuration,
          longBreakDuration: typeof s.longBreakDuration === "number" ? s.longBreakDuration : prev.longBreakDuration,
          notificationsEnabled: typeof s.notificationsEnabled === "boolean" ? s.notificationsEnabled : prev.notificationsEnabled,
          alarmSound: typeof s.alarmSound === "string" ? s.alarmSound : prev.alarmSound,
        };
        saveCachedSettings(next);
        return next;
      });
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, [session?.access_token]);

  const applyLocal = React.useCallback((partial: Partial<TimerSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...partial };
      saveCachedSettings(next);
      return next;
    });
  }, []);

  React.useEffect(() => {
    if (!authChecked) return;

    if (!isAuthenticated) {
      // Never expose previous user's personalized settings when logged out.
      setSettings(defaultSettings);
      try {
        localStorage.removeItem(LOCAL_SETTINGS_KEY);
      } catch {
        // ignore
      }
      return;
    }

    const cached = readCachedSettings();
    if (cached) {
      setSettings(cached);
    }

    void refresh();
  }, [authChecked, isAuthenticated, refresh]);

  const value = React.useMemo(() => ({ settings, isLoading, refresh, applyLocal }), [settings, isLoading, refresh, applyLocal]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};

export function useSettings() {
  const ctx = React.useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}

export default SettingsContext;
