import React from "react";
import { useAuth } from "../context/AuthContext";
import { prefetchDashboard, prefetchSettings } from "../lib/prefetch";

export const NavigationSkeleton: React.FC = () => {
  const { pendingPath, pendingClosing } = useAuth();
  const [started, setStarted] = React.useState(false);

  React.useEffect(() => {
    if (!pendingPath) return;
    if (started) return; // only run once per pendingPath set
    setStarted(true);

    (async () => {
      try {
        if (pendingPath.includes("/settings")) await prefetchSettings();
        else await prefetchDashboard();
      } catch (e) {
        // ignore
      }
    })();
  }, [pendingPath, started]);

  if (!pendingPath) return null;

  // Overlay container: semi-transparent backdrop that keeps the current page visible underneath
  return (
    <div
      className={
        "fixed inset-0 z-50 flex items-center justify-center bg-black/25 backdrop-blur-sm p-4 transition-opacity duration-300 " +
        (pendingClosing ? "opacity-0 pointer-events-none" : "opacity-100")
      }
    >
      <div className="max-w-3xl w-full rounded-xl bg-white/95 dark:bg-[#0b1220]/90 border border-border p-6 shadow-lg text-foreground">
        {/* Clear header so the overlay is always visible and doesn't look like an empty dark page */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Loading…</h3>
          <span className="text-sm text-muted-foreground">Preparing content</span>
        </div>
        {/* Render a simple skeleton based on the target path */}
        {pendingPath.includes("/settings") ? (
          <div>
            <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded mb-4 animate-pulse" />
            <div className="space-y-3">
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/4 animate-pulse" />
              <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            </div>
          </div>
        ) : (
          <div>
            <div className="h-8 w-56 bg-gray-200 dark:bg-gray-700 rounded mb-6 animate-pulse" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="h-36 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              <div className="h-36 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              <div className="h-36 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NavigationSkeleton;
