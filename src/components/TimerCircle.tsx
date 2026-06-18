interface TimerCircleProps {
  time: number;
  totalTime: number;
  mode: "pomodoro" | "short-break" | "long-break";
}

const TimerCircle = ({ time, totalTime, mode }: TimerCircleProps) => {
  const circumference = 2 * Math.PI * 120;
  const offset = circumference - (time / totalTime) * circumference;
  const minutes = String(Math.floor(time / 60)).padStart(2, "0");
  const seconds = String(time % 60).padStart(2, "0");

  const modeColors = {
    pomodoro: "hsl(var(--pomodoro))",
    "short-break": "hsl(var(--short-break))",
    "long-break": "hsl(var(--long-break))",
  };

  const color = modeColors[mode];

  return (
    <div className="relative flex items-center justify-center w-64 h-64 sm:w-80 sm:h-80">
      <svg
        className="transform -rotate-90 w-full h-full"
        viewBox="0 0 280 280"
      >
        <circle
          cx="140"
          cy="140"
          r="120"
          stroke="hsl(var(--muted))"
          strokeWidth="12"
          fill="transparent"
          opacity="0.2"
        />
        <circle
          cx="140"
          cy="140"
          r="120"
          stroke={color}
          strokeWidth="12"
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-linear"
          style={{ filter: `drop-shadow(0 0 10px ${color})` }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-5xl sm:text-6xl font-bold text-foreground tabular-nums">
          {minutes}:{seconds}
        </span>
      </div>
    </div>
  );
};

export default TimerCircle;
