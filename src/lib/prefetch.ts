import { supabase } from "../supabaseClient";

// Lightweight prefetch helpers. These try to warm commonly-needed endpoints.
export async function prefetchDashboard() {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    if (!token) return null;

    // Try to fetch weekly analytics (server may be offline in dev)
    const res = await fetch('/api/Analytics/weekly', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const body = await res.json();
    return body;
  } catch (err) {
    // Fail silently — prefetch is best-effort
    return null;
  }
}

export async function prefetchSettings() {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    if (!token) return null;

    const res = await fetch('/api/UserSettings', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const body = await res.json();
    return body;
  } catch (err) {
    return null;
  }
}

export default { prefetchDashboard, prefetchSettings };
