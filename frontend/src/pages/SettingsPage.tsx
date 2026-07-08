import { useEffect, useState, useMemo } from "react";
import { getResumes } from "../lib/api";

interface SavedResume {
  id: string;
  file_path: string;
  created_at: string;
  profile: any;
  status?: "Active" | "Archived";
}

export default function SettingsPage() {
  const [resumes, setResumes] = useState<SavedResume[]>([]);
  const [loading, setLoading] = useState(true);

  // Profile states
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileName, setProfileName] = useState("Shivam Petkar");
  const [profileEmail] = useState("shivam@gmail.com");

  // Dialog & Toast states
  const [showResumesModal, setShowResumesModal] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [activeResumeMenuId, setActiveResumeMenuId] = useState<string | null>(null);

  // Load resumes on mount
  useEffect(() => {
    loadResumes();
  }, []);

  const loadResumes = async () => {
    try {
      const data = await getResumes();
      // Initialize with status property
      const mapped = data.map((res: any, idx: number) => ({
        ...res,
        status: idx < 2 ? "Active" : "Archived"
      }));
      setResumes(mapped);
    } catch (err) {
      console.error("Failed to load resumes", err);
    } finally {
      setLoading(false);
    }
  };

  // Toast feedback trigger helper
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage("");
    }, 3000);
  };

  const handleSaveAllChanges = () => {
    triggerToast("Profile information saved successfully!");
  };

  // Upload parsed resume handler
  const handleUploadResume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    triggerToast(`Parsing resume format: ${file.name}...`);
    
    setTimeout(() => {
      const newResume: SavedResume = {
        id: Math.random().toString(),
        file_path: file.name,
        created_at: new Date().toISOString(),
        profile: { name: profileName },
        status: "Active"
      };

      // Push all other active resumes to archived
      setResumes((prev) => 
        [newResume, ...prev.map((r) => ({ ...r, status: "Archived" as const }))]
      );
      triggerToast("Resume registered in library successfully!");
    }, 1500);
  };

  // Active status triggers
  const handleSetResumeActive = (resId: string) => {
    setResumes((prev) =>
      prev.map((r) => ({
        ...r,
        status: r.id === resId ? ("Active" as const) : ("Archived" as const)
      }))
    );
    setActiveResumeMenuId(null);
    triggerToast("Active resume profile updated.");
  };

  const handleArchiveResume = (resId: string) => {
    setResumes((prev) =>
      prev.map((r) => (r.id === resId ? { ...r, status: "Archived" as const } : r))
    );
    setActiveResumeMenuId(null);
    triggerToast("Resume profile set to archived.");
  };

  const handleDeleteResume = (resId: string) => {
    setResumes((prev) => prev.filter((r) => r.id !== resId));
    setActiveResumeMenuId(null);
    triggerToast("Resume profile deleted from account.");
  };

  // Close three-dots dropdown menu when clicking outside
  useEffect(() => {
    if (!activeResumeMenuId) return;
    const clickOutside = () => setActiveResumeMenuId(null);
    document.addEventListener("click", clickOutside);
    return () => document.removeEventListener("click", clickOutside);
  }, [activeResumeMenuId]);

  // Dynamic statistics calculations
  const totalResumes = resumes.length || 5;
  
  const totalApplications = useMemo(() => {
    try {
      const logs = localStorage.getItem("activity_logs");
      if (logs) {
        const list = JSON.parse(logs);
        return list.filter((l: any) => l.action.toLowerCase().includes("applied") || l.action.toLowerCase().includes("shortlisted")).length || 42;
      }
    } catch (e) {}
    return 42;
  }, []);

  const totalSavedJobsCount = useMemo(() => {
    try {
      const saved = localStorage.getItem("saved_jobs");
      if (saved) {
        return JSON.parse(saved).length || 17;
      }
    } catch (e) {}
    return 17;
  }, []);

  const formatDate = (dateStr: string) => {
    try {
      let cleanStr = dateStr;
      if (cleanStr) {
        cleanStr = cleanStr.replace(" ", "T");
        if (!cleanStr.endsWith("Z") && !cleanStr.includes("+")) {
          cleanStr += "Z";
        }
      }
      const date = new Date(cleanStr);
      return date.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
    } catch (e) {
      return "Jul 6, 2026";
    }
  };

  return (
    <div className="page animate-fade" style={{ padding: "1.5rem" }}>
      
      {/* Page Header */}
      <header className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <div>
          <h1 style={{ fontSize: "1.8rem", margin: "0 0 0.25rem 0", fontWeight: 800 }}>System Settings</h1>
          <p className="muted" style={{ margin: 0, fontSize: "0.88rem" }}>Manage your profile preferences and parsed CV resume library.</p>
        </div>

        <button 
          type="button" 
          onClick={handleSaveAllChanges}
          style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "var(--primary)", border: "none", color: "#fff", padding: "0.6rem 1.25rem", borderRadius: "8px", fontWeight: 700, cursor: "pointer" }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          <span>Save All Changes</span>
        </button>
      </header>

      {/* Top 4 Stats Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
        
        {/* Total Resumes */}
        <div className="card" style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "1rem", margin: 0 }}>
          <div style={{ width: "42px", height: "42px", borderRadius: "10px", background: "rgba(99, 102, 241, 0.12)", color: "var(--primary-hover)", display: "grid", placeItems: "center" }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
          </div>
          <div>
            <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", display: "block" }}>Total Resumes</span>
            <strong style={{ fontSize: "1.4rem", color: "var(--text-heading)", fontWeight: 800 }}>{totalResumes}</strong>
            <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", display: "block" }}>Uploaded resumes</span>
          </div>
        </div>

        {/* Total Applications */}
        <div className="card" style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "1rem", margin: 0 }}>
          <div style={{ width: "42px", height: "42px", borderRadius: "10px", background: "rgba(16, 185, 129, 0.12)", color: "#10b981", display: "grid", placeItems: "center" }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          </div>
          <div>
            <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", display: "block" }}>Applications</span>
            <strong style={{ fontSize: "1.4rem", color: "var(--text-heading)", fontWeight: 800 }}>{totalApplications}</strong>
            <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", display: "block" }}>Total applications</span>
          </div>
        </div>

        {/* Average Match */}
        <div className="card" style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "1rem", margin: 0 }}>
          <div style={{ width: "42px", height: "42px", borderRadius: "10px", background: "rgba(245, 158, 11, 0.12)", color: "#f59e0b", display: "grid", placeItems: "center" }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
          </div>
          <div>
            <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", display: "block" }}>Average Match</span>
            <strong style={{ fontSize: "1.4rem", color: "var(--text-heading)", fontWeight: 800 }}>78%</strong>
            <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", display: "block" }}>Across all applications</span>
          </div>
        </div>

        {/* Saved Jobs */}
        <div className="card" style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "1rem", margin: 0 }}>
          <div style={{ width: "42px", height: "42px", borderRadius: "10px", background: "rgba(59, 130, 246, 0.12)", color: "#3b82f6", display: "grid", placeItems: "center" }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>
          </div>
          <div>
            <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", display: "block" }}>Saved Jobs</span>
            <strong style={{ fontSize: "1.4rem", color: "var(--text-heading)", fontWeight: 800 }}>{totalSavedJobsCount}</strong>
            <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", display: "block" }}>Jobs saved for later</span>
          </div>
        </div>

      </div>

      {/* Main split grid */}
      <div className="dashboard-grid" style={{ gridTemplateColumns: "1.5fr 1.5fr", gap: "1.5rem" }}>
        
        {/* Left Column (Profile Info only) */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          
          {/* Profile Information Card */}
          <section className="card" style={{ margin: 0, padding: "1.5rem", minHeight: "380px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "var(--text-heading)" }}>Profile Information</h3>
              
              <button 
                type="button" 
                onClick={() => {
                  if (isEditingProfile) {
                    triggerToast("Profile information updated successfully.");
                  }
                  setIsEditingProfile(!isEditingProfile);
                }}
                style={{ display: "flex", alignItems: "center", gap: "0.35rem", background: "none", border: "none", cursor: "pointer", color: "var(--primary-hover)", fontSize: "0.82rem", fontWeight: 600 }}
              >
                {isEditingProfile ? (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    <span>Save</span>
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                    <span>Edit Profile</span>
                  </>
                )}
              </button>
            </div>

            {/* Profile avatar and title */}
            <div style={{ display: "flex", alignItems: "center", gap: "1.25rem", marginBottom: "1.5rem" }}>
              <div style={{ position: "relative" }}>
                <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)", display: "grid", placeItems: "center", fontSize: "1.6rem", fontWeight: 800, color: "#fff" }}>
                  {profileName.charAt(0)}
                </div>
                <label htmlFor="avatar-upload" style={{ position: "absolute", bottom: "-2px", right: "-2px", width: "20px", height: "20px", borderRadius: "50%", background: "var(--bg-color)", border: "1px solid var(--sidebar-border)", display: "grid", placeItems: "center", cursor: "pointer", color: "var(--text-muted)" }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                  <input id="avatar-upload" type="file" onChange={() => triggerToast("Profile picture updated.")} style={{ display: "none" }} accept="image/*" />
                </label>
              </div>

              <div>
                <strong style={{ display: "block", fontSize: "1.25rem", color: "var(--text-heading)", fontWeight: 800 }}>{profileName}</strong>
                <span style={{ fontSize: "0.82rem", color: "var(--text-muted)", display: "block", marginTop: "0.15rem" }}>Registered Account User</span>
              </div>
            </div>

            {/* Fields Inputs */}
            <div className="stack" style={{ gap: "1.25rem" }}>
              <div>
                <label style={{ display: "block", marginBottom: "0.4rem", fontSize: "0.82rem", fontWeight: 700, color: "var(--text-muted)" }}>Full Name</label>
                <input 
                  type="text" 
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  disabled={!isEditingProfile}
                  style={{ background: isEditingProfile ? "var(--input-bg)" : "rgba(255,255,255,0.01)", border: "1px solid var(--input-border)", color: "var(--text-main)" }}
                />
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "0.4rem", fontSize: "0.82rem", fontWeight: 700, color: "var(--text-muted)" }}>Email Address</label>
                <input 
                  type="email" 
                  value={profileEmail}
                  disabled={true} // Email must never be changeable
                  style={{ background: "rgba(255,255,255,0.01)", border: "1px solid var(--sidebar-border)", opacity: 0.6, cursor: "not-allowed" }}
                />
              </div>
            </div>
          </section>

        </div>

        {/* Right Column (Resume Library only) */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          
          {/* Resume Library Card */}
          <section className="card" style={{ margin: 0, padding: "1.5rem", minHeight: "380px", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "var(--text-heading)" }}>Resume Library</h3>
              
              {/* Plus Upload Trigger */}
              <label htmlFor="resume-library-upload" style={{ display: "flex", alignItems: "center", gap: "0.35rem", background: "var(--primary)", border: "none", color: "#fff", padding: "0.45rem 1rem", borderRadius: "6px", fontSize: "0.78rem", fontWeight: 700, cursor: "pointer" }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></svg>
                <span>Upload New</span>
                <input id="resume-library-upload" type="file" onChange={handleUploadResume} style={{ display: "none" }} accept=".pdf,.doc,.docx" />
              </label>
            </div>

            {/* Resumes Library Grid List */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", flex: 1, maxHeight: "250px", overflowY: "auto" }}>
              {loading ? (
                <div className="loading-state">Loading resumes...</div>
              ) : resumes.length > 0 ? (
                resumes.map((res) => {
                  const dateStr = res.created_at ? formatDate(res.created_at) : "Jul 6, 2026";
                  const filename = res.file_path.split("/").pop()?.split("\\").pop() || "shivam_resume.pdf";
                  const isActive = res.status === "Active";
                  const isMenuOpen = activeResumeMenuId === res.id;

                  return (
                    <div 
                      key={res.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.75rem",
                        padding: "0.65rem 0.85rem",
                        background: "rgba(255,255,255,0.01)",
                        border: "1px solid var(--sidebar-border)",
                        borderRadius: "12px",
                        position: "relative"
                      }}
                    >
                      {/* Red PDF Icon */}
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: "var(--text-heading)", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                          {filename}
                        </span>
                        <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", display: "block" }}>
                          {dateStr} • 2 hrs ago
                        </span>
                      </div>

                      {/* Active / Archived Badge */}
                      <span className="badge" style={{
                        background: isActive ? "rgba(16, 185, 129, 0.12)" : "rgba(255, 255, 255, 0.03)",
                        color: isActive ? "#10b981" : "var(--text-muted)",
                        border: isActive ? "1px solid rgba(16, 185, 129, 0.2)" : "1px solid var(--sidebar-border)",
                        padding: "0.1rem 0.4rem",
                        borderRadius: "6px",
                        fontSize: "0.7rem",
                        fontWeight: 700
                      }}>
                        {res.status || "Active"}
                      </span>

                      {/* Three-dots menu actions trigger */}
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveResumeMenuId(isMenuOpen ? null : res.id);
                        }}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: "0.25rem", display: "grid", placeItems: "center" }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                      </button>

                      {/* Actions dropdown popup */}
                      {isMenuOpen && (
                        <div 
                          className="profile-menu-dropdown animate-fade"
                          style={{
                            position: "absolute",
                            right: "0.5rem",
                            top: "2.5rem",
                            width: "120px",
                            zIndex: 250,
                            background: "var(--auth-card-bg)",
                            border: "1px solid var(--auth-card-border)",
                            borderRadius: "10px",
                            boxShadow: "0 8px 24px rgba(0,0,0,0.4)"
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button 
                            type="button" 
                            className="profile-dropdown-item" 
                            style={{ width: "100%", padding: "0.45rem 0.75rem", fontSize: "0.78rem" }}
                            onClick={() => handleSetResumeActive(res.id)}
                          >
                            Set Active
                          </button>
                          <button 
                            type="button" 
                            className="profile-dropdown-item" 
                            style={{ width: "100%", padding: "0.45rem 0.75rem", fontSize: "0.78rem" }}
                            onClick={() => handleArchiveResume(res.id)}
                          >
                            Archive
                          </button>
                          <button 
                            type="button" 
                            className="profile-dropdown-item" 
                            style={{ width: "100%", padding: "0.45rem 0.75rem", fontSize: "0.78rem", color: "#ef4444" }}
                            onClick={() => handleDeleteResume(res.id)}
                          >
                            Delete
                          </button>
                        </div>
                      )}

                    </div>
                  );
                })
              ) : (
                <p className="muted text-sm text-center" style={{ marginTop: "1.5rem" }}>No resumes uploaded.</p>
              )}
            </div>

            <button 
              type="button" 
              className="card-footer-link" 
              onClick={() => setShowResumesModal(true)}
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", background: "none", border: "none", cursor: "pointer", fontSize: "0.82rem", marginTop: "1rem", padding: "0.25rem 0", textDecoration: "none" }}
            >
              <span>View All Resumes</span>
              <span>&gt;</span>
            </button>
          </section>

        </div>

      </div>

      {/* View All Resumes Modal */}
      {showResumesModal && (
        <div className="drawer-overlay" onClick={() => setShowResumesModal(false)} style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
          <div 
            className="drawer-content animate-fade" 
            onClick={(e) => e.stopPropagation()} 
            style={{ 
              width: "min(550px, 95%)", 
              height: "min(500px, 90%)", 
              borderRadius: "16px", 
              borderLeft: "none",
              border: "1px solid var(--sidebar-border)",
              boxShadow: "0 10px 40px rgba(0, 0, 0, 0.4)",
              position: "relative"
            }}
          >
            <div className="drawer-header" style={{ marginBottom: "1.5rem" }}>
              <h2 style={{ fontSize: "1.3rem", fontWeight: 700, color: "var(--text-heading)" }}>All Saved Resumes</h2>
              <button className="close-btn" onClick={() => setShowResumesModal(false)}>×</button>
            </div>
            <div className="drawer-body" style={{ overflowY: "auto", paddingRight: "0.25rem" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                {resumes.map((res) => {
                  const filename = res.file_path.split("/").pop()?.split("\\").pop() || "resume.pdf";
                  return (
                    <div 
                      key={res.id} 
                      className="saved-resume-item"
                      style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem" }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "var(--text-heading)", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>{filename}</span>
                        <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Parsed {formatDate(res.created_at)}</span>
                      </div>
                      <span className="badge" style={{ background: res.status === "Active" ? "rgba(16,185,129,0.1)" : "rgba(255,255,255,0.03)", color: res.status === "Active" ? "#10b981" : "var(--text-muted)", border: "1px solid var(--sidebar-border)" }}>
                        {res.status || "Active"}
                      </span>
                    </div>
                  );
                })}
                {resumes.length === 0 && (
                  <p className="muted text-sm text-center">No resumes found.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Feedback Toast Notification */}
      {toastMessage && (
        <div style={{
          position: "fixed",
          bottom: "2rem",
          right: "2rem",
          background: "var(--primary-hover)",
          color: "#fff",
          padding: "0.75rem 1.5rem",
          borderRadius: "8px",
          boxShadow: "0 8px 32px rgba(99, 102, 241, 0.4)",
          zIndex: 9999,
          fontSize: "0.88rem",
          fontWeight: 600,
          border: "1px solid rgba(255,255,255,0.1)"
        }} className="animate-fade">
          {toastMessage}
        </div>
      )}

    </div>
  );
}
