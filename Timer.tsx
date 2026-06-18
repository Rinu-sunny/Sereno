import { useState, useEffect } from "react";
import { Play, Pause, RotateCcw, SkipForward } from "lucide-react";
import TimerCircle from "@/components/TimerCircle";
import { useSettings } from "@/context/SettingsContext"; // Assuming you use this context
import TaskPanel from "@/components/TaskPanel";
import TimerSkeleton from '@/components/skeletons/TimerSkeleton'; // Assuming you use this
import { useAuth } from '@/context/AuthContext'; // Assuming you use this context
import axios from 'axios'; // Import axios

// --- API and Auth Configuration ---
const API_BASE_URL = 'https://localhost:5001/api/pomodorosession'; // Pomodoro base URL

// Function to get the JWT token (adjust based on your auth state management)
const getToken = (): string | null => {
  try {
    // Attempt to retrieve the token from localStorage using Supabase v2 key pattern
    const sessionKey = Object.keys(localStorage).find(key => key.startsWith('sb-') && key.endsWith('-auth-token'));
    if (!sessionKey) {
        console.warn("Supabase session key not found in localStorage.");
        return null;
    }
    const sessionData = JSON.parse(localStorage.getItem(sessionKey) || '{}');
    return sessionData?.access_token || null;
  } catch (error) {
    console.error("Error retrieving token from localStorage:", error);
    return null;
  }
};

// Function to get headers with token
const getAuthHeaders = () => {
  const token = getToken();
  if (!token) {
    // In a real app, you might trigger a redirect to login here
    console.error("Authentication token not found. User might need to log in.");
    throw new Error("Authentication token not found.");
  }
  return { 'Authorization': `Bearer ${token}` };
};

// --- Define PomodoroSession type (matches backend C# model) ---
interface PomodoroSession {
    id: string; // Guid
    userId: string; // Guid
    taskId?: string | null; // Guid?
    type: string; // "work", "short_break", "long_break"
    durationMinutes: number;
    startedAt: string; // DateTime string (ISO 8601 format)
    endedAt?: string | null; // DateTime string (ISO 8601 format)?
    status: string; // "pending", "running", "paused", "completed", "skipped"
    sessionNumber: number;
    createdAt: string; // DateTime string (ISO 8601 format)
    // Task navigation property not usually needed in frontend representation
}

// --- API Call Functions for Pomodoro Sessions ---
const startSessionApi = async (taskId?: string | null, type?: string | null): Promise<PomodoroSession> => {
  let url = `${API_BASE_URL}/start`;
  const params = new URLSearchParams();
  // Only add params if they have a value
  if (taskId) params.append('taskId', taskId);
  if (type) params.append('type', type);
  if (params.toString()) url += `?${params.toString()}`;

  console.log("Starting session via API:", url);
  // Backend expects POST, potentially with data in query params, no request body needed here
  const response = await axios.post<PomodoroSession>(url, null, { headers: getAuthHeaders() });
  console.log("Session started:", response.data);
  return response.data;
};

const pauseSessionApi = async (sessionId: string): Promise<PomodoroSession> => {
  console.log(`Pausing session ${sessionId} via API...`);
  const response = await axios.post<PomodoroSession>(`${API_BASE_URL}/pause/${sessionId}`, null, { headers: getAuthHeaders() });
  console.log("Session paused:", response.data);
  return response.data;
};

const skipSessionApi = async (sessionId: string): Promise<PomodoroSession> => {
  console.log(`Skipping session ${sessionId} via API...`);
  const response = await axios.post<PomodoroSession>(`${API_BASE_URL}/skip/${sessionId}`, null, { headers: getAuthHeaders() });
  console.log("Session skipped:", response.data);
  return response.data;
};

const completeSessionApi = async (sessionId: string): Promise<PomodoroSession> => {
  console.log(`Completing session ${sessionId} via API...`);
  const response = await axios.post<PomodoroSession>(`${API_BASE_URL}/complete/${sessionId}`, null, { headers: getAuthHeaders() });
  console.log("Session completed:", response.data);
  return response.data;
};

