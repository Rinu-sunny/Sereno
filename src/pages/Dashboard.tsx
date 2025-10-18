import { BarChart3, Clock, CheckCircle, TrendingUp } from "lucide-react";

const Dashboard = () => {
  // Mock data - replace with real data from backend later
  const stats = [
    {
      icon: Clock,
      label: "Total Focus Time",
      value: "12h 30m",
      color: "text-primary",
      bgColor: "bg-primary/20",
    },
    {
      icon: CheckCircle,
      label: "Sessions Completed",
      value: "48",
      color: "text-accent",
      bgColor: "bg-accent/20",
    },
    {
      icon: TrendingUp,
      label: "Current Streak",
      value: "7 days",
      color: "text-secondary",
      bgColor: "bg-secondary/20",
    },
    {
      icon: BarChart3,
      label: "Tasks Completed",
      value: "124",
      color: "text-destructive",
      bgColor: "bg-destructive/20",
    },
  ];

  const recentSessions = [
    { date: "2025-01-15", sessions: 6, duration: "2h 30m" },
    { date: "2025-01-14", sessions: 8, duration: "3h 20m" },
    { date: "2025-01-13", sessions: 5, duration: "2h 5m" },
    { date: "2025-01-12", sessions: 7, duration: "2h 55m" },
  ];

  return (
    <div className="min-h-screen pt-24 pb-12 px-4">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Track your productivity and progress</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div
                key={index}
                className="glass-panel rounded-2xl p-6 space-y-4 hover:scale-105 transition-all"
              >
                <div className={`w-12 h-12 ${stat.bgColor} rounded-full flex items-center justify-center`}>
                  <Icon className={`w-6 h-6 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-3xl font-bold text-foreground">{stat.value}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Recent Sessions */}
        <div className="glass-panel rounded-2xl p-6 space-y-4">
          <h2 className="text-2xl font-bold text-foreground">Recent Sessions</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 px-4 text-muted-foreground font-semibold">Date</th>
                  <th className="text-left py-3 px-4 text-muted-foreground font-semibold">Sessions</th>
                  <th className="text-left py-3 px-4 text-muted-foreground font-semibold">Duration</th>
                </tr>
              </thead>
              <tbody>
                {recentSessions.map((session, index) => (
                  <tr key={index} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="py-3 px-4 text-foreground">{session.date}</td>
                    <td className="py-3 px-4 text-foreground">{session.sessions}</td>
                    <td className="py-3 px-4 text-foreground">{session.duration}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Chart Placeholder */}
        <div className="glass-panel rounded-2xl p-6 space-y-4">
          <h2 className="text-2xl font-bold text-foreground">Weekly Progress</h2>
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            <div className="text-center space-y-2">
              <BarChart3 className="w-16 h-16 mx-auto opacity-50" />
              <p>Chart will be displayed here</p>
              <p className="text-sm">Connect to backend to see your progress visualization</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
