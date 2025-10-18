import { Link } from "react-router-dom";
import { Timer, CheckCircle, TrendingUp, Zap } from "lucide-react";

const Home = () => {
  const features = [
    {
      icon: Timer,
      title: "Pomodoro Timer",
      description: "Focus for 25 minutes, then take a 5-minute break",
    },
    {
      icon: CheckCircle,
      title: "Task Management",
      description: "Organize your work and track completion",
    },
    {
      icon: TrendingUp,
      title: "Progress Tracking",
      description: "Monitor your productivity over time",
    },
    {
      icon: Zap,
      title: "Stay Focused",
      description: "Eliminate distractions and boost productivity",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-secondary/20 to-accent/20 -z-10" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,hsl(var(--primary)/0.1),transparent_50%)] -z-10" />

      <div className="max-w-4xl mx-auto text-center space-y-12 py-20">
        {/* Hero Section */}
        <div className="space-y-6 animate-fade-in">
          <h1 className="text-6xl sm:text-7xl md:text-8xl font-bold text-gradient">
            Sereno
          </h1>
          <p className="text-xl sm:text-2xl text-foreground/80 max-w-2xl mx-auto">
            Master your time with the Pomodoro Technique. Stay focused, productive, and achieve your goals.
          </p>
          <Link
            to="/timer"
            className="inline-block px-8 py-4 bg-primary text-primary-foreground rounded-full text-lg font-semibold hover:bg-primary/90 transition-all hover:scale-105 shadow-lg hover:shadow-xl"
          >
            Start Your Session
          </Link>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-12">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className="glass-panel rounded-2xl p-6 space-y-3 hover:scale-105 transition-all duration-300"
              >
                <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mx-auto">
                  <Icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-foreground">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            );
          })}
        </div>

        {/* CTA Section */}
        <div className="glass-panel rounded-2xl p-8 space-y-4">
          <h2 className="text-3xl font-bold text-foreground">
            What is the Pomodoro Technique?
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Developed by Francesco Cirillo, this time management method uses a timer to break work into intervals, traditionally 25 minutes in length, separated by short breaks. This approach helps maintain high levels of focus and prevents burnout.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Home;
