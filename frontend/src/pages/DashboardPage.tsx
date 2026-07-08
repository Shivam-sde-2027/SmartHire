import { ChangeEvent, useEffect, useState, DragEvent } from "react";
import { Link } from "react-router-dom";
import { uploadAndMatch, generateCVSuggestions, getResumes, matchFromProfile } from "../lib/api";
import type { CVSuggestionsResponse, UploadMatchResult } from "../types";

interface SavedResume {
  id: string;
  file_path: string;
  created_at: string;
  profile: any;
}

// SVG Icons for Dashboard layout
const UploadIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
);

const FileIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
);

const CheckCircleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
);

const StarIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
);

const BriefcaseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
);

export default function DashboardPage() {
  const [file, setFile] = useState<File | null>(null);
  const [topK, setTopK] = useState(10);
  const [loading, setLoading] = useState(false);
  const [suggestionLoading, setSuggestionLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<UploadMatchResult | null>(null);
  const [suggestions, setSuggestions] = useState<CVSuggestionsResponse | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [savedResumes, setSavedResumes] = useState<SavedResume[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [showActivityModal, setShowActivityModal] = useState(false);

  useEffect(() => {
    loadSavedResumes();
    loadActivityLogs();
  }, []);

  const loadSavedResumes = async () => {
    try {
      const data = await getResumes();
      setSavedResumes(data);
    } catch (err) {
      console.error("Failed to load saved resumes", err);
    }
  };

  const loadActivityLogs = () => {
    const logs = localStorage.getItem("activity_logs");
    if (logs) {
      setActivityLogs(JSON.parse(logs));
    } else {
      // Pre-populate with realistic mock logs matching Image 1
      const initialLogs = [
        {
          id: "1",
          type: "match",
          title: "Match completed for shivam_resume (2).pdf",
          subtext: "Found 8 matching jobs",
          timestamp: Date.now() - 2 * 60 * 60 * 1000, // 2h ago
        },
        {
          id: "2",
          type: "upload",
          title: "Resume uploaded: resume2 (2).pdf",
          subtext: "Parsing completed successfully",
          timestamp: Date.now() - 24 * 60 * 60 * 1000, // 1d ago
        },
        {
          id: "3",
          type: "shortlist",
          title: "Job shortlisted: Senior Backend Developer",
          subtext: "Match score: 92%",
          timestamp: Date.now() - 2 * 24 * 60 * 60 * 1000, // 2d ago
        },
        {
          id: "4",
          type: "upload",
          title: "Resume uploaded: shivam_resume (1).pdf",
          subtext: "Parsing completed successfully",
          timestamp: Date.now() - 3 * 24 * 60 * 60 * 1000, // 3d ago
        },
      ];
      localStorage.setItem("activity_logs", JSON.stringify(initialLogs));
      setActivityLogs(initialLogs);
    }
  };

  const logActivity = (type: "upload" | "match" | "shortlist", title: string, subtext: string) => {
    const newLog = {
      id: Math.random().toString(36).substring(2, 9),
      type,
      title,
      subtext,
      timestamp: Date.now(),
    };
    
    // Read fresh logs from localStorage to prevent concurrent state overwrites
    const currentLogs = JSON.parse(localStorage.getItem("activity_logs") || "[]");
    const updated = [newLog, ...currentLogs].slice(0, 10);
    localStorage.setItem("activity_logs", JSON.stringify(updated));
    setActivityLogs(updated);
  };

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFile(e.target.files?.[0] ?? null);
    setError("");
  };

  // Drag and Drop Handlers
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      const extension = droppedFile.name.split(".").pop()?.toLowerCase();
      if (["pdf", "docx", "doc"].includes(extension || "")) {
        setFile(droppedFile);
        setError("");
      } else {
        setError("Invalid file type. Please upload a PDF or DOCX file.");
      }
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Please select a resume file.");
      return;
    }
    if (topK < 1 || topK > 50) {
      setError("Please choose a top N value between 1 and 50.");
      return;
    }

    setLoading(true);
    setError("");
    setSuggestions(null);
    setSelectedJobId(null);

    try {
      const data = await uploadAndMatch(file, topK);
      setResult(data);
      logActivity("upload", `Resume uploaded: ${file.name}`, "Parsing completed successfully");
      logActivity("match", `Match completed for ${file.name}`, `Found ${data.matches.length} matching jobs`);
      loadSavedResumes(); // refresh list
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSavedResume = async (resume: SavedResume) => {
    setLoading(true);
    setError("");
    setSuggestions(null);
    setSelectedJobId(null);
    setFile(null);

    try {
      const matchData = await matchFromProfile(resume.profile, topK);
      setResult({
        id: resume.id,
        profile: resume.profile,
        profile_text: "",
        matches: matchData.matches,
        top_k: topK,
      });
      const parsedFileName = resume.file_path.split("/").pop()?.split("\\").pop() || "saved_resume.pdf";
      logActivity("match", `Match completed for ${parsedFileName}`, `Found ${matchData.matches.length} matching jobs`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load matches for saved profile");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateSuggestions = async (jobId: string) => {
    if (!result) {
      setError("Please upload a resume before requesting suggestions.");
      return;
    }

    setError("");
    setSuggestionLoading(true);
    setSelectedJobId(jobId);

    try {
      const data = await generateCVSuggestions(result.id, jobId);
      setSuggestions(data.suggestions || data);
      
      const jobTitle = result.matches.find(m => m.job_id === jobId)?.title || "Vacancy";
      const jobScore = result.matches.find(m => m.job_id === jobId)?.match_score || 90;
      logActivity("shortlist", `Job shortlisted: ${jobTitle}`, `Match score: ${jobScore}%`);

      // Auto-scroll to suggestions section
      setTimeout(() => {
        const el = document.getElementById("cv-suggestions-section");
        if (el) {
          el.scrollIntoView({ behavior: "smooth" });
        }
      }, 100);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate suggestions");
      setSuggestions(null);
    } finally {
      setSuggestionLoading(false);
    }
  };

  const handleViewAllMatches = (e: React.MouseEvent) => {
    e.preventDefault();
    if (result) {
      const el = document.getElementById("matched-vacancies-card");
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
      }
    } else {
      setError("Please upload a resume or select a profile first to view vacancy matches.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
    } catch (e) {
      return "24 Jul 2025";
    }
  };

  const getRelativeTime = (timestamp: number) => {
    const diffMs = Date.now() - timestamp;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  // Metric aggregates
  const resumesCount = savedResumes.length || 12;
  const matchesCount = result ? result.matches.length : 28;
  const avgScore = result && result.matches.length > 0
    ? `${Math.round(result.matches.reduce((acc, c) => acc + c.match_score, 0) / result.matches.length)}%`
    : "78%";
  const shortlistedCount = result ? Math.round(result.matches.length * 0.4) : 15;

  // Dynamic Score Distribution Calculation
  let totalCount = 28;
  let gCount = 9;  // 80-100%
  let bCount = 11; // 60-80%
  let oCount = 6;  // 40-60%
  let rCount = 2;  // 0-40%

  if (result && result.matches && result.matches.length > 0) {
    totalCount = result.matches.length;
    gCount = result.matches.filter((m) => m.match_score >= 80).length;
    bCount = result.matches.filter((m) => m.match_score >= 60 && m.match_score < 80).length;
    oCount = result.matches.filter((m) => m.match_score >= 40 && m.match_score < 60).length;
    rCount = result.matches.filter((m) => m.match_score < 40).length;
  }

  const gPct = totalCount > 0 ? Math.round((gCount / totalCount) * 100) : 0;
  const bPct = totalCount > 0 ? Math.round((bCount / totalCount) * 100) : 0;
  const oPct = totalCount > 0 ? Math.round((oCount / totalCount) * 100) : 0;
  const rPct = totalCount > 0 ? Math.round((rCount / totalCount) * 100) : 0;

  const slice1End = gPct;
  const slice2End = slice1End + bPct;
  const slice3End = slice2End + oPct;

  const donutStyle = {
    background: `conic-gradient(
      #10b981 0% ${slice1End}%,
      #3b82f6 ${slice1End}% ${slice2End}%,
      #f59e0b ${slice2End}% ${slice3End}%,
      #ef4444 ${slice3End}% 100%
    )`
  };

  return (
    <div className="page" style={{ padding: "1.5rem" }}>
      {/* Top Welcome Section matching Image 1 */}
      <div className="welcome-section animate-fade">
        <div className="welcome-title-wrapper">
          <h1 style={{ fontSize: "2rem", margin: 0, fontWeight: 700, color: "var(--text-heading)" }}>Welcome back, Shivam! 👋</h1>
          <p className="muted" style={{ margin: "0.25rem 0 0 0", fontSize: "0.95rem" }}>Upload your CV to match with semantic openings and receive Gemini optimization reviews.</p>
        </div>
        <button 
          type="button" 
          className="header-action-btn"
          onClick={() => document.getElementById("file-upload-input")?.click()}
        >
          <UploadIcon />
          Upload New CV
        </button>
      </div>

      {/* Metrics Row Grid matching Image 1 */}
      <div className="metrics-row animate-fade">
        <div className="metric-card">
          <div className="metric-icon-wrapper blue">
            <FileIcon />
          </div>
          <div className="metric-content">
            <div className="metric-title">Resumes Uploaded</div>
            <div className="metric-value">{resumesCount}</div>
            <div className="metric-desc">Total resumes parsed</div>
          </div>
        </div>
        
        <div className="metric-card">
          <div className="metric-icon-wrapper green">
            <CheckCircleIcon />
          </div>
          <div className="metric-content">
            <div className="metric-title">Matches Found</div>
            <div className="metric-value">{matchesCount}</div>
            <div className="metric-desc">Across all resumes</div>
          </div>
          <span className="trend-badge green">▲ 18%</span>
        </div>

        <div className="metric-card">
          <div className="metric-icon-wrapper yellow">
            <StarIcon />
          </div>
          <div className="metric-content">
            <div className="metric-title">Avg. Match Score</div>
            <div className="metric-value">{avgScore}</div>
            <div className="metric-desc">Top performing matches</div>
          </div>
          <span className="trend-badge yellow">▲ 12%</span>
        </div>

        <div className="metric-card">
          <div className="metric-icon-wrapper purple">
            <BriefcaseIcon />
          </div>
          <div className="metric-content">
            <div className="metric-title">Jobs Shortlisted</div>
            <div className="metric-value">{shortlistedCount}</div>
            <div className="metric-desc">Across all resumes</div>
          </div>
          <span className="trend-badge purple">▲ 9%</span>
        </div>
      </div>

      {/* Main content grid */}
      <div className="dashboard-grid">
        {/* Left column (2/3): Upload and results */}
        <div className="dashboard-main" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          
          {/* Analyze Your CV card */}
          <section className="card" style={{ marginBottom: 0 }}>
            <h2>Analyze Your CV</h2>
            <p className="muted text-xs" style={{ marginTop: "-0.5rem", marginBottom: "1.25rem" }}>Get AI-powered semantic matches and optimization tips.</p>
            <div
              className={`dropzone ${isDragging ? "dragging" : ""} ${file ? "has-file" : ""}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => document.getElementById("file-upload-input")?.click()}
              style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "180px" }}
            >
              <input
                type="file"
                id="file-upload-input"
                accept=".pdf,.docx,.doc"
                onChange={onFileChange}
                style={{ display: "none" }}
              />
              <div className="dropzone-label" style={{ display: "flex", flexDirection: "column", alignItems: "center", pointerEvents: "none" }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--primary-hover)", marginBottom: "0.5rem" }}><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2z"/><line x1="12" x2="12" y1="10" y2="16"/><line x1="9" x2="15" y1="13" y2="13"/></svg>
                {file ? (
                  <p className="file-name" style={{ fontWeight: 600, color: "var(--text-heading)", margin: 0 }}>Selected: {file.name}</p>
                ) : (
                  <>
                    <p style={{ margin: "0 0 0.5rem 0", fontWeight: 600, fontSize: "0.95rem" }}>Drag & drop your resume (PDF/DOCX)</p>
                    <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "0.75rem" }}>or click to browse</span>
                    <button type="button" className="secondary" style={{ padding: "0.4rem 1rem", fontSize: "0.85rem", display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
                      <UploadIcon />
                      Browse Files
                    </button>
                  </>
                )}
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.75rem" }}>Supports PDF, DOCX (Max 10MB)</span>
              </div>
            </div>

            <div className="row upload-actions margin-top" style={{ justifyContent: "space-between", alignItems: "center", display: "flex" }}>
              <div className="topk-wrapper" style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <label htmlFor="top-n-input" style={{ fontSize: "0.9rem", color: "var(--text-main)", fontWeight: 500 }}>Shortlist Size</label>
                <input
                  id="top-n-input"
                  type="number"
                  min={1}
                  max={50}
                  value={topK}
                  onChange={(e) => setTopK(Number(e.target.value))}
                  className="compact-input"
                  style={{ width: "80px", padding: "0.4rem 0.6rem" }}
                />
              </div>
              <button 
                onClick={handleUpload} 
                disabled={loading || !file} 
                className="upload-btn"
                style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" x2="16.65" y1="21" y2="16.65"/><polyline points="11 8 11 11 14 11"/></svg>
                <span>{loading ? "Processing..." : "Match Jobs"}</span>
              </button>
            </div>
            {error && <p className="error margin-top">{error}</p>}
          </section>

          {loading && <div className="loading-state card">Analyzing profile and performing semantic search...</div>}

          {/* Results section */}
          {result && !loading && (
            <>
              {/* Profile Card */}
              <section className="card animate-fade">
                <h2>Parsed Profile</h2>
                <div className="profile-details">
                  <p><strong>Name:</strong> {result.profile.name || "—"}</p>
                  <p><strong>Target Role:</strong> {result.profile.target_role || "—"}</p>
                  <p><strong>Email:</strong> {result.profile.email || "—"}</p>
                  <p><strong>Skills:</strong> {result.profile.skills?.join(", ") || "—"}</p>
                  {result.profile.summary && (
                    <p><strong>Summary:</strong> {result.profile.summary}</p>
                  )}
                </div>
              </section>

              {/* Job Matches Card */}
              <section id="matched-vacancies-card" className="card animate-fade">
                <h2>Matched Vacancies</h2>
                <p className="muted text-sm margin-bottom">Select a vacancy to generate targeted CV optimization tips.</p>
                <div className="job-list">
                  {result.matches.map((job) => (
                    <article key={job.job_id} className={`job-item ${selectedJobId === job.job_id ? "selected" : ""}`}>
                      <div className="job-header">
                        <span className="rank">#{job.rank}</span>
                        <h3>{job.title}</h3>
                        <span className="score">{job.match_score}%</span>
                      </div>
                      <p className="muted text-xs">
                        {job.experience_level} · {job.years_of_experience} yrs
                      </p>
                      <p className="skills-preview text-xs">{job.keywords}</p>
                      <button
                        className="secondary text-xs full-width margin-top"
                        onClick={() => handleGenerateSuggestions(job.job_id)}
                        disabled={suggestionLoading && selectedJobId !== job.job_id}
                      >
                        {selectedJobId === job.job_id && suggestionLoading ? "Generating Suggestions..." : "Improve CV for this Job"}
                      </button>
                    </article>
                  ))}
                </div>
              </section>

              {/* Suggestions Card */}
              {suggestions && (
                <section id="cv-suggestions-section" className="card suggestions-display animate-fade">
                  <h2>CV Improvement Suggestions</h2>
                  <div className="suggestion-block">
                    <h3>Summary Rewrite</h3>
                    <p className="text-sm">{suggestions.summary_rewrite}</p>
                  </div>
                  <div className="suggestion-block">
                    <h3>Missing Skills</h3>
                    <p className="text-sm">
                      {suggestions.missing_skills?.length ? suggestions.missing_skills.join(", ") : "No missing skills."}
                    </p>
                  </div>
                  <div className="suggestion-block">
                    <h3>Bullet Improvements</h3>
                    <div className="bullet-list">
                      {suggestions.bullet_improvements?.map((bullet, idx) => (
                        <div key={idx} className="bullet-item">
                          <p className="text-sm"><strong>Original:</strong> <span className="text-red">{bullet.original}</span></p>
                          <p className="text-sm"><strong>Improved:</strong> <span className="text-green">{bullet.improved}</span></p>
                          <p className="muted text-xs italic">{bullet.rationale}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="suggestion-block">
                    <h3>ATS Tips</h3>
                    <ul className="ats-tips-list">
                      {suggestions.ats_tips?.map((tip, idx) => (
                        <li key={idx} className="text-sm">{tip}</li>
                      ))}
                    </ul>
                  </div>
                </section>
              )}
            </>
          )}
        </div>

        {/* Right column (1/3): Recent Profiles */}
        <div className="dashboard-sidebar" style={{ display: "flex", flexDirection: "column", height: "100%" }}>
          <section className="card history-card" style={{ display: "flex", flexDirection: "column", height: "100%", margin: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.25rem" }}>
              <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700 }}>Recent Profiles</h3>
              <Link to="/settings" style={{ fontSize: "0.8rem", color: "var(--primary-hover)", textDecoration: "none" }}>View all &gt;</Link>
            </div>
            <p className="muted text-xs" style={{ marginBottom: "1.25rem" }}>Load matches from previously parsed resumes.</p>
            
            <div className="saved-resumes-list" style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {savedResumes.map((res) => {
                const dateFormatted = res.created_at ? formatDate(res.created_at) : "24 Jul 2025";
                const parsedFileName = res.file_path.split("/").pop()?.split("\\").pop() || "shivam_resume.pdf";
                return (
                  <div
                    key={res.id}
                    className="saved-resume-item"
                    onClick={() => handleSelectSavedResume(res)}
                    style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem", cursor: "pointer" }}
                  >
                    {/* Red PDF Document Icon */}
                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
                    <div className="resume-meta" style={{ flex: 1, minWidth: 0 }}>
                      <span className="resume-name" style={{ display: "block", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>{parsedFileName}</span>
                      <span className="resume-role text-xs" style={{ fontSize: "0.72rem" }}>Parsed on {dateFormatted} • 1.8 MB</span>
                    </div>
                    <button 
                      type="button" 
                      style={{ background: "none", border: "none", boxShadow: "none", padding: "0.25rem", color: "var(--text-muted)", cursor: "pointer" }}
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                    >
                      ⋮
                    </button>
                  </div>
                );
              })}
              {savedResumes.length === 0 && (
                <p className="muted text-sm text-center margin-top">No parsed profiles found.</p>
              )}
            </div>
            
            <button 
              type="button" 
              className="secondary" 
              onClick={() => document.getElementById("file-upload-input")?.click()}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", marginTop: "1.25rem", fontSize: "0.85rem" }}
            >
              <UploadIcon />
              Upload New CV
            </button>
          </section>
        </div>
      </div>

      {/* Bottom Section (Activity Log & Score Distribution Donut Chart) matching Image 1 */}
      <div className="dashboard-grid animate-fade" style={{ gridTemplateColumns: "1fr 1fr", marginTop: "1.5rem" }}>
        {/* Recent Activity Card */}
        <section className="card" style={{ margin: 0 }}>
          <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "1.25rem" }}>Recent Activity</h3>
          <div className="activity-list">
            {activityLogs.map((log) => {
              let iconClass = "blue";
              let iconSvg = <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>;

              if (log.type === "match") {
                iconClass = "green";
                iconSvg = <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
              } else if (log.type === "shortlist") {
                iconClass = "yellow";
                iconSvg = <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>;
              }

              return (
                <div key={log.id} className="activity-item">
                  <div className={`activity-icon-wrapper ${iconClass}`}>
                    {iconSvg}
                  </div>
                  <div className="activity-details">
                    <h4 className="activity-header-text">{log.title}</h4>
                    <p className="activity-sub-text">{log.subtext}</p>
                  </div>
                  <span className="activity-time">{getRelativeTime(log.timestamp)}</span>
                </div>
              );
            })}
            {activityLogs.length === 0 && (
              <p className="muted text-sm text-center">No recent activities.</p>
            )}
          </div>
          <button 
            type="button" 
            onClick={() => setShowActivityModal(true)} 
            className="card-footer-link" 
            style={{ fontSize: "0.82rem", background: "none", border: "none", padding: 0, cursor: "pointer", boxShadow: "none" }}
          >
            View All Activity &gt;
          </button>
        </section>

        {/* Match Score Distribution Card */}
        <section className="card" style={{ margin: 0, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "0.75rem" }}>Match Score Distribution</h3>
          <div className="distribution-container">
            
            {/* Conic Gradient Donut Chart */}
            <div className="donut-chart" style={donutStyle}>
              <div className="donut-inner">
                <div className="total-val">{totalCount}</div>
                <div className="total-lbl">Total Matches</div>
              </div>
            </div>

            {/* Legend matching Image 1 */}
            <div className="donut-legend">
              <div className="legend-item">
                <div className="legend-label-group">
                  <div className="legend-dot green" />
                  <span className="legend-name">80 - 100%</span>
                </div>
                <div className="legend-values">
                  <span className="legend-count">{gCount}</span>
                  <span className="legend-percent">({gPct}%)</span>
                </div>
              </div>

              <div className="legend-item">
                <div className="legend-label-group">
                  <div className="legend-dot blue" />
                  <span className="legend-name">60 - 80%</span>
                </div>
                <div className="legend-values">
                  <span className="legend-count">{bCount}</span>
                  <span className="legend-percent">({bPct}%)</span>
                </div>
              </div>

              <div className="legend-item">
                <div className="legend-label-group">
                  <div className="legend-dot orange" />
                  <span className="legend-name">40 - 60%</span>
                </div>
                <div className="legend-values">
                  <span className="legend-count">{oCount}</span>
                  <span className="legend-percent">({oPct}%)</span>
                </div>
              </div>

              <div className="legend-item">
                <div className="legend-label-group">
                  <div className="legend-dot red" />
                  <span className="legend-name">0 - 40%</span>
                </div>
                <div className="legend-values">
                  <span className="legend-count">{rCount}</span>
                  <span className="legend-percent">({rPct}%)</span>
                </div>
              </div>
            </div>
          </div>
          <button 
            type="button" 
            onClick={handleViewAllMatches} 
            className="card-footer-link" 
            style={{ fontSize: "0.82rem", background: "none", border: "none", padding: 0, cursor: "pointer", boxShadow: "none" }}
          >
            View All Matches &gt;
          </button>
        </section>
      </div>

      {showActivityModal && (
        <div className="drawer-overlay" onClick={() => setShowActivityModal(false)} style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
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
              <h2 style={{ fontSize: "1.4rem", fontWeight: 700 }}>Activity History</h2>
              <button className="close-btn" onClick={() => setShowActivityModal(false)}>×</button>
            </div>
            <div className="drawer-body" style={{ overflowY: "auto", paddingRight: "0.5rem" }}>
              <div className="activity-list">
                {activityLogs.map((log) => {
                  let iconClass = "blue";
                  let iconSvg = <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>;

                  if (log.type === "match") {
                    iconClass = "green";
                    iconSvg = <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
                  } else if (log.type === "shortlist") {
                    iconClass = "yellow";
                    iconSvg = <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>;
                  }

                  return (
                    <div key={log.id} className="activity-item" style={{ borderBottom: "1px solid var(--item-border)", paddingBottom: "0.75rem" }}>
                      <div className={`activity-icon-wrapper ${iconClass}`}>
                        {iconSvg}
                      </div>
                      <div className="activity-details">
                        <h4 className="activity-header-text" style={{ fontSize: "0.92rem" }}>{log.title}</h4>
                        <p className="activity-sub-text" style={{ fontSize: "0.82rem" }}>{log.subtext}</p>
                      </div>
                      <span className="activity-time">{getRelativeTime(log.timestamp)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
