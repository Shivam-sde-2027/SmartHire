import { useState, useEffect } from "react";
import { Link, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import DashboardPage from "./pages/DashboardPage";
import JobsPage from "./pages/JobsPage";
import MentorPage from "./pages/MentorPage";
import SuggestionsPage from "./pages/SuggestionsPage";
import SettingsPage from "./pages/SettingsPage";

// Premium SVG Icon Components
const DashboardIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="9" rx="1"/>
    <rect x="14" y="3" width="7" height="5" rx="1"/>
    <rect x="14" y="12" width="7" height="9" rx="1"/>
    <rect x="3" y="16" width="7" height="5" rx="1"/>
  </svg>
);

const JobsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="14" x="2" y="7" rx="2" ry="2"/>
    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
  </svg>
);

const MentorIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
);

const SuggestionsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20h9"/>
    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>
  </svg>
);

const SettingsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>
);

const BrandLogo = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#6366f1" }}>
    <path d="M12 2L2 7l10 5 10-5-10-5Z"/>
    <path d="M2 17l10 5 10-5"/>
    <path d="M2 12l10 5 10-5"/>
  </svg>
);

const SignOutIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" x2="9" y1="12" y2="12"/>
  </svg>
);

function NavigationLayout({ children }: { children: React.ReactNode }) {
  const { session, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    const saved = localStorage.getItem("theme");
    return (saved === "light" || saved === "dark") ? saved : "dark";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    const handleThemeChange = () => {
      const saved = localStorage.getItem("theme");
      if (saved === "light" || saved === "dark") {
        setTheme(saved);
      }
    };
    window.addEventListener("theme-change", handleThemeChange);
    return () => window.removeEventListener("theme-change", handleThemeChange);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    window.dispatchEvent(new Event("theme-change"));
  };

  // Close profile dropdown when clicking outside
  useEffect(() => {
    if (!profileMenuOpen) return;

    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".user-profile-container")) {
        setProfileMenuOpen(false);
      }
    };

    document.addEventListener("click", handleOutsideClick);
    return () => document.removeEventListener("click", handleOutsideClick);
  }, [profileMenuOpen]);


  const navItems = [
    { label: "Dashboard", path: "/dashboard", icon: <DashboardIcon /> },
    { label: "Jobs Directory", path: "/jobs", icon: <JobsIcon /> },
    { label: "AI Career Mentor", path: "/mentor", icon: <MentorIcon /> },
    { label: "CV Suggestions", path: "/suggestions", icon: <SuggestionsIcon /> },
    { label: "Settings", path: "/settings", icon: <SettingsIcon /> },
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  // Derive user info dynamically from session email
  const userEmail = session?.user?.email || "shivam@example.com";
  const userName = userEmail === "dev@local" || userEmail === "shivam@gmail.com" || userEmail === "shivam@example.com" 
    ? "Shivam Petkar" 
    : userEmail.split("@")[0];
  const avatarLetter = userName.charAt(0).toUpperCase();

  return (
    <div className="app-container">
      {/* Mobile Topbar */}
      <header className="mobile-header">
        <div className="mobile-logo-area" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <BrandLogo />
          <span className="app-logo" style={{ fontWeight: 700, color: "var(--text-heading)" }}>SmartHire</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <button 
            type="button" 
            className="theme-toggle-btn" 
            onClick={toggleTheme}
            title="Toggle Theme"
          >
            {theme === "dark" ? "🌙" : "☀️"}
          </button>
          <button className="hamburger-btn" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            ☰
          </button>
        </div>
      </header>

      {/* Sidebar - Desktop & Mobile */}
      <aside className={`app-sidebar ${mobileMenuOpen ? "open" : ""}`}>
        <div className="sidebar-brand" style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.5rem" }}>
          <BrandLogo />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <h2 style={{ fontSize: "1.3rem", margin: 0, fontWeight: 700, letterSpacing: "-0.02em" }}>SmartHire</h2>
            <span className="badge" style={{ fontSize: "0.65rem", padding: "0.05rem 0.35rem", alignSelf: "flex-start", marginTop: "0.15rem" }}>GenAI</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-link ${location.pathname === item.path ? "active" : ""}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              <span className="nav-icon" style={{ display: "flex", alignItems: "center" }}>{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="sidebar-footer" style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "auto" }}>
          {/* Refined Theme Mode slider matching mockup */}
          <div className="theme-toggle-row">
            <span className="theme-toggle-label">Theme Mode</span>
            <div className="theme-slider-container">
              <span className={`theme-icon ${theme === 'dark' ? 'active' : ''}`}>🌙</span>
              <div className={`theme-track ${theme}`} onClick={toggleTheme}>
                <div className="theme-knob" />
              </div>
              <span className={`theme-icon ${theme === 'light' ? 'active' : ''}`}>☀️</span>
            </div>
          </div>

          {/* User profile card with dropdown */}
          <div className="user-profile-container" style={{ position: "relative" }}>
            {profileMenuOpen && (
              <div className="profile-menu-dropdown animate-fade">
                <Link 
                  to="/settings" 
                  className="profile-dropdown-item"
                  onClick={() => setProfileMenuOpen(false)}
                >
                  <SettingsIcon />
                  <span>Profile Settings</span>
                </Link>
                <button 
                  type="button" 
                  className="profile-dropdown-item"
                  onClick={() => {
                    setProfileMenuOpen(false);
                    handleSignOut();
                  }}
                  style={{ color: "#ef4444" }}
                >
                  <SignOutIcon />
                  <span>Sign Out</span>
                </button>
              </div>
            )}

            <div 
              className="user-profile-widget"
              onClick={() => setProfileMenuOpen(!profileMenuOpen)}
              style={{ margin: 0 }}
            >
              <div className="user-avatar">{avatarLetter}</div>
              <div className="user-info">
                <span className="user-name">{userName}</span>
                <span className="user-email">{userEmail}</span>
              </div>
              <div className="user-chevron" style={{ transform: profileMenuOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s", display: "flex", alignItems: "center" }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
              </div>
            </div>
          </div>

          {/* Sign Out link with SVG icon */}
          <button 
            className="secondary logout-btn full-width" 
            onClick={handleSignOut}
            style={{ 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "flex-start", 
              gap: "0.75rem", 
              padding: "0.6rem 0.8rem", 
              fontSize: "0.85rem",
              background: "none",
              border: "none",
              boxShadow: "none"
            }}
          >
            <SignOutIcon />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        {children}
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="mobile-bottom-nav">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`bottom-nav-link ${location.pathname === item.path ? "active" : ""}`}
          >
            <span className="bottom-nav-icon">{item.icon}</span>
            <span className="bottom-nav-label">{item.label.split(" ")[0]}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  if (loading) return <div className="page center">Loading...</div>;
  if (!session) return <Navigate to="/login" replace />;
  return <NavigationLayout>{children}</NavigationLayout>;
}

export default function App() {
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") || "dark";
    document.documentElement.setAttribute("data-theme", savedTheme);
  }, []);

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/jobs"
        element={
          <ProtectedRoute>
            <JobsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/mentor"
        element={
          <ProtectedRoute>
            <MentorPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/suggestions"
        element={
          <ProtectedRoute>
            <SuggestionsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <SettingsPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
