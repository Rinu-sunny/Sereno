import { BarChart3, Clock, CheckCircle, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import DashboardSkeleton from '@/components/skeletons/DashboardSkeleton';

const Dashboard = () => {
  const navigate = useNavigate();
  const { isAuthenticated, authChecked } = useAuth();
  const { pendingPath } = useAuth();
  const { session } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any | null>(null);
  const [timedOut, setTimedOut] = useState(false);

  // Auto-redirect unauthenticated users once authChecked
  useEffect(() => {
    if (!authChecked) return;
    if (isAuthenticated === false) {
      navigate("/auth", { replace: true });
    }
    console.debug('[Dashboard] authChecked=', authChecked, 'isAuthenticated=', isAuthenticated, 'pendingPath=', pendingPath);
  }, [isAuthenticated, authChecked, navigate]);

  // Data load effect — kept near the top so hooks order is stable across renders
  useEffect(() => {
    if (!authChecked) return;
    if (!isAuthenticated) return;

    let mounted = true;
    let timeoutHandle: NodeJS.Timeout | null = null;

    const load = async () => {
      setLoading(true);
      setTimedOut(false);
      setError(null);
      try {
        const token = session?.access_token;
        if (!token) throw new Error("No auth token");
        // prefer https backend but allow http fallback (dev cert)
        const httpsUrl = "https://localhost:5001/api/Analytics/weekly";
        const httpUrl = "http://localhost:5000/api/Analytics/weekly";
        let resp;
        try {
          resp = await axios.get(httpsUrl, { headers: { Authorization: `Bearer ${token}` } });
        } catch (err) {
          resp = await axios.get(httpUrl, { headers: { Authorization: `Bearer ${token}` } });
        }
        // artificial small delay so the skeleton is visible briefly and the UI feels smoother
        await new Promise((res) => setTimeout(res, 600));
        if (!mounted) return;
        setData(resp.data);
      } catch (err: any) {
        if (!mounted) return;
        setError(err?.message || "Failed to load analytics");
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    };

    // start a timeout — if loading takes too long, mark timedOut so we can show fallback UI
    timeoutHandle = setTimeout(() => {
      if (mounted && loading) setTimedOut(true);
    }, 4000);

    void load();

    return () => {
      mounted = false;
      if (timeoutHandle) clearTimeout(timeoutHandle);
    };
  }, [authChecked, isAuthenticated, session]);

  const retry = () => {
    setTimedOut(false);
    setError(null);
    setData(null);
    // trigger effect by re-running fetch inline
    (async () => {
      setLoading(true);
      try {
        const token = session?.access_token;
        if (!token) throw new Error('No auth token');
        const httpsUrl = 'https://localhost:5001/api/Analytics/weekly';
        const httpUrl = 'http://localhost:5000/api/Analytics/weekly';
        let resp;
        try {
          resp = await axios.get(httpsUrl, { headers: { Authorization: `Bearer ${token}` } });
        } catch (err) {
          resp = await axios.get(httpUrl, { headers: { Authorization: `Bearer ${token}` } });
        }
        await new Promise((res) => setTimeout(res, 600));
        setData(resp.data);
      } catch (err: any) {
        setError(err?.message || 'Failed to load analytics');
      } finally {
        setLoading(false);
      }
    })();
  };

  // If navigation is pending to this route, show the dashboard skeleton instead of returning null
  // This prevents a permanent blank screen if pendingPath remains set briefly.
  if (pendingPath && pendingPath.toString().startsWith("/dashboard")) return <DashboardSkeleton />;

  console.debug('[Dashboard] loading=', loading, 'data=', data, 'error=', error, 'timedOut=', timedOut);
  if (!authChecked || loading) return <DashboardSkeleton />;

  if (timedOut) {
    return (
      <div className="min-h-screen pt-24 pb-12 px-4">
        <div className="max-w-3xl mx-auto mt-12 p-8 glass-panel rounded-2xl text-center">
          <h2 className="text-2xl font-bold">Loading is taking longer than expected</h2>
          <p className="text-muted-foreground mt-2">We couldn't fetch your analytics right now. You can retry or continue with sample data.</p>
          <div className="mt-6 flex gap-4 justify-center">
            <button onClick={() => retry()} className="py-2 px-4 bg-primary text-primary-foreground rounded-lg">Retry</button>
            <button onClick={() => setTimedOut(false)} className="py-2 px-4 bg-white/10 rounded-lg">Use sample data</button>
          </div>
        </div>
      </div>
    );
  }

  // Mock data - replace with real data from backend later
  let stats = [
    {
      icon: Clock,
      label: "Total Focus Time",
      value: "—",
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

  let recentSessions: Array<{ date: string; sessions: number; duration: string }> = [];

  if (data) {
    // Map server data to UI-friendly shapes
    stats = [
      { icon: Clock, label: "Total Focus Time", value: `${Math.floor((data.totalFocus||0)/60)}h ${ (data.totalFocus||0) % 60 }m`, color: "text-primary", bgColor: "bg-primary/20" },
      { icon: CheckCircle, label: "Sessions Completed", value: `${data.totalSessions ?? 0}`, color: "text-accent", bgColor: "bg-accent/20" },
      { icon: TrendingUp, label: "Current Streak", value: `${data.streak ?? 0} days`, color: "text-secondary", bgColor: "bg-secondary/20" },
      { icon: BarChart3, label: "Tasks Completed", value: `${data.tasksCompleted ?? 0}`, color: "text-destructive", bgColor: "bg-destructive/20" },
    ];

    recentSessions = (data.perDay || []).map((d: any) => ({ date: new Date(d.date).toISOString().slice(0,10), sessions: d.totalSessions || 0, duration: `${Math.floor((d.totalFocusMinutes||0)/60)}h ${ (d.totalFocusMinutes||0) % 60 }m` }));
  }

  return (
    <div className="min-h-screen pt-24 pb-12 px-4">
      
      {/* If we haven't checked auth yet, avoid flashing content */}
      {!authChecked && (
        <div className="max-w-3xl mx-auto mt-12 p-8 glass-panel rounded-2xl text-center">
          <p className="text-muted-foreground">Checking authentication...</p>
        </div>
      )}

      {!authChecked ? null : isAuthenticated === false ? (
        <div className="max-w-3xl mx-auto mt-12 p-8 glass-panel rounded-2xl text-center">
          <h2 className="text-2xl font-bold text-foreground">Not signed in</h2>
          <p className="text-muted-foreground mt-2">Please sign in to view your dashboard and personalized data.</p>
          <div className="mt-6 flex justify-center">
            <button
              onClick={() => navigate('/auth')}
              className="py-3 px-6 bg-primary text-primary-foreground rounded-lg font-semibold"
            >
              Go to Login
            </button>
          </div>
        </div>
      ) : (
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
      )}
    </div>
  );
};

export default Dashboard;
