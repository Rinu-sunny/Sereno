import { useState } from "react";
import { Save, Bell, Clock, Volume2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Settings = () => {
  const { toast } = useToast();
  const [pomodoroLength, setPomodoroLength] = useState(25);
  const [shortBreakLength, setShortBreakLength] = useState(5);
  const [longBreakLength, setLongBreakLength] = useState(15);
  const [notifications, setNotifications] = useState(true);
  const [sound, setSound] = useState(true);

  const handleSave = () => {
    toast({
      title: "Settings Saved",
      description: "Your preferences have been updated successfully.",
    });
  };

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
          className="w-full py-4 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 font-semibold"
        >
          <Save className="w-5 h-5" />
          Save Settings
        </button>
      </div>
    </div>
  );
};

export default Settings;
