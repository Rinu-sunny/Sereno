import { useRef, useState } from "react";
import { Save, Bell, Clock, Volume2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import axios from "axios";
import { supabase } from "../supabaseClient";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useSettings } from "@/context/SettingsContext";
import SettingsSkeleton from '@/components/skeletons/SettingsSkeleton';

const LOCAL_SETTINGS_KEY = "sereno-local-settings";

type CachedSettings = {
  workDuration?: number;
  shortBreakDuration?: number;
  longBreakDuration?: number;
  notificationsEnabled?: boolean;
  alarmSound?: string;
};

const readCachedSettings = (): CachedSettings | null => {
  try {
    const raw = localStorage.getItem(LOCAL_SETTINGS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedSettings;
    return parsed;
  } catch {
    return null;
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

const Settings = () => {
  const { toast } = useToast();
  const [cachedAtBoot] = useState<CachedSettings | null>(() => readCachedSettings());
  const [pomodoroLength, setPomodoroLength] = useState(cachedAtBoot?.workDuration ?? 25);
  const [shortBreakLength, setShortBreakLength] = useState(cachedAtBoot?.shortBreakDuration ?? 5);
  const [longBreakLength, setLongBreakLength] = useState(cachedAtBoot?.longBreakDuration ?? 15);
  const [notifications, setNotifications] = useState(cachedAtBoot?.notificationsEnabled ?? true);
  const [sound, setSound] = useState((cachedAtBoot?.alarmSound ?? "default") !== "muted");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingSettings, setIsLoadingSettings] = useState(!cachedAtBoot);
  const hasUserEditedRef = useRef(false);
  const navigate = useNavigate();
  const { authChecked, isAuthenticated } = useAuth();
  const { applyLocal, refresh } = useSettings();

  const saveLocalSettings = (payload: {
    workDuration: number;
    shortBreakDuration: number;
    longBreakDuration: number;
    notificationsEnabled: boolean;
    alarmSound: string;
  }) => {
    try {
      localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(payload));
    } catch {
      // ignore storage errors
    }
  };

  const loadLocalSettings = () => {
    return readCachedSettings();
  };

  const toErrorText = (value: unknown): string => {
    if (typeof value === "string") return value;
    if (value && typeof value === "object") {
      const maybe = value as { error?: unknown; message?: unknown; title?: unknown };
      if (typeof maybe.error === "string") return maybe.error;
      if (typeof maybe.message === "string") return maybe.message;
      if (typeof maybe.title === "string") return maybe.title;
      try {
        return JSON.stringify(value);
      } catch {
        return "Unexpected error";
      }
    }
    return "Unexpected error";
  };

  useEffect(() => {
    let mounted = true;

    async function loadSettings() {
      const hasCached = !!loadLocalSettings();
      if (!hasCached) setIsLoadingSettings(true);
      try {
        // Only attempt to load if authenticated
        if (!authChecked) return;
        if (!isAuthenticated) {
          navigate("/auth", { replace: true });
          return;
        }

        const token = await getToken();
        if (!token) return;

        // Try HTTPS first, then fallback to HTTP to avoid dev-cert issues
        const httpsUrl = `https://localhost:5001/api/UserSettings`;
        const httpUrl = `http://localhost:5000/api/UserSettings`;
        let resp;
        try {
          resp = await axios.get(httpsUrl, { headers: { Authorization: `Bearer ${token}` } });
        } catch (e) {
          // fallback to http
          resp = await axios.get(httpUrl, { headers: { Authorization: `Bearer ${token}` } });
        }

        if (!mounted) return;
        if (hasUserEditedRef.current) return;

        const s = resp.data;
        // Map backend fields to local state where possible
        if (typeof s.workDuration === "number") setPomodoroLength(s.workDuration);
        if (typeof s.shortBreakDuration === "number") setShortBreakLength(s.shortBreakDuration);
        if (typeof s.longBreakDuration === "number") setLongBreakLength(s.longBreakDuration);
        if (typeof s.notificationsEnabled === "boolean") setNotifications(s.notificationsEnabled);
        if (typeof s.alarmSound === "string") setSound(s.alarmSound !== "muted");

        // Update context so Timer picks up new values
        applyLocal({
          workDuration: typeof s.workDuration === "number" ? s.workDuration : undefined,
          shortBreakDuration: typeof s.shortBreakDuration === "number" ? s.shortBreakDuration : undefined,
          longBreakDuration: typeof s.longBreakDuration === "number" ? s.longBreakDuration : undefined,
          notificationsEnabled: typeof s.notificationsEnabled === "boolean" ? s.notificationsEnabled : undefined,
          alarmSound: typeof s.alarmSound === "string" ? s.alarmSound : undefined,
        });

        saveLocalSettings({
          workDuration: typeof s.workDuration === "number" ? s.workDuration : pomodoroLength,
          shortBreakDuration: typeof s.shortBreakDuration === "number" ? s.shortBreakDuration : shortBreakLength,
          longBreakDuration: typeof s.longBreakDuration === "number" ? s.longBreakDuration : longBreakLength,
          notificationsEnabled: typeof s.notificationsEnabled === "boolean" ? s.notificationsEnabled : notifications,
          alarmSound: typeof s.alarmSound === "string" ? s.alarmSound : (sound ? "default" : "muted"),
        });

      } catch (err) {
        if (!mounted) return;
        // If 404 — no settings yet, keep defaults. If 401 — redirect to auth.
        if (axios.isAxiosError(err)) {
          if (err.response?.status === 401) navigate("/auth", { replace: true });
        }

        const local = loadLocalSettings();
        if (local && !hasUserEditedRef.current) {
          if (typeof local.workDuration === "number") setPomodoroLength(local.workDuration);
          if (typeof local.shortBreakDuration === "number") setShortBreakLength(local.shortBreakDuration);
          if (typeof local.longBreakDuration === "number") setLongBreakLength(local.longBreakDuration);
          if (typeof local.notificationsEnabled === "boolean") setNotifications(local.notificationsEnabled);
          if (typeof local.alarmSound === "string") setSound(local.alarmSound !== "muted");

          applyLocal({
            workDuration: typeof local.workDuration === "number" ? local.workDuration : undefined,
            shortBreakDuration: typeof local.shortBreakDuration === "number" ? local.shortBreakDuration : undefined,
            longBreakDuration: typeof local.longBreakDuration === "number" ? local.longBreakDuration : undefined,
            notificationsEnabled: typeof local.notificationsEnabled === "boolean" ? local.notificationsEnabled : undefined,
            alarmSound: typeof local.alarmSound === "string" ? local.alarmSound : undefined,
          });
        }
      } finally {
        if (mounted) setIsLoadingSettings(false);
      }
    }

    loadSettings();

    return () => {
      mounted = false;
    };
  }, [navigate, authChecked, isAuthenticated, applyLocal]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const token = await getToken();

      if (!token) {
        toast({
          title: "Not authenticated",
          description: "Please sign in before saving settings.",
          variant: "destructive",
        });
        setIsSaving(false);
        return;
      }

      // Build payload matching backend UserSetting DTO
      const payload = {
        workDuration: pomodoroLength,
        shortBreakDuration: shortBreakLength,
        longBreakDuration: longBreakLength,
        pomodorosBeforeLongBreak: 4,
        theme: "light",
        alarmSound: sound ? "default" : "muted",
        notificationsEnabled: notifications,
      };

      saveLocalSettings(payload);

      // Try HTTPS first then HTTP fallback (local dev cert may be untrusted)
      const httpsUrl = `https://localhost:5001/api/UserSettings`;
      const httpUrl = `http://localhost:5000/api/UserSettings`;

      let persistedToBackend = true;
      try {
        await axios.put(httpsUrl, payload, {
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        });
      } catch {
        try {
          await axios.put(httpUrl, payload, {
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          });
        } catch {
          persistedToBackend = false;
        }
      }

      // Update context immediately and try refreshing from backend
      applyLocal({
        workDuration: payload.workDuration,
        shortBreakDuration: payload.shortBreakDuration,
        longBreakDuration: payload.longBreakDuration,
        notificationsEnabled: payload.notificationsEnabled,
        alarmSound: payload.alarmSound,
      });

      // Refresh from backend only when persistence succeeds, to avoid snapping values back.
      if (persistedToBackend) {
        try { await refresh(); } catch { /* ignore refresh errors */ }
      }

      toast({
        title: persistedToBackend ? "Settings Saved" : "Settings Saved Locally",
        description: persistedToBackend
          ? "Your preferences have been updated."
          : "Backend is unavailable (500). Your settings are applied locally for this session.",
      });
    } catch (err: unknown) {
      console.error("Error saving settings:", err);
      let message = "Could not save settings.";
      if (axios.isAxiosError(err)) {
        message = toErrorText(err.response?.data) || err.message || message;
      } else if (err instanceof Error) {
        message = err.message;
      } else {
        message = toErrorText(err);
      }

      toast({
        title: "Save Failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!authChecked) return <SettingsSkeleton />;

  return (
    <div className="min-h-screen pt-24 pb-12 px-4">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground">Customize your Pomodoro experience</p>
        </div>

        {/* Timer Settings */}
        <div className="glass-panel rounded-2xl p-6 space-y-6">
          <div className="flex items-center gap-3">
            <Clock className="w-6 h-6 text-primary" />
            <h2 className="text-2xl font-bold text-foreground">Timer Duration</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Pomodoro Length (minutes)
              </label>
              <input
                type="number"
                value={pomodoroLength}
                onChange={(e) => {
                  hasUserEditedRef.current = true;
                  setPomodoroLength(Number(e.target.value));
                }}
                className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                min="1"
                max="60"
                disabled={isSaving || isLoadingSettings}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Short Break Length (minutes)
              </label>
              <input
                type="number"
                value={shortBreakLength}
                onChange={(e) => {
                  hasUserEditedRef.current = true;
                  setShortBreakLength(Number(e.target.value));
                }}
                className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                min="1"
                max="30"
                disabled={isSaving || isLoadingSettings}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Long Break Length (minutes)
              </label>
              <input
                type="number"
                value={longBreakLength}
                onChange={(e) => {
                  hasUserEditedRef.current = true;
                  setLongBreakLength(Number(e.target.value));
                }}
                className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                min="1"
                max="60"
                disabled={isSaving || isLoadingSettings}
              />
            </div>
          </div>
        </div>

        {/* Notification Settings */}
        <div className="glass-panel rounded-2xl p-6 space-y-6">
          <div className="flex items-center gap-3">
            <Bell className="w-6 h-6 text-primary" />
            <h2 className="text-2xl font-bold text-foreground">Notifications</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Enable Notifications</p>
                <p className="text-sm text-muted-foreground">Get notified when timer ends</p>
              </div>
              <button
                onClick={() => {
                  hasUserEditedRef.current = true;
                  setNotifications(!notifications);
                }}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  notifications ? "bg-primary" : "bg-white/20"
                }`}
                disabled={isSaving || isLoadingSettings}
              >
                <div
                  className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    notifications ? "translate-x-6" : ""
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground flex items-center gap-2">
                  <Volume2 className="w-4 h-4" />
                  Sound Alerts
                </p>
                <p className="text-sm text-muted-foreground">Play sound when timer completes</p>
              </div>
              <button
                onClick={() => {
                  hasUserEditedRef.current = true;
                  setSound(!sound);
                }}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  sound ? "bg-primary" : "bg-white/20"
                }`}
                disabled={isSaving || isLoadingSettings}
              >
                <div
                  className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    sound ? "translate-x-6" : ""
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={isSaving || isLoadingSettings}
          className={`w-full py-4 rounded-lg transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 font-semibold ${
            (isSaving || isLoadingSettings) ? "bg-white/10 text-muted-foreground cursor-wait" : "bg-primary text-primary-foreground hover:bg-primary/90"
          }`}
        >
          <Save className="w-5 h-5" />
          {isLoadingSettings ? "Loading settings..." : isSaving ? "Saving..." : "Save Settings"}
        </button>
        </div>
    </div>
  );
};

export default Settings;
