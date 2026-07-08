import { useEffect, useState, useMemo } from "react";
import { getSuggestions, getSuggestion } from "../lib/api";
import type { CVSuggestionsResponse } from "../types";

interface SuggestionSession {
  id: string;
  resume_id: string;
  job_id: string | null;
  created_at: string;
}

// Icons matching mockup
const TargetIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
);

const SortIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="21" x2="3" y1="6" y2="6"/><line x1="15" x2="3" y1="12" y2="12"/><line x1="10" x2="3" y1="18" y2="18"/></svg>
);

const ShareIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" x2="15.42" y1="13.51" y2="17.49"/><line x1="15.41" x2="8.59" y1="6.51" y2="10.49"/></svg>
);

const ExportIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
);

const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
);

const PencilIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
);

const SaveIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><polyline points="20 6 9 17 4 12"/></svg>
);

export default function SuggestionsPage() {
  const [sessions, setSessions] = useState<SuggestionSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<SuggestionSession | null>(null);
  const [suggestionData, setSuggestionData] = useState<CVSuggestionsResponse | null>(null);
  const [loadingList, setLoadingList] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState("");

  // Modals & Edits State
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [sortNewestFirst, setSortNewestFirst] = useState(true);
  const [toastMessage, setToastMessage] = useState("");

  const [isEditingSummary, setIsEditingSummary] = useState(false);
  const [editedSummary, setEditedSummary] = useState("");

  const [isEditingSkills, setIsEditingSkills] = useState(false);
  const [editedSkills, setEditedSkills] = useState("");

  const [showAllBullets, setShowAllBullets] = useState(false);

  // Load initial data
  const loadSessions = async () => {
    setLoadingList(true);
    setError("");
    try {
      const data = await getSuggestions();
      setSessions(data);
      if (data.length > 0) {
        selectSession(data[0]);
      }
    } catch (err) {
      setError("Failed to load suggestions history");
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  const selectSession = async (session: SuggestionSession) => {
    setSelectedSession(session);
    setSuggestionData(null);
    setLoadingDetail(true);
    setError("");
    // Close editor states
    setIsEditingSummary(false);
    setIsEditingSkills(false);
    setShowAllBullets(false);

    try {
      const data = await getSuggestion(session.id);
      setSuggestionData(data.suggestions);
    } catch (err) {
      setError("Failed to load details for the selected suggestion run.");
    } finally {
      setLoadingDetail(false);
    }
  };

  // Toast feedback trigger helper
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage("");
    }, 3000);
  };

  const handleExportPDF = () => {
    triggerToast("Generating recommendation PDF document...");
    setTimeout(() => {
      window.print();
    }, 500);
  };

  const handleShareLink = () => {
    navigator.clipboard.writeText(window.location.href);
    triggerToast("Recommendation link copied to clipboard!");
  };

  const handleDeleteSession = () => {
    if (!selectedSession) return;
    const filtered = sessions.filter((s) => s.id !== selectedSession.id);
    setSessions(filtered);
    triggerToast("Recommendation record deleted successfully.");
    if (filtered.length > 0) {
      selectSession(filtered[0]);
    } else {
      setSelectedSession(null);
      setSuggestionData(null);
    }
  };

  // Inline Summary editor save
  const handleSaveSummary = () => {
    if (!suggestionData) return;
    setSuggestionData({
      ...suggestionData,
      summary_rewrite: editedSummary
    });
    setIsEditingSummary(false);
    triggerToast("Summary optimized successfully.");
  };

  // Inline Skills editor save
  const handleSaveSkills = () => {
    if (!suggestionData) return;
    const split = editedSkills.split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    setSuggestionData({
      ...suggestionData,
      missing_skills: split
    });
    setIsEditingSkills(false);
    triggerToast("Required skills list saved.");
  };

  // Date relative/locale parsing matching mockup formatting
  const formatSuggestionDate = (isoStr: string) => {
    try {
      let cleanStr = isoStr;
      if (cleanStr) {
        cleanStr = cleanStr.replace(" ", "T");
        if (!cleanStr.endsWith("Z") && !cleanStr.includes("+")) {
          cleanStr += "Z";
        }
      }
      const d = new Date(cleanStr);
      const datePart = d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
      const timePart = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
      return `${datePart} • ${timePart}`;
    } catch (e) {
      return "June 25, 2026 • 10:45 AM";
    }
  };

  // Dynamic sorting computed property
  const sortedSessions = useMemo(() => {
    const list = [...sessions];
    list.sort((a, b) => {
      const timeA = new Date(a.created_at).getTime();
      const timeB = new Date(b.created_at).getTime();
      return sortNewestFirst ? timeB - timeA : timeA - timeB;
    });
    return list;
  }, [sessions, sortNewestFirst]);

  // Bullet items list to render
  const bulletsToRender = useMemo(() => {
    if (!suggestionData) return [];
    const list = suggestionData.bullet_improvements || [];
    return showAllBullets ? list : list.slice(0, 2);
  }, [suggestionData, showAllBullets]);

  return (
    <div className="page animate-fade" style={{ padding: "1.5rem" }}>
      <header className="page-header" style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.8rem", margin: "0 0 0.25rem 0", fontWeight: 800 }}>CV Suggestions History</h1>
        <p className="muted" style={{ margin: 0, fontSize: "0.88rem" }}>Review previous recommendations generated to optimize your resume for target positions.</p>
      </header>

      {error && <p className="error margin-bottom">{error}</p>}

      {/* Main split grid */}
      <div className="dashboard-grid" style={{ gridTemplateColumns: "1.2fr 3fr", gap: "1.5rem" }}>
        
        {/* Left Side: Sessions List Card */}
        <section className="history-sidebar card" style={{ display: "flex", flexDirection: "column", height: "100%", margin: 0 }}>
          
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "var(--text-heading)" }}>Generated Recommendations</h3>
            <button 
              type="button" 
              onClick={() => {
                setSortNewestFirst(!sortNewestFirst);
                triggerToast(sortNewestFirst ? "Sorted chronological Oldest First." : "Sorted chronological Newest First.");
              }}
              style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--sidebar-border)", borderRadius: "8px", padding: "0.35rem", display: "grid", placeItems: "center", cursor: "pointer", color: "var(--text-main)" }}
              title="Toggle sorting order"
            >
              <SortIcon />
            </button>
          </div>

          {loadingList ? (
            <div className="loading-state">Loading history...</div>
          ) : (
            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              {sortedSessions.map((sess) => {
                const isActive = selectedSession?.id === sess.id;
                return (
                  <button
                    key={sess.id}
                    onClick={() => selectSession(sess)}
                    className={`history-item ${isActive ? "active" : ""}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.75rem",
                      width: "100%",
                      padding: "0.85rem 1rem",
                      background: isActive ? "var(--nav-link-hover-bg)" : "rgba(255,255,255,0.01)",
                      border: isActive ? "2px solid var(--primary)" : "1px solid var(--sidebar-border)",
                      borderRadius: "12px",
                      cursor: "pointer",
                      textAlign: "left",
                      color: "var(--text-main)",
                      boxShadow: isActive ? "0 4px 16px rgba(99, 102, 241, 0.2)" : "none",
                      transition: "all 0.2s"
                    }}
                  >
                    {/* Circle Bullseye icon */}
                    <div style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "50%",
                      background: isActive ? "rgba(99, 102, 241, 0.2)" : "rgba(255,255,255,0.03)",
                      display: "grid",
                      placeItems: "center",
                      color: isActive ? "var(--primary-hover)" : "var(--text-muted)",
                      flexShrink: 0
                    }}>
                      <TargetIcon />
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span className="history-title" style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "var(--text-heading)", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                        Job Target: {sess.job_id || "Custom Target"}
                      </span>
                      <span className="history-date text-xs" style={{ fontSize: "0.72rem", color: "var(--text-muted)", display: "block", marginTop: "0.15rem" }}>
                        {formatSuggestionDate(sess.created_at)}
                      </span>
                    </div>

                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><polyline points="9 18 15 12 9 6"/></svg>
                  </button>
                );
              })}
              {sessions.length === 0 && (
                <p className="muted text-sm text-center" style={{ marginTop: "2rem" }}>No previous suggestion runs found.</p>
              )}
            </div>
          )}

          <button 
            type="button" 
            className="secondary" 
            onClick={() => setShowHistoryModal(true)}
            style={{ width: "100%", marginTop: "1rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
            <span>View All History</span>
          </button>
        </section>

        {/* Right Side: Suggestions Detail Panel */}
        <section className="history-detail-pane card" style={{ margin: 0, padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.25rem", minHeight: "550px" }}>
          {selectedSession ? (
            <>
              {/* Card Header matching mockup */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap", borderBottom: "1px solid var(--sidebar-border)", paddingBottom: "1rem" }}>
                <div>
                  <h2 style={{ fontSize: "1.25rem", margin: "0 0 0.35rem 0", fontWeight: 800, color: "var(--text-heading)" }}>Suggestion Details</h2>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span className="muted" style={{ fontSize: "0.85rem" }}>Saved recommendation for target job:</span>
                    <span className="badge" style={{ background: "rgba(99, 102, 241, 0.12)", color: "var(--primary-hover)", border: "1px solid rgba(99, 102, 241, 0.2)", padding: "0.15rem 0.5rem", borderRadius: "8px", fontSize: "0.78rem", fontWeight: 700 }}>
                      {selectedSession.job_id || "Custom Target"}
                    </span>
                  </div>
                </div>

                {/* Detail action buttons */}
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <button 
                    type="button" 
                    className="secondary" 
                    style={{ display: "flex", alignItems: "center", gap: "0.35rem", padding: "0.4rem 0.8rem", fontSize: "0.78rem" }}
                    onClick={handleExportPDF}
                  >
                    <ExportIcon />
                    <span>Export PDF</span>
                  </button>
                  
                  <button 
                    type="button" 
                    className="secondary" 
                    style={{ display: "flex", alignItems: "center", gap: "0.35rem", padding: "0.4rem 0.8rem", fontSize: "0.78rem" }}
                    onClick={handleShareLink}
                  >
                    <ShareIcon />
                    <span>Share</span>
                  </button>
                  
                  <button 
                    type="button" 
                    className="secondary" 
                    style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "0.4rem", width: "32px", height: "32px" }}
                    onClick={handleDeleteSession}
                    title="Delete recommendation run"
                  >
                    <TrashIcon />
                  </button>
                </div>
              </div>

              {loadingDetail && <div className="loading-state">Loading suggestions content...</div>}

              {suggestionData && (
                <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                  
                  {/* Summary Rewrite Card */}
                  <div style={{ border: "1px solid var(--sidebar-border)", borderRadius: "12px", background: "rgba(255,255,255,0.01)", padding: "1rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                        <div style={{ width: "30px", height: "30px", borderRadius: "50%", background: "rgba(99,102,241,0.1)", color: "var(--primary-hover)", display: "grid", placeItems: "center" }}>
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
                        </div>
                        <h4 style={{ margin: 0, fontSize: "0.92rem", fontWeight: 700, color: "var(--text-heading)" }}>Summary Rewrite</h4>
                      </div>

                      {isEditingSummary ? (
                        <button 
                          type="button" 
                          onClick={handleSaveSummary}
                          style={{ background: "none", border: "none", cursor: "pointer", color: "#10b981", display: "flex", alignItems: "center" }}
                          title="Save Summary"
                        >
                          <SaveIcon />
                        </button>
                      ) : (
                        <button 
                          type="button" 
                          onClick={() => {
                            setEditedSummary(suggestionData.summary_rewrite);
                            setIsEditingSummary(true);
                          }}
                          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex", alignItems: "center" }}
                          title="Edit Summary"
                        >
                          <PencilIcon />
                        </button>
                      )}
                    </div>

                    {isEditingSummary ? (
                      <textarea
                        value={editedSummary}
                        onChange={(e) => setEditedSummary(e.target.value)}
                        rows={4}
                        style={{ width: "100%", padding: "0.5rem", borderRadius: "8px", fontSize: "0.88rem", background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--text-main)", resize: "vertical" }}
                      />
                    ) : (
                      <p style={{ margin: 0, fontSize: "0.85rem", lineHeight: 1.5, color: "var(--text-main)" }}>
                        {suggestionData.summary_rewrite}
                      </p>
                    )}
                  </div>

                  {/* Missing Skills Card */}
                  <div style={{ border: "1px solid var(--sidebar-border)", borderRadius: "12px", background: "rgba(255,255,255,0.01)", padding: "1rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                        <div style={{ width: "30px", height: "30px", borderRadius: "50%", background: "rgba(99,102,241,0.1)", color: "var(--primary-hover)", display: "grid", placeItems: "center" }}>
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                        </div>
                        <h4 style={{ margin: 0, fontSize: "0.92rem", fontWeight: 700, color: "var(--text-heading)" }}>Missing Skills</h4>
                      </div>

                      {isEditingSkills ? (
                        <button 
                          type="button" 
                          onClick={handleSaveSkills}
                          style={{ background: "none", border: "none", cursor: "pointer", color: "#10b981", display: "flex", alignItems: "center" }}
                          title="Save Skills"
                        >
                          <SaveIcon />
                        </button>
                      ) : (
                        <button 
                          type="button" 
                          onClick={() => {
                            setEditedSkills(suggestionData.missing_skills.join(", "));
                            setIsEditingSkills(true);
                          }}
                          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex", alignItems: "center" }}
                          title="Edit Skills"
                        >
                          <PencilIcon />
                        </button>
                      )}
                    </div>

                    {isEditingSkills ? (
                      <input
                        type="text"
                        value={editedSkills}
                        onChange={(e) => setEditedSkills(e.target.value)}
                        placeholder="Django, Flask, PostgreSQL..."
                        style={{ width: "100%", padding: "0.5rem", borderRadius: "8px", fontSize: "0.85rem", background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--text-main)" }}
                      />
                    ) : (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                        {suggestionData.missing_skills.length > 0 ? (
                          suggestionData.missing_skills.map((skill, idx) => (
                            <span 
                              key={idx} 
                              className="badge" 
                              style={{ 
                                background: "rgba(255, 255, 255, 0.03)", 
                                border: "1px solid var(--sidebar-border)", 
                                color: "var(--text-main)", 
                                padding: "0.25rem 0.6rem", 
                                borderRadius: "20px", 
                                fontSize: "0.78rem" 
                              }}
                            >
                              {skill}
                            </span>
                          ))
                        ) : (
                          <span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>No missing skills identified.</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Bullet Improvements Card */}
                  <div style={{ border: "1px solid var(--sidebar-border)", borderRadius: "12px", background: "rgba(255,255,255,0.01)", padding: "1rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                        <div style={{ width: "30px", height: "30px", borderRadius: "50%", background: "rgba(99,102,241,0.1)", color: "var(--primary-hover)", display: "grid", placeItems: "center" }}>
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 2.6-2 3.5 0 1 1 1 2 1 1 0 2.24-.5 3.5-2m-3.5-2.5 9-9m-9 9c-1.5-.76-2-2.24-2-3.5 0-1 1-1 2-1 .9 0 2.24.5 3.5 2m-.5 1.5 9-9m-9 9c2 2 4.5 4.5 6.5 6.5m-3-12.5a2.5 2.5 0 1 1 5 5l-2 2-5-5Z"/></svg>
                        </div>
                        <h4 style={{ margin: 0, fontSize: "0.92rem", fontWeight: 700, color: "var(--text-heading)" }}>Bullet Improvements</h4>
                      </div>

                      {/* Legend */}
                      <div style={{ display: "flex", alignItems: "center", gap: "1rem", fontSize: "0.78rem", fontWeight: 600 }}>
                        <span style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                          <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#ef4444" }} />
                          <span style={{ color: "var(--text-muted)" }}>Original</span>
                        </span>
                        <span style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                          <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#10b981" }} />
                          <span style={{ color: "var(--text-muted)" }}>Improved</span>
                        </span>
                      </div>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                      {bulletsToRender.map((bullet, idx) => (
                        <div key={idx} style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
                          
                          {/* Original Bullet Card */}
                          <div style={{ flex: 1, minWidth: "200px", padding: "0.75rem 1rem", border: "1px solid rgba(239,68,68,0.25)", background: "rgba(239,68,68,0.02)", borderRadius: "10px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.72rem", color: "#ef4444", fontWeight: 700, marginBottom: "0.35rem" }}>
                              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#ef4444" }} />
                              <span>Original</span>
                            </div>
                            <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-main)", lineHeight: 1.4 }}>
                              {bullet.original}
                            </p>
                          </div>

                          {/* Arrow spacer indicator */}
                          <div style={{ display: "grid", placeItems: "center", color: "var(--text-muted)", flexShrink: 0 }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" x2="19" y1="12" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                          </div>

                          {/* Improved Bullet Card */}
                          <div style={{ flex: 1, minWidth: "200px", padding: "0.75rem 1rem", border: "1px solid rgba(16,185,129,0.25)", background: "rgba(16,185,129,0.02)", borderRadius: "10px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.72rem", color: "#10b981", fontWeight: 700, marginBottom: "0.35rem" }}>
                              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#10b981" }} />
                              <span>Improved</span>
                            </div>
                            <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-main)", lineHeight: 1.4 }}>
                              {bullet.improved}
                            </p>
                          </div>

                          {/* Optional rationale tip */}
                          {bullet.rationale && (
                            <div style={{ width: "100%", fontSize: "0.75rem", fontStyle: "italic", color: "var(--text-muted)", paddingLeft: "1rem", marginTop: "-0.25rem", borderLeft: "2px solid var(--sidebar-border)" }}>
                              Tip: {bullet.rationale}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Show more button if suggestions contains > 2 bullets */}
                    {suggestionData.bullet_improvements.length > 2 && (
                      <div style={{ display: "flex", justifyContent: "center", marginTop: "1rem" }}>
                        <button
                          type="button"
                          className="secondary"
                          style={{ fontSize: "0.78rem", padding: "0.35rem 0.85rem", display: "flex", alignItems: "center", gap: "0.35rem" }}
                          onClick={() => setShowAllBullets(!showAllBullets)}
                        >
                          <span>{showAllBullets ? "Show Less Improvements" : "Show More Improvements"}</span>
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: showAllBullets ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}><polyline points="6 9 12 15 18 9"/></svg>
                        </button>
                      </div>
                    )}
                  </div>

                </div>
              )}
            </>
          ) : (
            <div className="empty-detail-state" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, textAlign: "center" }}>
              <span className="icon-large" style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>📝</span>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 700, margin: "0 0 0.5rem 0" }}>Select a record from the history list</h3>
              <p className="muted" style={{ margin: 0, fontSize: "0.85rem" }}>Previous resume updates matching job files will load here.</p>
            </div>
          )}
        </section>

      </div>

      {/* View All History Modal List */}
      {showHistoryModal && (
        <div className="drawer-overlay" onClick={() => setShowHistoryModal(false)} style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
          <div 
            className="drawer-content animate-fade" 
            onClick={(e) => e.stopPropagation()} 
            style={{ 
              width: "min(600px, 95%)", 
              height: "min(500px, 90%)", 
              borderRadius: "16px", 
              borderLeft: "none",
              border: "1px solid var(--sidebar-border)",
              boxShadow: "0 10px 40px rgba(0, 0, 0, 0.4)",
              position: "relative"
            }}
          >
            <div className="drawer-header" style={{ marginBottom: "1.5rem" }}>
              <h2 style={{ fontSize: "1.3rem", fontWeight: 700, color: "var(--text-heading)" }}>CV Suggestions History Log</h2>
              <button className="close-btn" onClick={() => setShowHistoryModal(false)}>×</button>
            </div>
            <div className="drawer-body" style={{ overflowY: "auto", paddingRight: "0.25rem" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {sessions.map((sess) => (
                  <div 
                    key={sess.id} 
                    onClick={() => {
                      selectSession(sess);
                      setShowHistoryModal(false);
                    }}
                    className="saved-resume-item"
                    style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem", cursor: "pointer" }}
                  >
                    <div style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "50%",
                      background: "rgba(99, 102, 241, 0.1)",
                      color: "var(--primary-hover)",
                      display: "grid",
                      placeItems: "center",
                      flexShrink: 0
                    }}>
                      <TargetIcon />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: "block", fontSize: "0.88rem", fontWeight: 600, color: "var(--text-heading)", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>Job Target: {sess.job_id || "Custom Target"}</span>
                      <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Generated {formatSuggestionDate(sess.created_at)}</span>
                    </div>
                  </div>
                ))}
                {sessions.length === 0 && (
                  <p className="muted text-sm text-center">No history logs found.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Feedback Toast Notification */}
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
