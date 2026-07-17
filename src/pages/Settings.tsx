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

const Settings = () => {
  const { toast } = useToast();
  const [cachedAtBoot] = useState<CachedSettings | null>(() => readCachedSettings());
  
  // FIXED: Changed type states to allow number OR empty string to avoid stuck zeroes
  const [pomodoroLength, setPomodoroLength] = useState<number | "">(cachedAtBoot?.workDuration ?? 25);
  const [shortBreakLength, setShortBreakLength] = useState<number | "">(cachedAtBoot?.shortBreakDuration ?? 5);
  const [longBreakLength, setLongBreakLength] = useState<number | "">(cachedAtBoot?.longBreakDuration ?? 15);
  
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

  const loadLocalSettings = () => readCachedSettings();

  useEffect(() => {
    let mounted = true;

    async function loadSettings() {
      const hasCached = !!loadLocalSettings();
      if (!hasCached) setIsLoadingSettings(true);
      try {
        if (!authChecked) return;
        if (!isAuthenticated) { navigate("/auth", { replace: true }); return; }

        const token = await getToken();
        if (!token) return;

        const httpsUrl = `https://sereno-u1sb.onrender.com/api/UserSettings`;
        const httpUrl = `https://sereno-u1sb.onrender.com/api/UserSettings`;
        let resp;
        try {
          resp = await axios.get(httpsUrl, { headers: { Authorization: `Bearer ${token}` } });
        } catch {
          resp = await axios.get(httpUrl, { headers: { Authorization: `Bearer ${token}` } });
        }

        if (!mounted || hasUserEditedRef.current) return;

        const s = resp.data;
        if (typeof s.workDuration === "number") setPomodoroLength(s.workDuration);
        if (typeof s.shortBreakDuration === "number") setShortBreakLength(s.shortBreakDuration);
        if (typeof s.longBreakDuration === "number") setLongBreakLength(s.longBreakDuration);
        if (typeof s.notificationsEnabled === "boolean") setNotifications(s.notificationsEnabled);
        if (typeof s.alarmSound === "string") setSound(s.alarmSound !== "muted");

        applyLocal({
          workDuration: typeof s.workDuration === "number" ? s.workDuration : undefined,
          shortBreakDuration: typeof s.shortBreakDuration === "number" ? s.shortBreakDuration : undefined,
          longBreakDuration: typeof s.longBreakDuration === "number" ? s.longBreakDuration : undefined,
          notificationsEnabled: typeof s.notificationsEnabled === "boolean" ? s.notificationsEnabled : undefined,
          alarmSound: typeof s.alarmSound === "string" ? s.alarmSound : undefined,
        });

        saveLocalSettings({
          workDuration: typeof s.workDuration === "number" ? s.workDuration : (Number(pomodoroLength) || 25),
          shortBreakDuration: typeof s.shortBreakDuration === "number" ? s.shortBreakDuration : (Number(shortBreakLength) || 5),
          longBreakDuration: typeof s.longBreakDuration === "number" ? s.longBreakDuration : (Number(longBreakLength) || 15),
          notificationsEnabled: typeof s.notificationsEnabled === "boolean" ? s.notificationsEnabled : notifications,
          alarmSound: typeof s.alarmSound === "string" ? s.alarmSound : (sound ? "default" : "muted"),
        });

      } catch (err) {
        if (!mounted) return;
        if (axios.isAxiosError(err) && err.response?.status === 401) navigate("/auth", { replace: true });

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
    return () => { mounted = false; };
  }, [navigate, authChecked, isAuthenticated, applyLocal]);

  const handleSave = async () => {
    // FIXED: Enforce absolute validation rule checking if any field is empty, 0, or negative
    const pLength = Number(pomodoroLength);
    const sLength = Number(shortBreakLength);
    const lLength = Number(longBreakLength);

    if (!pLength || pLength <= 0 || !sLength || sLength <= 0 || !lLength || lLength <= 0) {
      toast({
        title: "Invalid Durations",
        description: "All timer fields must have a value greater than 0.",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);
    try {
      const token = await getToken();
      if (!token) {
        toast({ title: "Not authenticated", description: "Please sign in before saving settings.", variant: "destructive" });
        setIsSaving(false);
        return;
      }

      const payload = {
        workDuration: pLength,
        shortBreakDuration: sLength,
        longBreakDuration: lLength,
        pomodorosBeforeLongBreak: 4,
        theme: "light",
        alarmSound: sound ? "default" : "muted",
        notificationsEnabled: notifications,
      };

      saveLocalSettings(payload);

      const httpsUrl = `https://sereno-u1sb.onrender.com/api/UserSettings`;
      const httpUrl = `https://sereno-u1sb.onrender.com/api/UserSettings`;
      let persistedToBackend = true;
      try {
        await axios.put(httpsUrl, payload, { headers: { Authorization: `Bearer ${await getToken()}`, "Content-Type": "application/json" } });
      } catch {
        try {
          await axios.put(httpUrl, payload, { headers: { Authorization: `Bearer ${await getToken()}`, "Content-Type": "application/json" } });
        } catch {
          persistedToBackend = false;
        }
      }

      applyLocal({
        workDuration: payload.workDuration,
        shortBreakDuration: payload.shortBreakDuration,
        longBreakDuration: payload.longBreakDuration,
        notificationsEnabled: payload.notificationsEnabled,
        alarmSound: payload.alarmSound,
      });

      if (persistedToBackend) { try { await refresh(); } catch { } }

      toast({
        title: persistedToBackend ? "Settings Saved" : "Settings Saved Locally",
        description: persistedToBackend
          ? "Your preferences have been updated."
          : "Backend is unavailable. Your settings are applied locally for this session.",
      });
    } catch (err: unknown) {
      let message = "Could not save settings.";
      if (axios.isAxiosError(err)) message = toErrorText(err.response?.data) || err.message || message;
      else if (err instanceof Error) message = err.message;
      else message = toErrorText(err);
      toast({ title: "Save Failed", description: message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  // Helper handling conversion logic cleanly while allowing empty inputs to clear out 0
  const handleInputChange = (val: string, setter: (v: number | "") => void) => {
    hasUserEditedRef.current = true;
    if (val === "") {
      setter("");
    } else {
      setter(Number(val));
    }
  };

  if (!authChecked) return <SettingsSkeleton />;

  return (
    <div className="h-screen overflow-hidden flex flex-col pt-20 pb-2 px-4">
      <div className="max-w-3xl mx-auto w-full flex flex-col gap-5 h-full">

        {/* Header */}
        <div className="space-y-1 shrink-0">
          <h1 className="text-3xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground">Customize your Pomodoro experience</p>
        </div>

        {/* Timer Settings */}
        <div className="glass-panel rounded-xl p-5 space-y-2 shrink-0">
          <div className="flex items-center gap-3">
            <Clock className="w-6 h-6 text-primary" />
            <h2 className="text-md font-bold text-foreground">Timer Duration</h2>
          </div>

          <div className="space-y-2">
            <div>
              <label htmlFor="pomodoro-length" className="block text-sm font-medium text-foreground mb-1">
                Pomodoro Length (minutes)
              </label>
              <input
                id="pomodoro-length"
                type="number"
                value={pomodoroLength}
                onChange={(e) => handleInputChange(e.target.value, setPomodoroLength)}
                className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                min="1" max="60"
                disabled={isSaving || isLoadingSettings}
              />
            </div>

            <div>
              <label htmlFor="short-break-length" className="block text-sm font-medium text-foreground mb-1">
                Short Break Length (minutes)
              </label>
              <input
                id="short-break-length"
                type="number"
                value={shortBreakLength}
                onChange={(e) => handleInputChange(e.target.value, setShortBreakLength)}
                className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                min="1" max="30"
                disabled={isSaving || isLoadingSettings}
              />
            </div>

            <div>
              <label htmlFor="long-break-length" className="block text-sm font-medium text-foreground mb-1">
                Long Break Length (minutes)
              </label>
              <input
                id="long-break-length"
                type="number"
                value={longBreakLength}
                onChange={(e) => handleInputChange(e.target.value, setLongBreakLength)}
                className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                min="1" max="60"
                disabled={isSaving || isLoadingSettings}
              />
            </div>
          </div>
        </div>

        {/* Notification Settings */}
        <div className="glass-panel rounded-2xl p-5 space-y-4 shrink-0">
          <div className="flex items-center gap-3">
            <Bell className="w-6 h-6 text-primary" />
            <h2 className="text-md font-bold text-foreground">Notifications</h2>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Enable Notifications</p>
                <p className="text-sm text-muted-foreground">Get notified when timer ends</p>
              </div>
              <button
                aria-label="Toggle Notifications"
                onClick={() => { hasUserEditedRef.current = true; setNotifications(!notifications); }}
                className={`relative w-12 h-6 rounded-full transition-colors ${notifications ? "bg-primary" : "bg-white/20"}`}
                disabled={isSaving || isLoadingSettings}
              >
                <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${notifications ? "translate-x-6" : ""}`} />
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
                aria-label="Toggle Sound Alerts"
                onClick={() => { hasUserEditedRef.current = true; setSound(!sound); }}
                className={`relative w-12 h-6 rounded-full transition-colors ${sound ? "bg-primary" : "bg-white/20"}`}
                disabled={isSaving || isLoadingSettings}
              >
                <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${sound ? "translate-x-6" : ""}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={isSaving || isLoadingSettings}
          className={`w-full py-2 rounded-lg transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 font-semibold shrink-0 ${
            (isSaving || isLoadingSettings)
              ? "bg-white/10 text-muted-foreground cursor-wait"
              : "bg-primary text-primary-foreground hover:bg-primary/90"
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