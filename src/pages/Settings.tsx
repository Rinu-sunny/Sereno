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
    return JSON.parse(raw) as CachedSettings;
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
    try { return JSON.stringify(value); } catch { return "Unexpected error"; }
  }
  return "Unexpected error";
};

// Compact number stepper component
const Stepper = ({
  id, label, value, min, max, disabled, onChange,
}: {
  id: string; label: string; value: number; min: number; max: number;
  disabled: boolean; onChange: (v: number) => void;
}) => (
  <div className="flex items-center justify-between gap-4">
    <label htmlFor={id} className="text-sm font-medium text-foreground flex-1 leading-tight">
      {label}
    </label>
    <div className="flex items-center gap-1">
      <button
        type="button"
        aria-label={`Decrease ${label}`}
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={disabled || value <= min}
        className="w-7 h-7 rounded-md bg-white/10 hover:bg-white/20 disabled:opacity-30 text-foreground font-bold text-lg leading-none transition-colors flex items-center justify-center"
      >
        −
      </button>
      <input
        id={id}
        type="number"
        value={value}
        onChange={(e) => onChange(Math.min(max, Math.max(min, Number(e.target.value))))}
        className="w-12 text-center bg-white/5 border border-white/20 rounded-md text-foreground text-sm py-1 focus:outline-none focus:ring-1 focus:ring-primary [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        min={min}
        max={max}
        disabled={disabled}
      />
      <button
        type="button"
        aria-label={`Increase ${label}`}
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={disabled || value >= max}
        className="w-7 h-7 rounded-md bg-white/10 hover:bg-white/20 disabled:opacity-30 text-foreground font-bold text-lg leading-none transition-colors flex items-center justify-center"
      >
        +
      </button>
    </div>
  </div>
);

