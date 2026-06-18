import React from "react";
import { supabase } from "../supabaseClient";

import type { Session } from "@supabase/supabase-js";

type AuthContextValue = {
  session: Session | null;
  isAuthenticated: boolean | null;
  authChecked: boolean;
  pendingPath: string | null;
  setPendingPath: (p: string | null) => void;
  pendingClosing: boolean;
  setPendingClosing: (v: boolean) => void;
  displayName?: string | null;
};

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [session, setSession] = React.useState<Session | null>(null);
  const [isAuthenticated, setIsAuthenticated] = React.useState<boolean | null>(null);
  const [authChecked, setAuthChecked] = React.useState(false);
  const [pendingPath, setPendingPath] = React.useState<string | null>(null);
  const [pendingClosing, setPendingClosing] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        const { data } = await supabase.auth.getSession();
        if (!mounted) return;
        setSession(data.session ?? null);
        setIsAuthenticated(!!data.session);
      } catch (err) {
        if (!mounted) return;
        setSession(null);
        setIsAuthenticated(false);
      } finally {
        if (mounted) setAuthChecked(true);
      }
    }

    init();

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session ?? null);
      setIsAuthenticated(!!session?.access_token);
    });
    const subscription = data?.subscription;

    return () => {
      mounted = false;
      if (subscription && typeof subscription.unsubscribe === "function") subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        session,
        isAuthenticated,
        authChecked,
        pendingPath,
        setPendingPath,
        pendingClosing,
        setPendingClosing,
        displayName: session?.user?.user_metadata?.full_name ?? session?.user?.email ?? null,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export default AuthContext;