// --- Your Timer Component ---
const Timer = () => {
  const { settings } = useSettings(); // Get settings from context
  const { authChecked } = useAuth(); // Check if auth state has been initially verified

  // Sanitize settings, provide defaults
  const workMinutes = Number(settings?.workDuration) || 25;
  const shortMinutes = Number(settings?.shortBreakDuration) || 5;
  const longMinutes = Number(settings?.longBreakDuration) || 15;
  const pomodorosBeforeLong = Number(settings?.pomodorosBeforeLongBreak) || 4;

  const pomodoro = workMinutes * 60;
  const shortBreak = shortMinutes * 60;
  const longBreak = longMinutes * 60;

  // --- State Variables ---
  const [time, setTime] = useState<number>(pomodoro); // Remaining time in seconds
  const [isRunning, setIsRunning] = useState(false); // Is the timer currently ticking?
  const [mode, setMode] = useState<"pomodoro" | "short-break" | "long-break">("pomodoro"); // Current timer mode
  const [pomodoroCount, setPomodoroCount] = useState<number>(0); // Count of completed pomodoros in the current cycle
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null); // ID of the session running on the backend
  const [apiError, setApiError] = useState<string | null>(null); // To display API errors

  const totalTime = // Total duration for the current mode
    mode === "pomodoro" ? pomodoro : mode === "short-break" ? shortBreak : longBreak;

  // --- Timer Countdown Logic ---
  useEffect(() => {
    let timerInterval: NodeJS.Timeout | null = null;

    // Start interval if timer should be running and time is left
    if (isRunning && time > 0) {
      timerInterval = setInterval(() => setTime((t) => t - 1), 1000);
    }
    // Handle timer completion
    else if (time === 0 && isRunning) {
      setIsRunning(false); // Stop the timer locally
      setApiError(null); // Clear previous errors
      console.log("Timer finished!");
      // TODO: Play sound or show notification here

      // --- Call Backend to Complete the Session ---
      if (currentSessionId) {
        completeSessionApi(currentSessionId)
          .then(completedSession => {
            console.log("Backend confirmed session completion:", completedSession);
            // Decide the next mode based on the type of session just completed
            if (completedSession.type === "work") { // Assuming backend uses "work" for pomodoro type
              const nextCount = pomodoroCount + 1;
              setPomodoroCount(nextCount);
              // Check if it's time for a long break based on settings
              const giveLongBreak = nextCount % pomodorosBeforeLong === 0;
              switchMode(giveLongBreak ? "long-break" : "short-break"); // Switch mode AFTER backend confirms
            } else { // Finished a short or long break
              switchMode("pomodoro"); // Switch back to pomodoro
            }
            setCurrentSessionId(null); // Clear the completed session ID
          })
          .catch(err => {
            console.error("Failed to complete session on backend:", err);
            setApiError(err.message || "Failed to sync session completion with backend.");
            // Decide how to handle failure. For now, just show error and switch mode locally as fallback.
             if (mode === "pomodoro") {
               const nextCount = pomodoroCount + 1;
               setPomodoroCount(nextCount);
               const giveLongBreak = nextCount % pomodorosBeforeLong === 0;
               switchMode(giveLongBreak ? "long-break" : "short-break");
             } else {
               switchMode("pomodoro");
             }
             setCurrentSessionId(null); // Clear ID even on error to prevent retry loops?
          });
      } else {
        // This case should ideally not happen if start logic is correct
        console.warn("Timer finished, but no active session ID was recorded. Switching mode locally.");
         if (mode === "pomodoro") {
           const nextCount = pomodoroCount + 1;
           setPomodoroCount(nextCount);
           const giveLongBreak = nextCount % pomodorosBeforeLong === 0;
           switchMode(giveLongBreak ? "long-break" : "short-break");
         } else {
           switchMode("pomodoro");
         }
      }
      // --- End Backend Call ---
    }

    // Cleanup function to clear interval when component unmounts or state changes
    return () => {
      if (timerInterval) clearInterval(timerInterval);
    };
  }, [isRunning, time, mode, pomodoroCount, currentSessionId, pomodoro, shortBreak, longBreak, pomodorosBeforeLong]); // Added dependencies

  // --- Function to Switch Modes and Reset Timer ---
  const switchMode = (newMode: "pomodoro" | "short-break" | "long-break") => {
    setIsRunning(false); // Stop timer when switching modes
    setMode(newMode);
    // Reset time based on the new mode's duration from settings
    if (newMode === "pomodoro") setTime(pomodoro);
    else if (newMode === "short-break") setTime(shortBreak);
    else if (newMode === "long-break") setTime(longBreak);
    // Note: pomodoroCount is NOT reset here, it tracks the cycle. It's reset when a long break finishes or potentially manually.
    // If a session was running, switching mode implies skipping/cancelling it. Consider calling skip API here? For simplicity, we don't for now.
    if (currentSessionId) {
        console.log(`Mode switched while session ${currentSessionId} was active. Consider skipping/cancelling.`);
        // To fully sync, you might call skipSessionApi here and handle its response.
        setCurrentSessionId(null); // Clear the potentially abandoned session ID
    }
  };

   // --- Update timer duration if settings change while paused ---
  useEffect(() => {
    if (isRunning) return; // Don't change duration while timer is running
    // Update time state based on current mode and potentially changed settings
    if (mode === "pomodoro") setTime(pomodoro);
    else if (mode === "short-break") setTime(shortBreak);
    else if (mode === "long-break") setTime(longBreak);
    // No change needed for isRunning or pomodoroCount here
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings?.workDuration, settings?.shortBreakDuration, settings?.longBreakDuration, mode]); // Rerun if settings durations or mode change

  // --- Handler for Start/Pause Button ---
  const handleStartPause = async () => {
    setApiError(null); // Clear previous errors
    if (isRunning) {
      // --- PAUSE ---
      setIsRunning(false); // Optimistic UI: stop timer immediately
      if (currentSessionId) {
        try {
          await pauseSessionApi(currentSessionId);
          console.log("Session paused successfully on backend.");
          // No need to change currentSessionId, it's just paused
        } catch (err: any) {
          console.error("Failed to pause session on backend:", err);
          setApiError(err.message || "Failed to sync pause with backend.");
          // Optional: Revert UI state if backend fails?
          // setIsRunning(true);
        }
      } else {
        // This case might happen if user starts, then quickly pauses before backend responds
        console.warn("Attempted to pause timer, but no active session ID was recorded yet.");
      }
    } else {
      // --- START / RESUME ---
      // For simplicity, we always start a NEW session on the backend when 'Start' is clicked.
      // Resuming a specific paused session would require more complex state management.
      try {
        // TODO: Get the selected task ID from TaskPanel (needs state lifting or context)
        const selectedTaskId: string | null = null; // Placeholder
        // Map frontend mode to backend 'type' string ("work", "short_break", "long_break")
        const sessionType = mode === 'pomodoro' ? 'work' : mode.replace('-', '_');

        const startedSession = await startSessionApi(selectedTaskId, sessionType);
        setCurrentSessionId(startedSession.id); // Store the ID of the new session

        // Reset timer to full duration for the current mode before starting locally
        if (mode === "pomodoro") setTime(pomodoro);
        else if (mode === "short-break") setTime(shortBreak);
        else if (mode === "long-break") setTime(longBreak);

        setIsRunning(true); // Start the local countdown AFTER backend confirms
      } catch (err: any) {
        console.error("Failed to start session on backend:", err);
        setApiError(err.message || "Failed to start session. Check connection and login.");
        setCurrentSessionId(null); // Ensure no lingering ID on failure
        setIsRunning(false); // Ensure timer doesn't start if backend fails
      }
    }
  };

  // --- Handler for Skip Button ---
  const handleSkip = async () => {
    setApiError(null); // Clear previous errors
    setIsRunning(false); // Stop current timer locally

    if (currentSessionId) {
      // If a session is active on the backend, skip it
      try {
        const skippedSession = await skipSessionApi(currentSessionId);
        console.log("Session skipped successfully on backend:", skippedSession);
        
        // Determine and switch to the next mode locally AFTER backend confirms skip
        if (skippedSession.type === "work") {
          const nextCount = pomodoroCount + 1; // Treat skip like completion for cycle count
          setPomodoroCount(nextCount);
          const giveLongBreak = nextCount % pomodorosBeforeLong === 0;
          switchMode(giveLongBreak ? "long-break" : "short-break");
        } else { // Skipped a break
          switchMode("pomodoro");
        }
        setCurrentSessionId(null); // Clear the skipped session ID

      } catch (err: any) {
        console.error("Failed to skip session on backend:", err);
        setApiError(err.message || "Failed to sync skip with backend.");
        // Fallback: Still switch mode locally even if backend fails?
        if (mode === "pomodoro") {
          const nextCount = pomodoroCount + 1;
          setPomodoroCount(nextCount);
          const giveLongBreak = nextCount % pomodorosBeforeLong === 0;
          switchMode(giveLongBreak ? "long-break" : "short-break");
        } else {
          switchMode("pomodoro");
        }
        setCurrentSessionId(null); // Clear ID
      }
    } else {
      // If no session was running, just switch to the next logical mode locally
      console.log("Skip clicked, but no active session ID. Switching mode locally.");
      if (mode === "pomodoro") {
          const nextCount = pomodoroCount + 1; // Increment count even on local skip?
          setPomodoroCount(nextCount);
          const giveLongBreak = nextCount % pomodorosBeforeLong === 0;
          switchMode(giveLongBreak ? "long-break" : "short-break");
      } else { // Currently on a break, skip to pomodoro
          switchMode("pomodoro");
      }
    }
  };

  // Show skeleton if auth state isn't checked yet
  if (!authChecked) return <TimerSkeleton />;

  // --- JSX (Added API error display and updated onClick handlers) ---
  const modes = [
    { value: "pomodoro", label: "Pomodoro" },
    { value: "short-break", label: "Short Break" },
    { value: "long-break", label: "Long Break" },
  ] as const;


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
                  onClick={() => switchMode(m.value)} // switchMode handles stopping timer etc.
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
            <div className="flex flex-col items-center"> {/* Wrap controls and error */}
              <div className="flex gap-4">
                <button
                  onClick={() => switchMode("pomodoro")} // Reset always goes to pomodoro mode
                  className="p-4 glass-panel rounded-full hover:bg-white/20 transition-all"
                  aria-label="Reset to Pomodoro"
                  title="Reset to Pomodoro"
                >
                  <RotateCcw className="w-6 h-6" />
                </button>
                <button
                  onClick={handleStartPause} // Use updated handler
                  className="px-8 py-4 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-all shadow-lg hover:shadow-xl flex items-center gap-2 font-semibold" // Added font-semibold
                  aria-label={isRunning ? "Pause" : "Start"}
                >
                  {isRunning ? (
                    <> <Pause className="w-6 h-6" /> Pause </>
                  ) : (
                    <> <Play className="w-6 h-6" /> Start </>
                  )}
                </button>
                <button
                  onClick={handleSkip} // Use updated handler
                  className="p-4 glass-panel rounded-full hover:bg-white/20 transition-all"
                  aria-label="Skip current session"
                  title="Skip current session"
                >
                  <SkipForward className="w-6 h-6" />
                </button>
              </div>
              {/* API Error Display */}
              {apiError && <p className="text-destructive text-sm mt-3 text-center">{apiError}</p>}
            </div>
          </div>

          {/* Task Panel */}
          {/* Consider passing selectedTaskId state down to TaskPanel if needed */}
          {/* Or lift state up / use context */}
          <TaskPanel />
        </div>
      </div>
    </div>
  );
};

export default Timer;