// Toggle row component
const ToggleRow = ({
  label, description, icon, enabled, disabled, onToggle,
}: {
  label: string; description: string; icon: React.ReactNode;
  enabled: boolean; disabled: boolean; onToggle: () => void;
}) => (
  <div className="flex items-center justify-between gap-4">
    <div className="flex items-center gap-2 flex-1 min-w-0">
      <span className="text-muted-foreground shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground leading-tight">{label}</p>
        <p className="text-xs text-muted-foreground leading-tight">{description}</p>
      </div>
    </div>
    <button
      type="button"
      aria-label={`Toggle ${label}`}
      onClick={onToggle}
      disabled={disabled}
      className={`relative shrink-0 w-11 h-6 rounded-full transition-colors disabled:opacity-40 ${
        enabled ? "bg-primary" : "bg-white/20"
      }`}
    >
      <div
        className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
          enabled ? "translate-x-5" : ""
        }`}
      />
    </button>
  </div>
);

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
    workDuration: number; shortBreakDuration: number; longBreakDuration: number;
    notificationsEnabled: boolean; alarmSound: string;
  }) => {
    try { localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(payload)); } catch { }
  };

  useEffect(() => {
    let mounted = true;
    async function loadSettings() {
      const hasCached = !!readCachedSettings();
      if (!hasCached) setIsLoadingSettings(true);
      try {
        if (!authChecked) return;
        if (!isAuthenticated) { navigate("/auth", { replace: true }); return; }
        const token = await getToken();
        if (!token) return;
        const url = `https://sereno-u1sb.onrender.com/api/UserSettings`;
        const resp = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });
        if (!mounted || hasUserEditedRef.current) return;
        const s = resp.data;
        if (typeof s.workDuration === "number") setPomodoroLength(s.workDuration);
        if (typeof s.shortBreakDuration === "number") setShortBreakLength(s.shortBreakDuration);
        if (typeof s.longBreakDuration === "number") setLongBreakLength(s.longBreakDuration);
        if (typeof s.notificationsEnabled === "boolean") setNotifications(s.notificationsEnabled);
        if (typeof s.alarmSound === "string") setSound(s.alarmSound !== "muted");
        applyLocal({
          workDuration: s.workDuration, shortBreakDuration: s.shortBreakDuration,
          longBreakDuration: s.longBreakDuration, notificationsEnabled: s.notificationsEnabled,
          alarmSound: s.alarmSound,
        });
        saveLocalSettings({
          workDuration: s.workDuration ?? pomodoroLength,
          shortBreakDuration: s.shortBreakDuration ?? shortBreakLength,
          longBreakDuration: s.longBreakDuration ?? longBreakLength,
          notificationsEnabled: s.notificationsEnabled ?? notifications,
          alarmSound: s.alarmSound ?? (sound ? "default" : "muted"),
        });
      } catch (err) {
        if (!mounted) return;
        if (axios.isAxiosError(err) && err.response?.status === 401) navigate("/auth", { replace: true });
        const local = readCachedSettings();
        if (local && !hasUserEditedRef.current) {
          if (typeof local.workDuration === "number") setPomodoroLength(local.workDuration);
          if (typeof local.shortBreakDuration === "number") setShortBreakLength(local.shortBreakDuration);
          if (typeof local.longBreakDuration === "number") setLongBreakLength(local.longBreakDuration);
          if (typeof local.notificationsEnabled === "boolean") setNotifications(local.notificationsEnabled);
          if (typeof local.alarmSound === "string") setSound(local.alarmSound !== "muted");
          applyLocal(local);
        }
      } finally {
        if (mounted) setIsLoadingSettings(false);
      }
    }
    loadSettings();
    return () => { mounted = false; };
  }, [navigate, authChecked, isAuthenticated, applyLocal]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const token = await getToken();
      if (!token) {
        toast({ title: "Not authenticated", description: "Please sign in before saving.", variant: "destructive" });
        return;
      }
      const payload = {
        workDuration: pomodoroLength, shortBreakDuration: shortBreakLength,
        longBreakDuration: longBreakLength, pomodorosBeforeLongBreak: 4,
        theme: "light", alarmSound: sound ? "default" : "muted",
        notificationsEnabled: notifications,
      };
      saveLocalSettings(payload);
      let persistedToBackend = true;
      try {
        await axios.put(`https://sereno-u1sb.onrender.com/api/UserSettings`, payload, {
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        });
      } catch { persistedToBackend = false; }
      applyLocal(payload);
      if (persistedToBackend) { try { await refresh(); } catch { } }
      toast({
        title: persistedToBackend ? "Settings saved" : "Saved locally",
        description: persistedToBackend ? "Your preferences have been updated." : "Backend unavailable — applied for this session.",
      });
    } catch (err: unknown) {
      let message = "Could not save settings.";
      if (axios.isAxiosError(err)) message = toErrorText(err.response?.data) || err.message || message;
      else if (err instanceof Error) message = err.message;
      toast({ title: "Save failed", description: message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  if (!authChecked) return <SettingsSkeleton />;

  const disabled = isSaving || isLoadingSettings;

  return (
    <div className="h-screen flex flex-col pt-16 px-6 overflow-hidden">
      <div className="flex-1 flex flex-col max-w-5xl mx-auto w-full py-8 gap-6 min-h-0">

        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">Customize your Pomodoro experience</p>
        </div>

        {/* Two-column card row */}
        <div className="grid grid-cols-2 gap-6 flex-1 min-h-0">

          {/* Timer durations */}
          <div className="glass-panel rounded-2xl p-6 flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Timer Durations</h2>
            </div>
            <div className="flex flex-col gap-4 flex-1 justify-around">
              <Stepper
                id="pomodoro-length" label="Focus" min={1} max={60}
                value={pomodoroLength} disabled={disabled}
                onChange={(v) => { hasUserEditedRef.current = true; setPomodoroLength(v); }}
              />
              <div className="border-t border-white/10" />
              <Stepper
                id="short-break-length" label="Short break" min={1} max={30}
                value={shortBreakLength} disabled={disabled}
                onChange={(v) => { hasUserEditedRef.current = true; setShortBreakLength(v); }}
              />
              <div className="border-t border-white/10" />
              <Stepper
                id="long-break-length" label="Long break" min={1} max={60}
                value={longBreakLength} disabled={disabled}
                onChange={(v) => { hasUserEditedRef.current = true; setLongBreakLength(v); }}
              />
            </div>
          </div>

          {/* Alerts */}
          <div className="glass-panel rounded-2xl p-6 flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Alerts</h2>
            </div>
            <div className="flex flex-col gap-4 flex-1 justify-around">
              <ToggleRow
                label="Notifications" description="Alert when the timer ends"
                icon={<Bell className="w-4 h-4" />}
                enabled={notifications} disabled={disabled}
                onToggle={() => { hasUserEditedRef.current = true; setNotifications(n => !n); }}
              />
              <div className="border-t border-white/10" />
              <ToggleRow
                label="Sound" description="Play a sound on completion"
                icon={<Volume2 className="w-4 h-4" />}
                enabled={sound} disabled={disabled}
                onToggle={() => { hasUserEditedRef.current = true; setSound(s => !s); }}
              />
            </div>
          </div>

        </div>

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={disabled}
          className={`w-full py-3 rounded-xl transition-all flex items-center justify-center gap-2 font-semibold ${
            disabled
              ? "bg-white/10 text-muted-foreground cursor-wait"
              : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg hover:shadow-xl"
          }`}
        >
          <Save className="w-5 h-5" />
          {isLoadingSettings ? "Loading…" : isSaving ? "Saving…" : "Save changes"}
        </button>

      </div>
    </div>
  );
};

export default Settings;