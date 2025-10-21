import { useState } from "react";
import { Save, Bell, Clock, Volume2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import axios from "axios";
import { supabase } from "../supabaseClient";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useSettings } from "@/context/SettingsContext";
import SettingsSkeleton from '@/components/skeletons/SettingsSkeleton';

const Settings = () => {
  const { toast } = useToast();
  const [pomodoroLength, setPomodoroLength] = useState(25);
  const [shortBreakLength, setShortBreakLength] = useState(5);
  const [longBreakLength, setLongBreakLength] = useState(15);
  const [notifications, setNotifications] = useState(true);
  const [sound, setSound] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const navigate = useNavigate();
  const { authChecked, isAuthenticated } = useAuth();
  const { applyLocal, refresh } = useSettings();

  useEffect(() => {
    let mounted = true;

    async function loadSettings() {
      try {
        // Only attempt to load if authenticated
        if (!authChecked) return;
        if (!isAuthenticated) {
          navigate("/auth", { replace: true });
          return;
        }

        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
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
        });

      } catch (err) {
        if (!mounted) return;
        // If 404 — no settings yet, keep defaults. If 401 — redirect to auth.
        if (axios.isAxiosError(err)) {
          if (err.response?.status === 401) navigate("/auth", { replace: true });
        }
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
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;

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

      // Try HTTPS first then HTTP fallback (local dev cert may be untrusted)
      const httpsUrl = `https://localhost:5001/api/UserSettings`;
      const httpUrl = `http://localhost:5000/api/UserSettings`;

      try {
        await axios.put(httpsUrl, payload, {
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        });
      } catch (err) {
        // try HTTP fallback
        await axios.put(httpUrl, payload, {
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        });
      }

      // Update context immediately and try refreshing from backend
      applyLocal({
        workDuration: payload.workDuration,
        shortBreakDuration: payload.shortBreakDuration,
        longBreakDuration: payload.longBreakDuration,
      });

      // Optional: best-effort backend refresh (ignore errors)
  try { await refresh(); } catch (e) { /* ignore refresh errors */ }

      toast({ title: "Settings Saved", description: "Your preferences have been updated." });
    } catch (err: unknown) {
      console.error("Error saving settings:", err);
      let message = "Could not save settings.";
      if (axios.isAxiosError(err)) {
        message = err.response?.data || err.message || message;
      } else if (err instanceof Error) {
        message = err.message;
      } else if (typeof err === "string") {
        message = err;
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
                onChange={(e) => setPomodoroLength(Number(e.target.value))}
                className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                min="1"
                max="60"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Short Break Length (minutes)
              </label>
              <input
                type="number"
                value={shortBreakLength}
                onChange={(e) => setShortBreakLength(Number(e.target.value))}
                className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                min="1"
                max="30"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Long Break Length (minutes)
              </label>
              <input
                type="number"
                value={longBreakLength}
                onChange={(e) => setLongBreakLength(Number(e.target.value))}
                className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                min="1"
                max="60"
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
                onClick={() => setNotifications(!notifications)}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  notifications ? "bg-primary" : "bg-white/20"
                }`}
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
                onClick={() => setSound(!sound)}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  sound ? "bg-primary" : "bg-white/20"
                }`}
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
          disabled={isSaving}
          className={`w-full py-4 rounded-lg transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 font-semibold ${
            isSaving ? "bg-white/10 text-muted-foreground cursor-wait" : "bg-primary text-primary-foreground hover:bg-primary/90"
          }`}
        >
          <Save className="w-5 h-5" />
          {isSaving ? "Saving..." : "Save Settings"}
        </button>
        </div>
    </div>
  );
};

export default Settings;
