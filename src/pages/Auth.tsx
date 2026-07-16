import { useState, useEffect } from "react";
import { Mail, Lock, User, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from '../supabaseClient'; // Import Supabase client
import axios from 'axios';                  // Import Axios for API calls
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import AuthSkeleton from '@/components/skeletons/AuthSkeleton';

// --- Function to fetch data from your backend ---
async function fetchDataFromBackend(token: string) {
  try {
    const httpsUrl = 'https://sereno-u1sb.onrender.com/api/tasks';
    const httpUrl = 'https://sereno-u1sb.onrender.com/api/tasks';

    console.log('Attempting to fetch data from backend (HTTPS first)...');

    let response;

    try {
      response = await axios.get(httpsUrl, { headers: { Authorization: `Bearer ${token}` } });
    } catch (err) {
      // If HTTPS fails due to network/ssl, try HTTP fallback (useful during local dev when dev cert isn't trusted)
      console.warn('HTTPS fetch failed, trying HTTP fallback', err);
      response = await axios.get(httpUrl, { headers: { Authorization: `Bearer ${token}` } });
    }

  console.log('Data from backend:', response.data);
  return response.data;

  } catch (error: unknown) {
    console.error('Error fetching data from backend:', error);
    // Re-throw so callers can handle quietly if they want
    throw error;
  }
}

// --- Your Auth Component ---
const Auth = () => {
  const { toast } = useToast();
  const location = useLocation();
  const mode = new URLSearchParams(location.search).get('mode');
  const isSignupMode = mode === 'signup';
  const isSigninMode = mode === 'signin';
  const [isLogin, setIsLogin] = useState(!isSignupMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState(""); // Used only for sign up
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState<string | null>(null);
  const [isResetPassword, setIsResetPassword] = useState(false);
  const navigate = useNavigate();
  const {
    authChecked,
    isAuthenticated,
    pendingPath,
    setPendingPath,
    setPendingClosing,
  } = useAuth();

  const redirectTarget =
    (typeof location.state === 'object' && location.state && 'from' in location.state
      ? (location.state as { from?: string }).from
      : null) ??
    pendingPath ??
    '/dashboard';

  useEffect(() => {
    if (isSignupMode) setIsLogin(false);
    if (isSigninMode) setIsLogin(true);
  }, [isSignupMode, isSigninMode]);

  // Detect password reset flow from URL hash
  useEffect(() => {
    const hashParams = new URLSearchParams(location.hash.substring(1));
    const typeParam = hashParams.get('type');
    if (typeParam === 'recovery') {
      setIsResetPassword(true);
    }
  }, [location.hash]);

  const authMessage = (rawMessage: string, isSignIn: boolean) => {
    const message = rawMessage.toLowerCase();

    if (message.includes("email_address_invalid") || message.includes("email address") && message.includes("invalid")) {
      return "Use a real email address you can receive mail on. Temporary/example domains are rejected.";
    }
    if (message.includes("already registered") || message.includes("user already registered")) {
      return "This email is already registered. Try Sign In instead.";
    }
    if (message.includes("password") && message.includes("least")) {
      return "Password is too weak. Use at least 8 characters with letters and numbers.";
    }
    if (message.includes("rate limit") || message.includes("over_email_send_rate_limit")) {
      return "Too many email requests were sent recently. Wait a few minutes, then try again.";
    }
    if (isSignIn && (message.includes("email not confirmed") || message.includes("confirm"))) {
      return "Please verify your email first, then sign in.";
    }

    return rawMessage;
  };

  const isUnverifiedEmailMessage = (rawMessage: string) => {
    const msg = rawMessage.toLowerCase();
    return msg.includes('email not confirmed') || msg.includes('confirm');
  };

  // If user is already authenticated, redirect unless this is an explicit auth-mode/recovery link.
  useEffect(() => {
    if (!authChecked || !isAuthenticated) return;

    const params = new URLSearchParams(location.search);
    const hasExplicitMode = params.get('mode') === 'signup' || params.get('mode') === 'signin';
    const isRecoveryFlow = params.get('type') === 'recovery' || location.hash.includes('type=recovery');
    const isAuthRoute = location.pathname === '/auth';

    if (isAuthRoute && (hasExplicitMode || isRecoveryFlow)) return;

    setPendingClosing(false);
    setPendingPath(null);
    navigate(redirectTarget, { replace: true });
  }, [authChecked, isAuthenticated, navigate, redirectTarget, setPendingClosing, setPendingPath, location.pathname, location.search, location.hash]);

  // --- Handles both Login and Sign Up ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      toast({
        title: 'Missing email',
        description: 'Enter your email address first.',
        variant: 'destructive',
      });
      return;
    }

    setEmail(normalizedEmail);
    setIsSubmitting(true);
    
    try {
      let sessionData;
      let authError;

      if (isLogin) {
        // --- Login Logic ---
        console.log("Attempting login...");
        const { data, error } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password: password,
        });
        sessionData = data;
        authError = error;
        
      } else {
        // --- Sign Up Logic ---
        console.log("Attempting sign up...");
        const { data, error } = await supabase.auth.signUp({
          email: normalizedEmail,
          password: password,
          options: {
            // Include user's name if signing up
            data: { 
              full_name: name 
            },
            emailRedirectTo: `"https://sereno-git-main-myhobby4.vercel.app"/auth`, // Redirect back to auth page after email confirmation
          }
        });
         sessionData = data;
         authError = error;
         // Note: Supabase might require email confirmation by default.
      }

      // --- Handle Login/Sign Up Errors ---
      if (authError) {
        if (isLogin && isUnverifiedEmailMessage(authError.message)) {
          setPendingVerificationEmail(normalizedEmail);
        }
        console.error(isLogin ? 'Login failed:' : 'Sign up failed:', authError.message);
        toast({
          title: isLogin ? "Login Failed" : "Sign Up Failed",
          description: authMessage(authError.message, isLogin),
          variant: "destructive",
        });
        return; // Stop execution if there's an error
      }

      if (!isLogin) {
        const identitiesCount = sessionData?.user?.identities?.length ?? 0;
        if (identitiesCount === 0) {
          setIsLogin(true);
          setPassword("");
          toast({
            title: "Account already exists",
            description: "This email is already registered. Please sign in, or use password reset if needed.",
          });
          return;
        }
      }

      // --- Get the JWT Token ---
      const jwtToken = sessionData?.session?.access_token;

      // Check if token exists (might not immediately after sign up if email confirmation is needed)
      if (!jwtToken) {
         console.error('Auth successful but no session/token found. Email confirmation might be needed.');
          if (!isLogin) {
            setPendingVerificationEmail(normalizedEmail);
            setIsLogin(true);
            setPassword("");
          }
          toast({
            title: isLogin ? "Login Issue" : "Sign Up Pending",
            description: isLogin
              ? "Could not retrieve session token. Please try signing in again."
              : "Account created. Check inbox/spam for the verification email, then sign in.",
          });
         // Don't call backend if no token
         return; 
      }

      // --- Authentication Success ---
      console.log(isLogin ? 'Login successful!' : 'Sign up successful!', 'Token:', jwtToken);
      toast({
        title: isLogin ? "Login Successful" : "Account Created",
        description: isLogin ? "Welcome back!" : "Account created successfully.",
      });
      setPendingVerificationEmail(null);

      // --- Call Your Backend API ---
      // attempt to call backend but don't show popups — failures are logged
      try {
        void fetchDataFromBackend(jwtToken);
      } catch (e) {
        console.warn('Backend prefetch failed (silent):', e);
      }

      // navigate to dashboard after successful auth
      setPendingClosing(false);
      setPendingPath(null);
      navigate(redirectTarget, { replace: true });

    } catch (err: unknown) {
      console.error('Unexpected auth error:', err);
      let message = 'An unexpected error occurred during authentication.';
      if (err instanceof Error) message = err.message;
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resendVerification = async () => {
    const targetEmail = (pendingVerificationEmail ?? email).trim().toLowerCase();
    if (!targetEmail) {
      toast({
        title: "No email found",
        description: "Enter your email first, then try again.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: targetEmail,
        options: {
          emailRedirectTo: `"https://sereno-git-main-myhobby4.vercel.app"/auth`,
        },
      });
      if (error) throw error;
      toast({
        title: "Verification email sent",
        description: `A new verification link was sent to ${targetEmail}.`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to resend verification email.';
      toast({
        title: "Resend failed",
        description: authMessage(msg, true),
        variant: "destructive",
      });
    }
  };

  const handleForgotPassword = async () => {
    const targetEmail = email.trim().toLowerCase();
    if (!targetEmail) {
      toast({
        title: 'Enter your email first',
        description: 'Provide your account email, then click Forgot password again.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(targetEmail, {
        redirectTo: `${window.location.origin}/auth?mode=signin`,
      });
      if (error) throw error;
      toast({
        title: 'Password reset email sent',
        description: `Check inbox/spam for ${targetEmail}.`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send password reset email.';
      toast({
        title: 'Could not send reset email',
        description: authMessage(msg, true),
        variant: 'destructive',
      });
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!newPassword) {
      toast({
        title: 'Enter a new password',
        description: 'Password is required.',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: 'Passwords do not match',
        description: 'Make sure your new password and confirmation match.',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword.length < 8) {
      toast({
        title: 'Password too short',
        description: 'Password must be at least 8 characters.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      toast({
        title: 'Password reset successful',
        description: 'Your password has been updated. Signing you in...',
      });

      setNewPassword("");
      setConfirmPassword("");
      setIsResetPassword(false);
      setIsLogin(true);

      // Navigate to dashboard after successful reset
      setPendingClosing(false);
      setPendingPath(null);
      navigate('/dashboard', { replace: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to reset password.';
      toast({
        title: 'Password reset failed',
        description: authMessage(msg, true),
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- The JSX for your form (unchanged from your original code) ---
  if (!authChecked) return <AuthSkeleton />;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-secondary/20 to-accent/20 -z-10" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,hsl(var(--primary)/0.1),transparent_50%)] -z-10" />

      <div className="w-full max-w-md space-y-4">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-gradient">
            {isResetPassword
              ? "Reset Password"
              : isLogin
              ? "Welcome Back"
              : "Get Started"}
          </h1>
          <p className="text-muted-foreground">
            {isResetPassword
              ? "Enter your new password"
              : isLogin
              ? "Sign in to continue your productivity journey"
              : "Create an account to track your progress"}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={isResetPassword ? handleResetPassword : handleSubmit} className="glass-panel rounded-2xl p-8 space-y-6">
          {pendingVerificationEmail && (
            <div className="rounded-lg border border-primary/40 bg-primary/10 p-4 text-sm text-foreground">
              <p className="font-semibold">Verify your email to continue</p>
              <p className="mt-1 text-muted-foreground">
                We sent a verification link to {pendingVerificationEmail}. After clicking it, come back and sign in.
              </p>
              <button
                type="button"
                onClick={resendVerification}
                className="mt-3 text-primary hover:underline"
              >
                Resend verification email
              </button>
            </div>
          )}

          {isResetPassword ? (
            // Password Reset Form
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  disabled={isSubmitting}
                  required
                />
                <p className="text-xs text-muted-foreground">At least 8 characters required</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  disabled={isSubmitting}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 font-semibold"
              >
                {isSubmitting ? "Please wait..." : "Reset Password"}
                <ArrowRight className="w-5 h-5" />
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setIsResetPassword(false);
                    setIsLogin(true);
                    setNewPassword("");
                    setConfirmPassword("");
                  }}
                  disabled={isSubmitting}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Back to <span className="text-primary font-semibold">Sign In</span>
                </button>
              </div>
            </>
          ) : (
            // Login/Signup Form
            <>

          {!isLogin && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground flex items-center gap-2">
                <User className="w-4 h-4" />
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                disabled={isSubmitting}
                required={!isLogin}
              />
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={isSubmitting}
              required
            />
            {!isLogin && (
              <p className="text-xs text-muted-foreground">Use an email address you can access to verify your account.</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground flex items-center gap-2">
              <Lock className="w-4 h-4" />
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={isSubmitting}
              required
            />
          </div>

          {isLogin && (
            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-foreground cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded border-white/20" />
                Remember me
              </label>
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-primary hover:underline"
              >
                Forgot password?
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 font-semibold"
          >
            {isSubmitting ? "Please wait..." : isLogin ? "Sign In" : "Create Account"}
            <ArrowRight className="w-5 h-5" />
          </button>

          <div className="text-center">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              disabled={isSubmitting}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <span className="text-primary font-semibold">
                {isLogin ? "Sign Up" : "Sign In"}
              </span>
            </button>
          </div>
            </>
          )}
        </form>

        
      </div>
    </div>
  );
};

export default Auth;