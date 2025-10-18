import { useState, useEffect } from "react";
import { Play, Pause, RotateCcw, SkipForward } from "lucide-react";
import TimerCircle from "@/components/TimerCircle";
import TaskPanel from "@/components/TaskPanel";

const Timer = () => {
  const pomodoro = 25 * 60;
  const shortBreak = 5 * 60;
  const longBreak = 15 * 60;

  const [time, setTime] = useState(pomodoro);
  const [isRunning, setIsRunning] = useState(false);
  const [mode, setMode] = useState<"pomodoro" | "short-break" | "long-break">("pomodoro");

  const totalTime =
    mode === "pomodoro" ? pomodoro : mode === "short-break" ? shortBreak : longBreak;

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (isRunning && time > 0) {
      timer = setInterval(() => setTime((t) => t - 1), 1000);
    } else if (time === 0) {
      setIsRunning(false);
      // Play sound or notification here
      alert("Time's up!");
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isRunning, time]);

  const switchMode = (newMode: "pomodoro" | "short-break" | "long-break") => {
    setMode(newMode);
    if (newMode === "pomodoro") setTime(pomodoro);
    if (newMode === "short-break") setTime(shortBreak);
    if (newMode === "long-break") setTime(longBreak);
    setIsRunning(false);
  };

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
                onClick={() => setIsRunning(!isRunning)}
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
