// src/components/Navbar.tsx
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import ProtectedLink from "@/components/ProtectedLink";
import { Menu, X, Timer, Home, LayoutDashboard, Settings, LogIn, User } from "lucide-react";
import DarkModeToggle from "./DarkModeToggle"; // Import the dark mode toggle
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/supabaseClient";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  const { session, isAuthenticated, displayName } = useAuth();
  const [isUserOpen, setIsUserOpen] = useState(false);

  const navItems = [
    { path: "/", label: "Home", icon: Home },
    { path: "/timer", label: "Timer", icon: Timer },
    { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { path: "/settings", label: "Settings", icon: Settings },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-panel">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 text-2xl font-bold text-gradient">
            <Timer className="w-8 h-8 text-primary" />
            Sereno
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-4">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <ProtectedLink
                  key={item.path}
                  to={item.path}
                  protected={item.path === "/dashboard" || item.path === "/settings"}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 ${
                    isActive(item.path)
                      ? "bg-primary text-primary-foreground shadow-lg"
                      : "text-foreground hover:bg-white/10 dark:hover:bg-white/10"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </ProtectedLink>
              );
            })}
            {/* Dark Mode Toggle Button */}
            <DarkModeToggle />

            {/* Auth area */}
            {isAuthenticated ? (
              <div className="relative">
                <button
                  className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-white/10"
                  onClick={() => setIsUserOpen((s) => !s)}
                >
                  <User className="w-4 h-4" />
                  <span className="truncate max-w-xs">{displayName ?? 'You'}</span>
                </button>
                {isUserOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-popover rounded-lg p-2 shadow-lg z-50">
                    <button
                      className="w-full text-left px-3 py-2 rounded hover:bg-muted"
                      onClick={async () => {
                        await supabase.auth.signOut();
                        // reload will let AuthContext pick up change and route appropriately
                        window.location.reload();
                      }}
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <ProtectedLink to="/auth" className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 ${
                isActive('/auth') ? 'bg-primary text-primary-foreground shadow-lg' : 'text-foreground hover:bg-white/10'
              }`}>
                <LogIn className="w-4 h-4" />
                Login
              </ProtectedLink>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 rounded-lg btn-glass"
            aria-label="Toggle menu"
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden py-4 space-y-2 flex flex-col">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-2 px-4 py-3 rounded-lg transition-all duration-300 ${
                    isActive(item.path)
                      ? "bg-primary text-primary-foreground shadow-lg"
                      : "text-foreground hover:bg-white/10 dark:hover:bg-white/10"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {item.label}
                </Link>
              );
            })}
            {/* Dark Mode Toggle in Mobile Menu */}
            <div className="px-4 py-3">
              <DarkModeToggle />
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
