import { useState } from "react";
import { Mail, Lock, User, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from '../supabaseClient'; // Import Supabase client
import axios from 'axios';                  // Import Axios for API calls

// --- Function to fetch data from your backend ---
async function fetchDataFromBackend(token: string) {
  try {
    const backendUrl = 'https://localhost:5001/api/tasks'; // Your backend API endpoint

    console.log('Attempting to fetch data from backend...'); 

    const response = await axios.get(backendUrl, {
      headers: { 
        'Authorization': `Bearer ${token}` // Attach the JWT token
      }
    });

    console.log('Data from backend:', response.data); 
    alert('Successfully fetched data from backend!'); // Simple success alert

  } catch (error: any) {
    console.error('Error fetching data from backend:', error);
    // Handle different types of errors (Network, HTTP status codes, etc.)
    if (axios.isAxiosError(error)) {
       if (error.message.includes('Network Error')) {
           alert('Network Error: Could not connect to backend. Is it running? Is CORS configured correctly in Program.cs?');
       } else if (error.response) {
           alert(`Error fetching data: ${error.response.status} - ${error.message}`);
       } else {
           alert(`Axios error: ${error.message}`);
       }
    } else {
       alert('An unknown error occurred while fetching data.');
    }
  }
}

// --- Your Auth Component ---
const Auth = () => {
  const { toast } = useToast();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState(""); // Used only for sign up

  // --- Handles both Login and Sign Up ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      let sessionData;
      let authError;

      if (isLogin) {
        // --- Login Logic ---
        console.log("Attempting login...");
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email,
          password: password,
        });
        sessionData = data;
        authError = error;
        
      } else {
        // --- Sign Up Logic ---
        console.log("Attempting sign up...");
        const { data, error } = await supabase.auth.signUp({
          email: email,
          password: password,
          options: {
            // Include user's name if signing up
            data: { 
              full_name: name 
            }
          }
        });
         sessionData = data;
         authError = error;
         // Note: Supabase might require email confirmation by default.
      }

      // --- Handle Login/Sign Up Errors ---
      if (authError) {
        console.error(isLogin ? 'Login failed:' : 'Sign up failed:', authError.message);
        toast({
          title: isLogin ? "Login Failed" : "Sign Up Failed",
          description: authError.message,
          variant: "destructive",
        });
        return; // Stop execution if there's an error
      }

      // --- Get the JWT Token ---
      const jwtToken = sessionData?.session?.access_token;

      // Check if token exists (might not immediately after sign up if email confirmation is needed)
      if (!jwtToken) {
         console.error('Auth successful but no session/token found. Email confirmation might be needed.');
          toast({
            title: isLogin ? "Login Issue" : "Sign Up Pending",
            description: isLogin ? "Could not retrieve session token." : "Account created. Please check your email for confirmation (if enabled).",
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

      // --- Call Your Backend API ---
      await fetchDataFromBackend(jwtToken); 

    } catch (err: any) {
      // Handle unexpected errors during the process
      console.error('Unexpected auth error:', err);
      toast({
        title: "Error",
        description: err.message || "An unexpected error occurred during authentication.",
        variant: "destructive",
      });
    }
  };

  // --- The JSX for your form (unchanged from your original code) ---
  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-secondary/20 to-accent/20 -z-10" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,hsl(var(--primary)/0.1),transparent_50%)] -z-10" />

      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-gradient">
            {isLogin ? "Welcome Back" : "Get Started"}
          </h1>
          <p className="text-muted-foreground">
            {isLogin
              ? "Sign in to continue your productivity journey"
              : "Create an account to track your progress"}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="glass-panel rounded-2xl p-8 space-y-6">
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
              required
            />
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
              required
            />
          </div>

          {isLogin && (
            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-foreground cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded border-white/20" />
                Remember me
              </label>
              <button type="button" className="text-primary hover:underline">
                Forgot password?
              </button>
            </div>
          )}

          <button
            type="submit"
            className="w-full py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 font-semibold"
          >
            {isLogin ? "Sign In" : "Create Account"}
            <ArrowRight className="w-5 h-5" />
          </button>

          <div className="text-center">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <span className="text-primary font-semibold">
                {isLogin ? "Sign Up" : "Sign In"}
              </span>
            </button>
          </div>
        </form>

        {/* Social Login (unchanged) */}
        <div className="glass-panel rounded-2xl p-6 space-y-4">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/20"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-background text-muted-foreground">Or continue with</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button className="py-3 glass-panel rounded-lg hover:bg-white/20 transition-all flex items-center justify-center gap-2">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Google
            </button>
            <button className="py-3 glass-panel rounded-lg hover:bg-white/20 transition-all flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              GitHub
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;