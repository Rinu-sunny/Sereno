import { useState, useEffect, useCallback } from "react";
import { Play, Pause, RotateCcw, SkipForward } from "lucide-react";
import axios from "axios";
import TimerCircle from "@/components/TimerCircle";
import { useSettings } from "@/context/SettingsContext";
import TaskPanel from "@/components/TaskPanel";
import TimerSkeleton from '@/components/skeletons/TimerSkeleton';
import { useAuth } from '@/context/AuthContext';
import { supabase } from "@/supabaseClient";
import { useToast } from "@/hooks/use-toast";

const API_BASE_URL = "https://localhost:5001/api";
const TIMER_STATE_KEY = "sereno-timer-state-v1";

interface TimerTask {
  id: string;
  title: string;
  isComplete: boolean;
  description?: string | null;
  targetPomodoros: number;
  completedPomodoros: number;
  createdAt: string;
  tags: string;
  order: number;
  dueDate?: string | null;
  updatedAt?: string | null;
}

const toSessionType = (mode: "pomodoro" | "short-break" | "long-break") => {
  if (mode === "pomodoro") return "work";
  if (mode === "short-break") return "short_break";
  return "long_break";
};

const playIntervalEndAlert = () => {
  try {
    const AudioCtx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const beep = (start: number, frequency: number, duration = 0.18) => {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(frequency, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.22, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

      oscillator.connect(gain);
      gain.connect(ctx.destination);

      oscillator.start(start);
      oscillator.stop(start + duration);
    };

    // Two short beeps to make session-end alerts clearly noticeable.
    beep(now, 880);
    beep(now + 0.24, 1046);

    // Close context after the sound is done.
    setTimeout(() => {
      void ctx.close();
    }, 900);
  } catch (err) {
    console.warn("Failed to play timer alert", err);
  }
};

const showIntervalEndNotification = async (mode: "pomodoro" | "short-break" | "long-break") => {
  try {
    if (!("Notification" in window)) return;

    const title = mode === "pomodoro" ? "Pomodoro Complete" : "Break Complete";
    const body = mode === "pomodoro"
      ? "Time for a break."
      : "Break is over. Time to focus.";

    const show = () => {
      void new Notification(title, { body, silent: false });
    };

    if (Notification.permission === "granted") {
      show();
      return;
    }

    if (Notification.permission === "default") {
      const permission = await Notification.requestPermission();
      if (permission === "granted") show();
    }
  } catch (err) {
    console.warn("Failed to show timer notification", err);
  }
};

const Timer = () => {
  const { settings } = useSettings();
  const { authChecked, session } = useAuth();
  const { toast } = useToast();
  // Sanitize settings values to avoid NaN (could happen if backend returns unexpected types)
  const workMinutes = Number(settings?.workDuration) || 25;
  const shortMinutes = Number(settings?.shortBreakDuration) || 5;
  const longMinutes = Number(settings?.longBreakDuration) || 15;
  const pomodoro = workMinutes * 60;
  const shortBreak = shortMinutes * 60;
  const longBreak = longMinutes * 60;

  const [time, setTime] = useState<number>(pomodoro);
  const [isRunning, setIsRunning] = useState(false);
  const [mode, setMode] = useState<"pomodoro" | "short-break" | "long-break">("pomodoro");
  // count completed pomodoros; after 4 pomodoros trigger a long break
  const [pomodoroCount, setPomodoroCount] = useState<number>(0);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [activeSessionBudgetMinutes, setActiveSessionBudgetMinutes] = useState<number | null>(null);
  const [endAtMs, setEndAtMs] = useState<number | null>(null);
  const [timerHydrated, setTimerHydrated] = useState(false);

  const getAuthHeaders = async () => {
    if (session?.access_token) return { Authorization: `Bearer ${session.access_token}` };

    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    if (!token) return null;
    return { Authorization: `Bearer ${token}` };
  };

  const startBackendSession = async (
    currentMode: "pomodoro" | "short-break" | "long-break",
    taskId?: string | null,
  ) => {
    const headers = await getAuthHeaders();
    if (!headers) return null;

    const type = toSessionType(currentMode);
    const params = new URLSearchParams({ type });
    if (taskId) params.set("taskId", taskId);

    try {
      try {
        const resp = await axios.post(`${API_BASE_URL}/PomodoroSession/start?${params.toString()}`, null, { headers });
        return resp.data?.id ?? null;
      } catch {
        const httpBase = API_BASE_URL.replace("https://localhost:5001", "http://localhost:5000");
        const resp = await axios.post(`${httpBase}/PomodoroSession/start?${params.toString()}`, null, { headers });
        return resp.data?.id ?? null;
      }
    } catch (err) {
      console.warn("Failed to start backend session", err);
      return null;
    }
  };

  const completeBackendSession = async (id: string) => {
    const headers = await getAuthHeaders();
    if (!headers) return;

    try {
      try {
        await axios.post(`${API_BASE_URL}/PomodoroSession/complete/${id}`, null, { headers });
      } catch {
        const httpBase = API_BASE_URL.replace("https://localhost:5001", "http://localhost:5000");
        await axios.post(`${httpBase}/PomodoroSession/complete/${id}`, null, { headers });
      }
    } catch (err) {
      console.warn("Failed to complete backend session", err);
    }
  };

  const fetchTasksForProgress = async (): Promise<TimerTask[]> => {
    const headers = await getAuthHeaders();
    if (!headers) return [];

    try {
      try {
        const resp = await axios.get<TimerTask[]>(`${API_BASE_URL}/tasks`, { headers });
        return resp.data;
      } catch {
        const httpBase = API_BASE_URL.replace("https://localhost:5001", "http://localhost:5000");
        const resp = await axios.get<TimerTask[]>(`${httpBase}/tasks`, { headers });
        return resp.data;
      }
    } catch (err) {
      console.warn("Failed to fetch tasks for collective progress", err);
      return [];
    }
  };

  const updateTaskForProgress = async (task: TimerTask) => {
    const headers = await getAuthHeaders();
    if (!headers) return;

    try {
      try {
        await axios.put(`${API_BASE_URL}/tasks/${task.id}`, task, { headers });
      } catch {
        const httpBase = API_BASE_URL.replace("https://localhost:5001", "http://localhost:5000");
        await axios.put(`${httpBase}/tasks/${task.id}`, task, { headers });
      }
    } catch (err) {
      console.warn(`Failed to update task ${task.id} during collective progress`, err);
    }
  };

  const applyCollectiveTaskProgress = async (sessionMinutes: number) => {
    const tasks = await fetchTasksForProgress();
    const updates: Promise<void>[] = [];
    let remainingBudget = Math.max(sessionMinutes, 0);

    for (const task of tasks) {
      if (remainingBudget <= 0) break;
      if (task.isComplete) continue;

      const remainingTaskMinutes = Math.max(task.targetPomodoros - task.completedPomodoros, 0);
      if (remainingTaskMinutes <= 0) continue;

      const minutesApplied = Math.min(remainingBudget, remainingTaskMinutes);
      const nextCompleted = task.completedPomodoros + minutesApplied;
      const nextTask: TimerTask = {
        ...task,
        completedPomodoros: nextCompleted,
        isComplete: nextCompleted >= task.targetPomodoros,
        updatedAt: new Date().toISOString(),
      };

      updates.push(updateTaskForProgress(nextTask));
      remainingBudget -= minutesApplied;
    }

    await Promise.all(updates);
  };

  const skipBackendSession = async (id: string) => {
    const headers = await getAuthHeaders();
    if (!headers) return;

    try {
      try {
        await axios.post(`${API_BASE_URL}/PomodoroSession/skip/${id}`, null, { headers });
      } catch {
        const httpBase = API_BASE_URL.replace("https://localhost:5001", "http://localhost:5000");
        await axios.post(`${httpBase}/PomodoroSession/skip/${id}`, null, { headers });
      }
    } catch (err) {
      console.warn("Failed to skip backend session", err);
    }
  };

  const totalTime =
    mode === "pomodoro" ? pomodoro : mode === "short-break" ? shortBreak : longBreak;

  // Restore timer state when returning to the Timer page.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(TIMER_STATE_KEY);
      if (!raw) {
        setTimerHydrated(true);
        return;
      }

      const saved = JSON.parse(raw) as {
        time?: number;
        isRunning?: boolean;
        mode?: "pomodoro" | "short-break" | "long-break";
        pomodoroCount?: number;
        activeSessionId?: string | null;
        activeSessionBudgetMinutes?: number | null;
        endAtMs?: number | null;
      };

      if (typeof saved.mode === "string") setMode(saved.mode);
      if (typeof saved.time === "number" && Number.isFinite(saved.time)) setTime(saved.time);
      if (typeof saved.pomodoroCount === "number" && Number.isFinite(saved.pomodoroCount)) {
        setPomodoroCount(saved.pomodoroCount);
      }
      if (typeof saved.activeSessionId === "string" || saved.activeSessionId === null) {
        setActiveSessionId(saved.activeSessionId ?? null);
      }
      if (typeof saved.activeSessionBudgetMinutes === "number" || saved.activeSessionBudgetMinutes === null) {
        setActiveSessionBudgetMinutes(saved.activeSessionBudgetMinutes ?? null);
      }
      if (typeof saved.endAtMs === "number" || saved.endAtMs === null) {
        setEndAtMs(saved.endAtMs ?? null);
      }
      if (typeof saved.isRunning === "boolean") {
        setIsRunning(saved.isRunning);
      }
    } catch {
      // Ignore invalid cached timer state.
    } finally {
      setTimerHydrated(true);
    }
  }, []);

  // Persist timer state so countdown can resume after navigation.
  useEffect(() => {
    if (!timerHydrated) return;
    try {
      localStorage.setItem(
        TIMER_STATE_KEY,
        JSON.stringify({
          time,
          isRunning,
          mode,
          pomodoroCount,
          activeSessionId,
          activeSessionBudgetMinutes,
          endAtMs,
        }),
      );
    } catch {
      // ignore storage failures
    }
  }, [time, isRunning, mode, pomodoroCount, activeSessionId, activeSessionBudgetMinutes, endAtMs, timerHydrated]);

  const handleIntervalEnd = useCallback(() => {
    setIsRunning(false);
    setEndAtMs(null);
    if (settings.alarmSound !== "muted") {
      playIntervalEndAlert();
    }
    if (settings.notificationsEnabled) {
      const isWork = mode === "pomodoro";
      toast({
        title: isWork ? "Pomodoro complete" : "Break complete",
        description: isWork ? "Great work. Time for a break." : "Break finished. Ready for focus?",
      });
      void showIntervalEndNotification(mode);
    }
    if (activeSessionId) {
      const finishedMode = mode;
      const finishedSessionId = activeSessionId;
      const finishedBudgetMinutes = activeSessionBudgetMinutes ?? Math.max(Math.ceil(totalTime / 60), 1);
      void (async () => {
        await completeBackendSession(finishedSessionId);
        if (finishedMode === "pomodoro") {
          await applyCollectiveTaskProgress(finishedBudgetMinutes);
          window.dispatchEvent(new Event("sereno:refresh-tasks"));
        }
      })();
      setActiveSessionId(null);
      setActiveSessionBudgetMinutes(null);
    }
    // Auto-advance behavior:
    // - If we just finished a pomodoro, increment pomodoroCount and go to short-break or long-break
    // - If we just finished a break, go back to pomodoro
    if (mode === "pomodoro") {
      const nextCount = pomodoroCount + 1;
      setPomodoroCount(nextCount);
      const giveLong = nextCount % 4 === 0;
      if (giveLong) {
        setMode("long-break");
        setTime(longBreak);
      } else {
        setMode("short-break");
        setTime(shortBreak);
      }
    } else {
      // finished any break -> back to pomodoro
      setMode("pomodoro");
      setTime(pomodoro);
    }
  }, [
    settings.alarmSound,
    settings.notificationsEnabled,
    mode,
    toast,
    activeSessionId,
    activeSessionBudgetMinutes,
    totalTime,
    pomodoroCount,
    longBreak,
    shortBreak,
    pomodoro,
  ]);

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (!isRunning) return;

    const targetEnd = endAtMs ?? (Date.now() + (time * 1000));
    if (!endAtMs) setEndAtMs(targetEnd);

    const tick = () => {
      const remaining = Math.max(0, Math.ceil((targetEnd - Date.now()) / 1000));
      setTime(remaining);
      if (remaining === 0) {
        handleIntervalEnd();
      }
    };

    tick();
    if (time > 0) {
      timer = setInterval(tick, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isRunning, time, endAtMs, handleIntervalEnd]);

  const switchMode = (newMode: "pomodoro" | "short-break" | "long-break") => {
    if (activeSessionId) {
      void skipBackendSession(activeSessionId);
      setActiveSessionId(null);
      setActiveSessionBudgetMinutes(null);
    }
    setEndAtMs(null);
    setMode(newMode);
    if (newMode === "pomodoro") setTime(pomodoro);
    if (newMode === "short-break") setTime(shortBreak);
    if (newMode === "long-break") setTime(longBreak);
    // If user manually switches to pomodoro, do not reset the pomodoroCount here.
    // If user manually selects a break and it's long-break, we'll keep the count as-is.
    setIsRunning(false);
  };

  // If settings change while staying in same mode, update remaining time proportionally only when not running
  useEffect(() => {
    if (!timerHydrated) return;
    if (isRunning) return;
    setEndAtMs(null);
    if (mode === "pomodoro") setTime(pomodoro);
    if (mode === "short-break") setTime(shortBreak);
    if (mode === "long-break") setTime(longBreak);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timerHydrated, settings.workDuration, settings.shortBreakDuration, settings.longBreakDuration, mode]);

  const modes = [
    { value: "pomodoro", label: "Pomodoro" },
    { value: "short-break", label: "Short Break" },
    { value: "long-break", label: "Long Break" },
  ] as const;

  if (!authChecked) return <TimerSkeleton />;

  const handleStartPause = async () => {
    if (isRunning) {
      const remaining = endAtMs ? Math.max(0, Math.ceil((endAtMs - Date.now()) / 1000)) : time;
      setTime(remaining);
      setIsRunning(false);
      setEndAtMs(null);
      return;
    }

    if (!activeSessionId) {
      const sessionBudget = Math.max(Math.ceil(time / 60), 1);
      const startedId = await startBackendSession(mode, null);
      if (startedId) {
        setActiveSessionId(startedId);
        setActiveSessionBudgetMinutes(sessionBudget);
      }
    }

    setEndAtMs(Date.now() + (time * 1000));
    setIsRunning(true);
  };

  return (
    <div className="min-h-screen pt-24 pb-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col lg:flex-row items-start justify-center gap-8">
          {/* Timer Section */}
          <div className="w-full lg:w-auto flex flex-col items-center gap-8">
            {/* Mode Selector */}
            <div className="flex gap-2 glass-panel rounded-full p-2">
              {modes.map((m) => (
                <button
                  key={m.value}
                  onClick={() => switchMode(m.value)}
                  className={`px-6 py-2 rounded-full transition-all duration-300 ${
                    mode === m.value
                      ? "bg-primary text-primary-foreground shadow-lg"
                      : "text-foreground hover:bg-white/10"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {/* Timer Circle */}
            <TimerCircle time={time} totalTime={totalTime} mode={mode} />

            {/* Controls */}
            <div className="flex gap-4">
              <button
                onClick={() => switchMode("pomodoro")}
                className="p-4 glass-panel rounded-full hover:bg-white/20 transition-all"
                aria-label="Reset to Pomodoro"
              >
                <RotateCcw className="w-6 h-6" />
              </button>
              <button
                onClick={handleStartPause}
                className="px-8 py-4 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
                aria-label={isRunning ? "Pause" : "Start"}
              >
                {isRunning ? (
                  <>
                    <Pause className="w-6 h-6" />
                    Pause
                  </>
                ) : (
                  <>
                    <Play className="w-6 h-6" />
                    Start
                  </>
                )}
              </button>
              <button
                onClick={() => switchMode("short-break")}
                className="p-4 glass-panel rounded-full hover:bg-white/20 transition-all"
                aria-label="Skip to Short Break"
              >
                <SkipForward className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Task Panel */}
          <TaskPanel />
        </div>
      </div>
    </div>
  );
};

export default Timer;
