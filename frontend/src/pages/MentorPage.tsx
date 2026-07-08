import { useEffect, useRef, useState } from "react";
import { getMentorSessions, getSessionMessages, getResumes, streamMentorChat } from "../lib/api";

interface Session {
  id: string;
  title: string;
  created_at: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: any[];
  created_at?: string;
  isStreaming?: boolean;
}

interface ResumeOption {
  id: string;
  file_path: string;
  profile: {
    name?: string;
    target_role?: string;
  };
}

export default function MentorPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [resumes, setResumes] = useState<ResumeOption[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState<string>("");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [resumeDropdownOpen, setResumeDropdownOpen] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showSessionsModal, setShowSessionsModal] = useState(false);

  // Load initial data
  useEffect(() => {
    loadSessions();
    loadResumes();
  }, []);

  // Scroll to bottom on message updates
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadSessions = async () => {
    try {
      const data = await getMentorSessions();
      setSessions(data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadResumes = async () => {
    try {
      const data = await getResumes();
      setResumes(data);
      if (data.length > 0) {
        setSelectedResumeId(data[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const selectSession = async (sessionId: string) => {
    setActiveSessionId(sessionId);
    setLoading(true);
    setError("");
    try {
      const msgs = await getSessionMessages(sessionId);
      setMessages(msgs);
    } catch (err) {
      setError("Failed to load conversation history.");
    } finally {
      setLoading(false);
    }
  };

  const startNewSession = () => {
    setActiveSessionId(null);
    setMessages([]);
    setError("");
    setInput("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    const userQuery = input;
    setInput("");
    await sendQueryDirect(userQuery);
  };

  const sendQueryDirect = async (queryText: string) => {
    if (loading) return;
    setError("");
    setLoading(true);

    // Append user message immediately
    const userMsgId = Math.random().toString();
    setMessages((prev) => [
      ...prev,
      { id: userMsgId, role: "user", content: queryText },
    ]);

    // Append assistant placeholder
    const assistantMsgId = Math.random().toString();
    setMessages((prev) => [
      ...prev,
      { id: assistantMsgId, role: "assistant", content: "", isStreaming: true, citations: [] },
    ]);

    let streamedText = "";
    let messageCitations: any[] = [];

    await streamMentorChat(
      queryText,
      activeSessionId,
      selectedResumeId || null,
      (textChunk) => {
        streamedText += textChunk;
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMsgId ? { ...msg, content: streamedText } : msg
          )
        );
      },
      (citations) => {
        messageCitations = citations;
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMsgId ? { ...msg, citations: messageCitations } : msg
          )
        );
      },
      (newSessionId, title) => {
        setActiveSessionId(newSessionId);
        setSessions((prev) => [
          { id: newSessionId, title, created_at: new Date().toISOString() },
          ...prev,
        ]);
      },
      (errMessage) => {
        setError(errMessage);
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMsgId ? { ...msg, content: errMessage, isStreaming: false } : msg
          )
        );
        setLoading(false);
      }
    );

    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === assistantMsgId ? { ...msg, isStreaming: false } : msg
      )
    );
    setLoading(false);
    loadSessions();
  };

  const handleClearAllSessions = () => {
    setSessions([]);
    localStorage.removeItem("activity_logs"); // clear log entries for clean UI
    startNewSession();
  };

  const getDiscussionRelativeTime = (isoStr: string) => {
    try {
      let cleanStr = isoStr;
      if (cleanStr) {
        cleanStr = cleanStr.replace(" ", "T");
        if (!cleanStr.endsWith("Z") && !cleanStr.includes("+")) {
          cleanStr += "Z";
        }
      }
      const diffMs = Date.now() - new Date(cleanStr).getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins} ${diffMins === 1 ? "minute" : "minutes"} ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? "hour" : "hours"} ago`;
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays} ${diffDays === 1 ? "day" : "days"} ago`;
    } catch (e) {
      return "1 day ago";
    }
  };

  const activeResume = resumes.find((r) => r.id === selectedResumeId);

  return (
    <div className="mentor-layout" style={{ display: "grid", gridTemplateColumns: "1fr 3fr", gap: "1.5rem", minHeight: "calc(100vh - 7rem)" }}>
      
      {/* Sidebar - Sessions List */}
      <aside className="mentor-sidebar card" style={{ display: "flex", flexDirection: "column", height: "100%", margin: 0, position: "relative" }}>
        
        {/* Sparkle New Chat Button matching mockup */}
        <button 
          className="primary full-width" 
          onClick={startNewSession}
          style={{ 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center", 
            gap: "0.5rem", 
            background: "linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)",
            boxShadow: "0 4px 16px 0 rgba(99, 102, 241, 0.35)",
            padding: "0.75rem 1rem",
            borderRadius: "10px",
            border: "none",
            color: "#fff",
            fontWeight: 700,
            cursor: "pointer",
            marginBottom: "1.5rem"
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
          <span>New Career Chat</span>
        </button>

        {/* Personalize with Resume Container */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1.5rem", position: "relative" }}>
          <label style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-muted)", display: "block" }}>Personalize with Resume</label>
          
          <div 
            onClick={() => setResumeDropdownOpen(!resumeDropdownOpen)}
            style={{
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid var(--sidebar-border)",
              borderRadius: "12px",
              padding: "0.75rem",
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              cursor: "pointer",
              transition: "all 0.2s"
            }}
          >
            {/* Red PDF Document Icon */}
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
            
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: "block", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", fontSize: "0.85rem", fontWeight: 600, color: "var(--text-heading)" }}>
                {activeResume ? activeResume.file_path.split("/").pop()?.split("\\").pop() : "No Resume Selected"}
              </span>
              <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", display: "block", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                {activeResume?.profile?.name ? `(${activeResume.profile.name.toUpperCase()})` : "General Career Advice"}
              </span>
            </div>

            <div style={{ transform: resumeDropdownOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s", display: "flex", alignItems: "center", color: "var(--text-muted)" }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
            </div>
          </div>

          {/* Resume Selector Dropdown */}
          {resumeDropdownOpen && (
            <div 
              className="animate-fade" 
              style={{ 
                marginTop: "0.5rem", 
                maxHeight: "180px", 
                overflowY: "auto",
                background: "rgba(255, 255, 255, 0.03)",
                border: "1px solid var(--sidebar-border)",
                borderRadius: "12px",
                padding: "0.5rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.25rem"
              }}
            >
              <button
                type="button"
                className="profile-dropdown-item"
                onClick={() => {
                  setSelectedResumeId("");
                  setResumeDropdownOpen(false);
                }}
                style={{ fontWeight: !selectedResumeId ? "700" : "500", width: "100%", textAlign: "left", padding: "0.6rem 0.8rem", background: "none", border: "none", color: "var(--text-main)", cursor: "pointer" }}
              >
                No Resume (General Advice)
              </button>
              {resumes.map((r) => {
                const filename = r.file_path.split("/").pop()?.split("\\").pop() || "resume.pdf";
                return (
                  <button
                    key={r.id}
                    type="button"
                    className="profile-dropdown-item"
                    onClick={() => {
                      setSelectedResumeId(r.id);
                      setResumeDropdownOpen(false);
                    }}
                    style={{ fontWeight: selectedResumeId === r.id ? "700" : "500", width: "100%", textAlign: "left", padding: "0.6rem 0.8rem", background: "none", border: "none", color: "var(--text-main)", cursor: "pointer" }}
                  >
                    {filename}
                  </button>
                );
              })}
            </div>
          )}

          {/* Resume Uploaded green badge */}
          {activeResume && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.78rem", color: "#10b981", fontWeight: 600 }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              <span>Resume uploaded</span>
            </div>
          )}
        </div>

        {/* Recent Discussions List */}
        <div className="session-list" style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
            <h3 style={{ margin: 0, fontSize: "0.85rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>Recent Discussions</h3>
            <button 
              type="button" 
              onClick={handleClearAllSessions} 
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: "0.25rem", display: "flex", alignItems: "center" }}
              title="Clear all discussions"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
            </button>
          </div>

          <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {sessions.map((sess) => (
              <button
                key={sess.id}
                className={`session-item ${activeSessionId === sess.id ? "active" : ""}`}
                onClick={() => selectSession(sess.id)}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "0.75rem",
                  width: "100%",
                  textAlign: "left",
                  padding: "0.75rem",
                  background: activeSessionId === sess.id ? "var(--nav-link-hover-bg)" : "none",
                  border: activeSessionId === sess.id ? "1px solid var(--nav-link-hover-border)" : "1px solid transparent",
                  borderRadius: "8px",
                  cursor: "pointer",
                  color: activeSessionId === sess.id ? "var(--text-heading)" : "var(--text-main)",
                  transition: "background 0.2s"
                }}
              >
                {/* Speech Bubble Icon */}
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: "2px", color: "var(--text-muted)" }}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span className="session-title" style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {sess.title}
                  </span>
                  <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                    {getDiscussionRelativeTime(sess.created_at)}
                  </span>
                </div>
              </button>
            ))}
            {sessions.length === 0 && <p className="muted text-sm text-center">No recent chats.</p>}
          </div>

          <button 
            type="button" 
            onClick={() => setShowSessionsModal(true)} 
            className="card-footer-link" 
            style={{ fontSize: "0.82rem", display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", background: "none", border: "none", padding: "0.25rem 0", cursor: "pointer", textDecoration: "none", boxShadow: "none" }}
          >
            <span>View All Chats</span>
            <span>&gt;</span>
          </button>
        </div>
      </aside>

      {/* Main chat window */}
      <section className="mentor-chat-area card" style={{ display: "flex", flexDirection: "column", height: "100%", margin: 0, padding: 0, position: "relative", overflow: "visible" }}>
        
        {/* Floating circular New Chat shortcut button */}
        <button
          type="button"
          onClick={startNewSession}
          style={{
            position: "absolute",
            right: "-20px",
            top: "50%",
            transform: "translateY(-50%)",
            width: "48px",
            height: "48px",
            borderRadius: "50%",
            background: "linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)",
            border: "1px solid var(--sidebar-border)",
            boxShadow: "0 8px 32px 0 rgba(99, 102, 241, 0.4)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            zIndex: 100,
            color: "#fff"
          }}
          title="Start new conversation"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: "1px" }}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
          <span style={{ fontSize: "0.5rem", fontWeight: 700, lineHeight: 1 }}>New Chat</span>
        </button>

        <header className="chat-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1.25rem", borderBottom: "1px solid var(--sidebar-border)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "rgba(99, 102, 241, 0.15)", border: "1px solid rgba(99, 102, 241, 0.3)", display: "grid", placeItems: "center", color: "var(--primary-hover)" }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/><path d="M12 8V4"/></svg>
            </div>
            <div>
              <h2 style={{ fontSize: "1.1rem", margin: 0, fontWeight: 700, color: "var(--text-heading)" }}>AI Career Mentor</h2>
              <p className="muted" style={{ margin: 0, fontSize: "0.75rem" }}>Your personal AI coach for career growth and success.</p>
            </div>
          </div>

          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button 
              type="button" 
              className="secondary" 
              style={{ display: "flex", alignItems: "center", gap: "0.35rem", padding: "0.4rem 0.8rem", fontSize: "0.78rem" }}
              onClick={() => setShowInfoModal(true)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
              <span>How it works</span>
            </button>
            <button 
              type="button" 
              className="secondary" 
              style={{ display: "flex", alignItems: "center", gap: "0.35rem", padding: "0.4rem 0.8rem", fontSize: "0.78rem" }}
              onClick={startNewSession}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
              <span>Clear Chat</span>
            </button>
          </div>
        </header>

        <div className="chat-messages-container" style={{ flex: 1, overflowY: "auto", padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1rem", background: "var(--chat-container-bg)" }}>
          
          {/* Welcome Screen matching mockup */}
          {messages.length === 0 && (
            <div className="chat-welcome animate-fade" style={{ maxWidth: "600px", margin: "2rem auto", textAlign: "center" }}>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: "1.5rem" }}>
                <div style={{
                  width: "72px",
                  height: "72px",
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 8px 32px 0 rgba(99, 102, 241, 0.25)"
                }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/><path d="M12 8V4"/></svg>
                </div>
              </div>

              <h2 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--text-heading)", margin: "0 0 0.5rem 0" }}>
                👋 Hi Shivam! I'm here to help you grow in your career.
              </h2>
              <p className="muted" style={{ fontSize: "0.9rem", margin: "0 0 1.5rem 0" }}>
                Ask me anything about career guidance, resume improvement, interviews, skills, and more.
              </p>

              {/* Recommendation Quick pills */}
              <div style={{ display: "flex", justifyContent: "center", gap: "0.5rem", flexWrap: "wrap", marginBottom: "2rem" }}>
                {[
                  { label: "Resume Review", prompt: "Can you analyze my resume and suggest bullet point and skills improvements?" },
                  { label: "Interview Preparation", prompt: "What are some highly recommended questions and strategies to prepare for developer interviews?" },
                  { label: "Career Transition", prompt: "I want to plan a transition in my tech career. How should I approach it?" },
                  { label: "Skill Recommendations", prompt: "What technical and system design skills should I learn for career advancement?" }
                ].map((pill, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleQuickQuery(pill.prompt)}
                    style={{
                      background: "rgba(255, 255, 255, 0.03)",
                      border: "1px solid var(--sidebar-border)",
                      borderRadius: "20px",
                      padding: "0.4rem 1rem",
                      fontSize: "0.82rem",
                      color: "var(--text-main)",
                      cursor: "pointer",
                      fontWeight: 500,
                      transition: "all 0.15s"
                    }}
                    className="compact-tag-btn"
                  >
                    {pill.label}
                  </button>
                ))}
              </div>

              {/* Try asking prompt rows matching mockup */}
              <div style={{ background: "rgba(255,255,255,0.01)", border: "1px solid var(--sidebar-border)", borderRadius: "12px", padding: "1rem", textAlign: "left" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem", fontSize: "0.85rem", fontWeight: 700, color: "var(--text-heading)" }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--primary-hover)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" x2="12" y1="17" y2="17"/></svg>
                  <span>Try asking something like:</span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                  {[
                    "How can I improve my backend engineering resume?",
                    "What are good questions to ask at the end of a software developer interview?",
                    "How do I transition from QA to Developer?",
                    "What skills should I learn for a Full Stack Developer role?"
                  ].map((queryText, idx) => (
                    <div 
                      key={idx}
                      onClick={() => handleQuickQuery(queryText)}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "0.6rem 0.75rem",
                        borderRadius: "8px",
                        cursor: "pointer",
                        fontSize: "0.85rem",
                        color: "var(--text-main)",
                        transition: "background 0.15s"
                      }}
                      className="saved-resume-item"
                    >
                      <span>"{queryText}"</span>
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" x2="19" y1="12" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Active Chat Message Bubbles */}
          {messages.map((msg) => (
            <div key={msg.id} className={`message-bubble ${msg.role} animate-fade`}>
              <div className="message-avatar" style={{ background: msg.role === "user" ? "rgba(56, 189, 248, 0.15)" : "rgba(99, 102, 241, 0.15)", borderColor: msg.role === "user" ? "rgba(56, 189, 248, 0.3)" : "rgba(99, 102, 241, 0.3)", color: msg.role === "user" ? "var(--accent)" : "var(--primary-hover)" }}>
                {msg.role === "user" ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/><path d="M12 8V4"/></svg>
                )}
              </div>
              <div className="message-content">
                <p className="text-block" style={{ fontSize: "0.9rem", lineHeight: 1.5, margin: 0 }}>{msg.content}</p>
                
                {/* Citations list */}
                {msg.citations && msg.citations.length > 0 && (
                  <div className="citations-container" style={{ marginTop: "0.75rem", borderTop: "1px solid var(--chat-container-border)", paddingTop: "0.5rem" }}>
                    <span className="citation-header" style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>Source Guides:</span>
                    <div className="citation-row" style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.25rem" }}>
                      {msg.citations.map((cite, index) => (
                        <div 
                          key={index} 
                          className="citation-card" 
                          title={cite.snippet}
                          style={{
                            background: "rgba(255, 255, 255, 0.03)",
                            border: "1px solid var(--sidebar-border)",
                            borderRadius: "6px",
                            padding: "0.25rem 0.5rem",
                            fontSize: "0.75rem",
                            color: "var(--text-main)",
                            cursor: "help",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.25rem"
                          }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
                          <span style={{ fontWeight: 500 }}>{cite.title}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && messages.length > 0 && messages[messages.length - 1].isStreaming && (
            <div className="typing-indicator" style={{ fontSize: "0.82rem", color: "var(--text-muted)", fontStyle: "italic", marginLeft: "3rem" }}>
              Mentor is typing recommendations...
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {error && <p className="error" style={{ margin: "0.5rem 1.25rem" }}>{error}</p>}

        <div style={{ padding: "1.25rem", borderTop: "1px solid var(--sidebar-border)", background: "var(--chat-container-bg)" }}>
          {/* Persistent query suggestion pills */}
          <div style={{ display: "flex", gap: "0.5rem", overflowX: "auto", paddingBottom: "0.75rem", marginBottom: "0.25rem" }}>
            {[
              { label: "Resume Review", prompt: "Can you analyze my resume and suggest bullet point and skills improvements?" },
              { label: "Interview Preparation", prompt: "What are some highly recommended questions and strategies to prepare for developer interviews?" },
              { label: "Career Transition", prompt: "I want to plan a transition in my tech career. How should I approach it?" },
              { label: "Skill Recommendations", prompt: "What technical and system design skills should I learn for career advancement?" }
            ].map((pill, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleQuickQuery(pill.prompt)}
                style={{
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid var(--sidebar-border)",
                  borderRadius: "20px",
                  padding: "0.35rem 0.85rem",
                  fontSize: "0.78rem",
                  color: "var(--text-main)",
                  cursor: "pointer",
                  fontWeight: 500,
                  whiteSpace: "nowrap",
                  transition: "all 0.15s"
                }}
                className="compact-tag-btn"
              >
                {pill.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="chat-input-bar">
            <input
              type="text"
              placeholder="Type your career question here..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
            />
            <button 
              type="submit" 
              disabled={loading || !input.trim()}
              style={{ display: "grid", placeItems: "center", width: "40px", height: "40px", borderRadius: "8px", background: "var(--primary)", border: "none", color: "#fff", cursor: "pointer" }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" x2="11" y1="2" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            </button>
          </form>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.5rem", fontSize: "0.75rem", color: "var(--text-muted)" }}>
            <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              <span>AI powered • Based on career best practices</span>
            </span>
          </div>
        </div>
      </section>
      
      {/* Disclaimer under card container */}
      <div style={{ gridColumn: "1 / -1", textAlign: "center", fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
        Important: AI responses are for guidance only. Please verify critical information.
      </div>

      {/* How It Works Informational Modal */}
      {showInfoModal && (
        <div className="drawer-overlay" onClick={() => setShowInfoModal(false)} style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
          <div 
            className="drawer-content animate-fade" 
            onClick={(e) => e.stopPropagation()} 
            style={{ 
              width: "min(500px, 95%)", 
              height: "min(400px, 90%)", 
              borderRadius: "16px", 
              borderLeft: "none",
              border: "1px solid var(--sidebar-border)",
              boxShadow: "0 10px 40px rgba(0, 0, 0, 0.4)",
              position: "relative"
            }}
          >
            <div className="drawer-header" style={{ marginBottom: "1.25rem" }}>
              <h2 style={{ fontSize: "1.3rem", fontWeight: 700, color: "var(--text-heading)" }}>AI Career Mentor - How It Works</h2>
              <button className="close-btn" onClick={() => setShowInfoModal(false)}>×</button>
            </div>
            <div className="drawer-body" style={{ overflowY: "auto", fontSize: "0.88rem", color: "var(--text-main)", display: "flex", flexDirection: "column", gap: "1rem" }}>
              <p>The AI Career Mentor acts as your professional growth coach, utilizing state-of-the-art semantic systems and grounding guidelines.</p>
              
              <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--item-border)", padding: "0.75rem 1rem", borderRadius: "8px" }}>
                <strong style={{ display: "block", color: "var(--primary-hover)", marginBottom: "0.25rem" }}>1. Resume Grounding</strong>
                <span>If a resume is selected, AI responses are customized using your experiences, keywords, and skill matches.</span>
              </div>

              <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--item-border)", padding: "0.75rem 1rem", borderRadius: "8px" }}>
                <strong style={{ display: "block", color: "var(--accent)", marginBottom: "0.25rem" }}>2. Local RAG Index</strong>
                <span>The mentor searches and retrieves references from official local career guides to formulate reliable suggestions.</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Conversations History List Modal */}
      {showSessionsModal && (
        <div className="drawer-overlay" onClick={() => setShowSessionsModal(false)} style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
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
              <h2 style={{ fontSize: "1.3rem", fontWeight: 700, color: "var(--text-heading)" }}>Conversation History</h2>
              <button className="close-btn" onClick={() => setShowSessionsModal(false)}>×</button>
            </div>
            <div className="drawer-body" style={{ overflowY: "auto", paddingRight: "0.25rem" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {sessions.map((sess) => (
                  <div 
                    key={sess.id} 
                    onClick={() => {
                      selectSession(sess.id);
                      setShowSessionsModal(false);
                    }}
                    className="saved-resume-item"
                    style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem", cursor: "pointer" }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--text-muted)", flexShrink: 0 }}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: "block", fontSize: "0.88rem", fontWeight: 600, color: "var(--text-heading)", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>{sess.title}</span>
                      <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Parsed {getDiscussionRelativeTime(sess.created_at)}</span>
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
    </div>
  );

  function handleQuickQuery(promptText: string) {
    sendQueryDirect(promptText);
  }
}
