import { useEffect, useState, useMemo } from "react";
import { getJobs } from "../lib/api";

interface Job {
  job_id: string;
  title: string;
  experience_level: string;
  years_of_experience: string;
  skills: string;
  responsibilities: string;
  keywords: string;
}

// Icons
const BookmarkIconOutline = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>
);

const BookmarkIconSolid = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>
);

const SearchIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" x2="16.65" y1="21" y2="16.65"/></svg>
);

const getCompanyDomain = (company: string) => {
  const domains: { [key: string]: string } = {
    "Microsoft": "microsoft.com",
    "Tata Consultancy Services": "tcs.com",
    "Infosys": "infosys.com",
    "Wipro": "wipro.com",
    "Accenture": "accenture.com",
    "Google": "google.com",
    "Amazon": "amazon.com",
    "Cognizant": "cognizant.com",
    "Capgemini": "capgemini.com",
    "Tech Mahindra": "techmahindra.com"
  };
  return domains[company] || "briefcase.com";
};

const getLogoUrl = (company: string) => {
  const domain = getCompanyDomain(company);
  if (domain === "briefcase.com") {
    return "";
  }
  return `https://logo.clearbit.com/${domain}`;
};

const CompanyLogo = ({ company }: { company: string }) => {
  const [imgError, setImgError] = useState(false);
  const logoUrl = getLogoUrl(company);

  if (imgError || !logoUrl) {
    return (
      <div className="company-badge-placeholder">
        {company ? company.charAt(0) : "J"}
      </div>
    );
  }

  return (
    <div style={{ width: "44px", height: "44px", borderRadius: "8px", overflow: "hidden", background: "#fff", padding: "4px", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid var(--sidebar-border)", flexShrink: 0 }}>
      <img 
        src={logoUrl} 
        alt={`${company} Logo`} 
        onError={() => setImgError(true)} 
        style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
      />
    </div>
  );
};

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  // Filter States
  const [q, setQ] = useState("");
  const [experienceLevel, setExperienceLevel] = useState("All");
  const [jobTypeFilter, setJobTypeFilter] = useState("All");
  const [locationFilter, setLocationFilter] = useState("All");
  const [sortBy, setSortBy] = useState("Relevance");
  const [showSavedOnly, setShowSavedOnly] = useState(false);
  const [savedJobs, setSavedJobs] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [showSkillsModal, setShowSkillsModal] = useState(false);

  // Load jobs and bookmarks
  useEffect(() => {
    fetchJobs();
    const saved = localStorage.getItem("saved_jobs");
    if (saved) {
      setSavedJobs(JSON.parse(saved));
    }
  }, []);

  const fetchJobs = async () => {
    setLoading(true);
    setError("");
    try {
      // Fetch up to 500 jobs at once for fast client-side searching
      const data = await getJobs(undefined, undefined, 1, 500);
      setJobs(data.jobs || []);
    } catch (err) {
      setError("Failed to load jobs directory.");
    } finally {
      setLoading(false);
    }
  };

  // Deterministic metadata generator based on JobID hash
  const getDeterministicMeta = (jobId: string | null | undefined) => {
    const idStr = String(jobId || "");
    let hash = 0;
    for (let i = 0; i < idStr.length; i++) {
      hash = idStr.charCodeAt(i) + ((hash << 5) - hash);
    }
    hash = Math.abs(hash);

    const companies = ["Microsoft", "Tata Consultancy Services", "Infosys", "Wipro", "Accenture", "Google", "Amazon", "Cognizant", "Capgemini", "Tech Mahindra"];
    const locations = ["Bengaluru, India", "Pune, India", "Hyderabad, India", "Chennai, India", "Noida, India", "Remote"];
    const jobTypes = ["Full-time", "Full-time", "Contract", "Part-time"];
    const daysAgo = ["1 day ago", "2 days ago", "3 days ago", "4 days ago", "5 days ago", "6 days ago", "1 week ago", "2 weeks ago"];

    const company = companies[hash % companies.length];
    const location = locations[(hash >> 2) % locations.length];
    const jobType = jobTypes[(hash >> 4) % jobTypes.length];
    const days = daysAgo[(hash >> 6) % daysAgo.length];

    return { company, location, jobType, days, hash };
  };

  // Toggle bookmarked jobs
  const toggleSaveJob = (jobId: string) => {
    const updated = savedJobs.includes(jobId)
      ? savedJobs.filter((id) => id !== jobId)
      : [...savedJobs, jobId];
    setSavedJobs(updated);
    localStorage.setItem("saved_jobs", JSON.stringify(updated));
  };

  // Tag triggers
  const handleTagClick = (tag: string) => {
    setQ(tag);
    setPage(1);
  };

  // Clear filters
  const handleClearFilters = () => {
    setQ("");
    setExperienceLevel("All");
    setJobTypeFilter("All");
    setLocationFilter("All");
    setSortBy("Relevance");
    setShowSavedOnly(false);
    setPage(1);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
  };

  // Real-time client side filtering
  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      if (!job) return false;
      const { company, location, jobType } = getDeterministicMeta(job.job_id);

      // Search Query Text Filter
      if (q) {
        const qLower = q.toLowerCase();
        const titleText = String(job.title || "").toLowerCase();
        const skillsText = String(job.skills || "").toLowerCase();
        const keywordsText = String(job.keywords || "").toLowerCase();
        const companyText = String(company || "").toLowerCase();
        const locationText = String(location || "").toLowerCase();

        const matchesQuery =
          titleText.includes(qLower) ||
          skillsText.includes(qLower) ||
          keywordsText.includes(qLower) ||
          companyText.includes(qLower) ||
          locationText.includes(qLower);
        if (!matchesQuery) return false;
      }

      // Experience Level Filter
      if (experienceLevel && experienceLevel !== "All") {
        if (job.experience_level.toLowerCase() !== experienceLevel.toLowerCase()) {
          return false;
        }
      }

      // Job Type Filter
      if (jobTypeFilter && jobTypeFilter !== "All") {
        if (jobType.toLowerCase() !== jobTypeFilter.toLowerCase()) {
          return false;
        }
      }

      // Location Filter
      if (locationFilter && locationFilter !== "All") {
        if (!location.toLowerCase().includes(locationFilter.toLowerCase())) {
          return false;
        }
      }

      // Saved Opportunities Only Filter
      if (showSavedOnly) {
        if (!savedJobs.includes(job.job_id)) {
          return false;
        }
      }

      return true;
    });
  }, [jobs, q, experienceLevel, jobTypeFilter, locationFilter, showSavedOnly, savedJobs]);

  // Real-time Sorting
  const sortedJobs = useMemo(() => {
    const list = [...filteredJobs];
    if (sortBy === "Alphabetical") {
      list.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortBy === "Highest Exp") {
      list.sort((a, b) => parseInt(b.years_of_experience) - parseInt(a.years_of_experience));
    } else if (sortBy === "Lowest Exp") {
      list.sort((a, b) => parseInt(a.years_of_experience) - parseInt(b.years_of_experience));
    }
    return list;
  }, [filteredJobs, sortBy]);

  // Pagination bounds
  const paginatedJobs = useMemo(() => {
    const start = (page - 1) * 10;
    return sortedJobs.slice(start, start + 10);
  }, [sortedJobs, page]);

  // Calculate dynamic Job Insights from active list
  const totalJobsCount = filteredJobs.length;
  
  const newThisWeekCount = useMemo(() => {
    return filteredJobs.filter((job) => {
      const { hash } = getDeterministicMeta(job.job_id);
      // Let's assume recent posts correspond to first 4 indexes of daysAgo array
      return (hash >> 6) % 8 < 4;
    }).length;
  }, [filteredJobs]);

  const companiesHiringCount = useMemo(() => {
    const uniqueCos = new Set(filteredJobs.map((j) => getDeterministicMeta(j.job_id).company));
    return uniqueCos.size;
  }, [filteredJobs]);

  // Calculate dynamic Top Skills in Demand from matching jobs keywords/skills
  const skillsList = useMemo(() => {
    const skillCounts: { [key: string]: number } = {};
    
    // Parse from filtered list
    filteredJobs.forEach((job) => {
      if (!job) return;
      const parts = (job.keywords || "").split(",").concat((job.skills || "").split(","));
      parts.forEach((s) => {
        const cleaned = s.trim();
        if (cleaned && cleaned.length > 1) {
          skillCounts[cleaned] = (skillCounts[cleaned] || 0) + 1;
        }
      });
    });

    const sorted = Object.entries(skillCounts)
      .sort((a, b) => b[1] - a[1]);

    const maxCount = sorted[0]?.[1] || 1;

    // Take top 5
    return sorted.slice(0, 5).map(([name, count]) => {
      // scale percentage between 35% and 95%
      const pct = Math.round(35 + (count / maxCount) * 60);
      return { name, pct };
    });
  }, [filteredJobs]);

  // Calculate all skills list for full modal view
  const allSkillsList = useMemo(() => {
    const skillCounts: { [key: string]: number } = {};
    filteredJobs.forEach((job) => {
      if (!job) return;
      const parts = (job.keywords || "").split(",").concat((job.skills || "").split(","));
      parts.forEach((s) => {
        const cleaned = s.trim();
        if (cleaned && cleaned.length > 1) {
          skillCounts[cleaned] = (skillCounts[cleaned] || 0) + 1;
        }
      });
    });

    return Object.entries(skillCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));
  }, [filteredJobs]);

  return (
    <div className="page animate-fade" style={{ padding: "1.5rem" }}>
      
      {/* Header section matching mockup */}
      <div className="welcome-section animate-fade" style={{ marginBottom: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="welcome-title-wrapper">
          <h1 style={{ fontSize: "2.1rem", margin: 0, fontWeight: 700, color: "var(--text-heading)" }}>Jobs Directory</h1>
          <p className="muted" style={{ margin: "0.25rem 0 0 0", fontSize: "0.95rem" }}>Explore opportunities matching your professional goals.</p>
        </div>
        <button 
          type="button" 
          className={`header-action-btn ${showSavedOnly ? 'active' : ''}`}
          onClick={() => {
            setShowSavedOnly(!showSavedOnly);
            setPage(1);
          }}
          style={{ 
            display: "flex", 
            alignItems: "center", 
            gap: "0.5rem", 
            background: showSavedOnly ? "var(--primary)" : "var(--btn-secondary-bg)", 
            border: "1px solid var(--sidebar-border)" 
          }}
        >
          <BookmarkIconSolid />
          <span>{showSavedOnly ? "Showing Saved" : `Saved Jobs (${savedJobs.length})`}</span>
        </button>
      </div>

      {/* Search and Filters Block */}
      <section className="card animate-fade" style={{ marginBottom: "1.5rem" }}>
        <form onSubmit={handleSearchSubmit} style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginBottom: "1rem" }}>
          
          {/* Search box */}
          <div style={{ flex: 1, minWidth: "260px", position: "relative" }}>
            <span style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", display: "flex", alignItems: "center" }}>
              <SearchIcon />
            </span>
            <input
              type="text"
              placeholder="Search job title, skills, company..."
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              style={{ paddingLeft: "2.5rem" }}
            />
          </div>

          {/* Select filters */}
          <div style={{ width: "160px" }}>
            <select value={experienceLevel} onChange={(e) => { setExperienceLevel(e.target.value); setPage(1); }}>
              <option value="All">Experience Level</option>
              <option value="entry">Entry-level</option>
              <option value="mid">Mid-level</option>
              <option value="senior">Senior-level</option>
            </select>
          </div>

          <div style={{ width: "140px" }}>
            <select value={jobTypeFilter} onChange={(e) => { setJobTypeFilter(e.target.value); setPage(1); }}>
              <option value="All">Job Type</option>
              <option value="Full-time">Full-time</option>
              <option value="Part-time">Part-time</option>
              <option value="Contract">Contract</option>
              <option value="Internship">Internship</option>
            </select>
          </div>

          <div style={{ width: "140px" }}>
            <select value={locationFilter} onChange={(e) => { setLocationFilter(e.target.value); setPage(1); }}>
              <option value="All">Location</option>
              <option value="Bengaluru">Bengaluru</option>
              <option value="Pune">Pune</option>
              <option value="Hyderabad">Hyderabad</option>
              <option value="Chennai">Chennai</option>
              <option value="Noida">Noida</option>
              <option value="Remote">Remote</option>
            </select>
          </div>

          <button type="submit" className="upload-btn" style={{ padding: "0 1.5rem" }}>
            Search
          </button>
        </form>

        {/* Popular Tags Row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.85rem", color: "var(--text-muted)", flexWrap: "wrap", gap: "0.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
            <span style={{ fontWeight: 500 }}>Popular:</span>
            {["NET", "React", "Java", "Python", "SQL", "AI / ML", "DevOps"].map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => handleTagClick(tag)}
                className="compact-tag-btn"
                style={{
                  background: "var(--btn-secondary-bg)",
                  border: "1px solid var(--sidebar-border)",
                  borderRadius: "20px",
                  padding: "0.2rem 0.75rem",
                  fontSize: "0.8rem",
                  color: "var(--text-main)",
                  cursor: "pointer"
                }}
              >
                .{tag}
              </button>
            ))}
          </div>

          <button 
            type="button" 
            onClick={handleClearFilters}
            style={{ background: "none", border: "none", color: "var(--primary-hover)", cursor: "pointer", fontSize: "0.82rem", padding: 0 }}
          >
            Clear Filters
          </button>
        </div>
      </section>

      {error && <p className="error margin-bottom">{error}</p>}

      {/* Main split grid */}
      <div className="dashboard-grid" style={{ gridTemplateColumns: "1.8fr 1fr", gap: "1.5rem" }}>
        
        {/* Left Column: Job Cards List */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          
          {/* Result Stats header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.9rem", color: "var(--text-muted)" }}>
              Showing {filteredJobs.length} jobs
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Sort by:</span>
              <select 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value)}
                style={{ width: "140px", padding: "0.3rem 0.5rem", fontSize: "0.85rem" }}
              >
                <option value="Relevance">Most Relevant</option>
                <option value="Alphabetical">Alphabetical</option>
                <option value="Highest Exp">Highest Exp</option>
                <option value="Lowest Exp">Lowest Exp</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="loading-state card">Loading jobs index...</div>
          ) : paginatedJobs.length > 0 ? (
            <div className="job-list animate-fade" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {paginatedJobs.map((job) => {
                const { company, location, jobType, days } = getDeterministicMeta(job.job_id);
                const isSaved = savedJobs.includes(job.job_id);

                return (
                  <article 
                    key={job.job_id} 
                    className="job-item clickable" 
                    onClick={() => setSelectedJob(job)}
                    style={{ 
                      display: "flex", 
                      alignItems: "flex-start", 
                      gap: "1.25rem", 
                      padding: "1.25rem", 
                      background: "var(--card-bg)",
                      border: "1px solid var(--card-border)",
                      borderRadius: "16px",
                      position: "relative",
                      cursor: "pointer",
                      transition: "transform 0.2s"
                    }}
                  >
                    {/* Company Logo wrapper displaying Clearbit brand image with badge fallback */}
                    <CompanyLogo company={company} />

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem" }}>
                        <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "var(--text-heading)" }}>{job.title}</h3>
                        <span className="badge" style={{ background: "rgba(99, 102, 241, 0.12)", color: "var(--primary-hover)", border: "1px solid rgba(99, 102, 241, 0.2)", fontSize: "0.72rem", padding: "0.15rem 0.5rem", borderRadius: "12px", whiteSpace: "nowrap" }}>
                          {jobType}
                        </span>
                      </div>
                      
                      <div style={{ display: "flex", gap: "0.75rem", fontSize: "0.82rem", color: "var(--text-muted)", marginTop: "0.25rem", flexWrap: "wrap", alignItems: "center" }}>
                        <span style={{ fontWeight: 600, color: "var(--text-main)" }}>{company}</span>
                        <span>•</span>
                        <span>{location}</span>
                        <span>•</span>
                        <span>{job.experience_level} ({job.years_of_experience} yrs)</span>
                      </div>

                      <p className="skills-preview text-xs" style={{ marginTop: "0.75rem", color: "var(--text-muted)" }}>
                        {job.keywords}
                      </p>

                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.75rem", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                        <span>{days}</span>
                        <button
                          type="button"
                          className="bookmark-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSaveJob(job.job_id);
                          }}
                          style={{ background: "none", border: "none", padding: "0.25rem", cursor: "pointer", color: isSaved ? "var(--primary)" : "var(--text-muted)", display: "flex", alignItems: "center" }}
                        >
                          {isSaved ? <BookmarkIconSolid /> : <BookmarkIconOutline />}
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="card text-center" style={{ padding: "3rem" }}>
              <p className="muted" style={{ margin: 0 }}>No jobs found matching your filters.</p>
            </div>
          )}

          {/* Pagination controls */}
          {sortedJobs.length > 10 && (
            <div className="pagination animate-fade">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="secondary"
              >
                Previous
              </button>
              <span className="pagination-info">
                Page {page} of {Math.ceil(sortedJobs.length / 10)}
              </span>
              <button
                disabled={page * 10 >= sortedJobs.length}
                onClick={() => setPage((p) => p + 1)}
                className="secondary"
              >
                Next
              </button>
            </div>
          )}
        </div>

        {/* Right Column: Sidebar */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          
          {/* Card 1: Job Insights */}
          <section className="card animate-fade" style={{ margin: 0 }}>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="18" y1="20" y2="10"/><line x1="12" x2="12" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="14"/></svg>
              <span>Job Insights</span>
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--item-border)", paddingBottom: "0.75rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
                  <span style={{ fontSize: "0.88rem", color: "var(--text-main)" }}>Total Jobs</span>
                </div>
                <span style={{ fontWeight: 700, fontSize: "1.05rem", color: "var(--text-heading)" }}>{totalJobsCount}</span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--item-border)", paddingBottom: "0.75rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  <span style={{ fontSize: "0.88rem", color: "var(--text-main)" }}>New this week</span>
                </div>
                <span style={{ fontWeight: 700, fontSize: "1.05rem", color: "var(--text-heading)" }}>{newThisWeekCount}</span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--item-border)", paddingBottom: "0.75rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 18h12"/><path d="M6 14h12"/><path d="M6 10h12"/><path d="M6 6h12"/></svg>
                  <span style={{ fontSize: "0.88rem", color: "var(--text-main)" }}>Companies hiring</span>
                </div>
                <span style={{ fontWeight: 700, fontSize: "1.05rem", color: "var(--text-heading)" }}>{companiesHiringCount}</span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>
                  <span style={{ fontSize: "0.88rem", color: "var(--text-main)" }}>Saved Jobs</span>
                </div>
                <span style={{ fontWeight: 700, fontSize: "1.05rem", color: "var(--text-heading)" }}>{savedJobs.length}</span>
              </div>
            </div>
          </section>

          {/* Card 2: Top Skills in Demand */}
          <section className="card animate-fade" style={{ margin: 0 }}>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              <span>Top Skills in Demand</span>
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem", marginBottom: "1.25rem" }}>
              {skillsList.map((skill, idx) => (
                <div key={idx} style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", fontWeight: 600 }}>
                    <span style={{ color: "var(--text-main)" }}>{skill.name}</span>
                    <span style={{ color: "var(--text-heading)" }}>{skill.pct}%</span>
                  </div>
                  <div style={{ height: "6px", background: "rgba(255,255,255,0.06)", borderRadius: "4px", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${skill.pct}%`, background: "var(--primary)", borderRadius: "4px" }} />
                  </div>
                </div>
              ))}
              {skillsList.length === 0 && (
                <p className="muted text-sm text-center">No skills data available.</p>
              )}
            </div>

            <button 
              type="button" 
              className="secondary full-width"
              onClick={() => setShowSkillsModal(true)}
              style={{ fontSize: "0.82rem", display: "flex", justifyContent: "center", alignItems: "center" }}
            >
              View All Skills
            </button>
          </section>
        </div>
      </div>

      {/* Slide-over Job Detail Drawer */}
      {selectedJob && (
        <div className="drawer-overlay" onClick={() => setSelectedJob(null)}>
          <div className="drawer-content animate-fade" onClick={(e) => e.stopPropagation()}>
            <header className="drawer-header">
              <h2 style={{ fontSize: "1.4rem", fontWeight: 700, color: "var(--text-heading)" }}>{selectedJob.title}</h2>
              <button className="close-btn" onClick={() => setSelectedJob(null)}>&times;</button>
            </header>
            <div className="drawer-body">
              <p className="badge-row" style={{ display: "flex", gap: "0.5rem", marginBottom: "1.25rem" }}>
                <span className="badge" style={{ background: "rgba(99, 102, 241, 0.12)", color: "var(--primary-hover)" }}>{selectedJob.experience_level}</span>
                <span className="badge" style={{ background: "rgba(56, 189, 248, 0.12)", color: "var(--accent)" }}>{selectedJob.years_of_experience} Years Exp</span>
              </p>
              
              <div className="drawer-section">
                <h4>Required Skills</h4>
                <p className="text-sm" style={{ color: "var(--text-main)" }}>{selectedJob.skills}</p>
              </div>

              <div className="drawer-section">
                <h4>Responsibilities</h4>
                <p className="text-sm text-block" style={{ color: "var(--text-main)", whiteSpace: "pre-line" }}>{selectedJob.responsibilities}</p>
              </div>

              <div className="drawer-section">
                <h4>Keywords</h4>
                <p className="text-sm italic" style={{ color: "var(--text-muted)" }}>{selectedJob.keywords}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View All Skills Modal */}
      {showSkillsModal && (
        <div className="drawer-overlay" onClick={() => setShowSkillsModal(false)} style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
          <div 
            className="drawer-content animate-fade" 
            onClick={(e) => e.stopPropagation()} 
            style={{ 
              width: "min(500px, 95%)", 
              height: "min(600px, 90%)", 
              borderRadius: "16px", 
              borderLeft: "none",
              border: "1px solid var(--sidebar-border)",
              boxShadow: "0 10px 40px rgba(0, 0, 0, 0.4)",
              position: "relative"
            }}
          >
            <div className="drawer-header" style={{ marginBottom: "1.5rem" }}>
              <h2 style={{ fontSize: "1.4rem", fontWeight: 700, color: "var(--text-heading)" }}>Skills in Demand</h2>
              <button className="close-btn" onClick={() => setShowSkillsModal(false)}>×</button>
            </div>
            <div className="drawer-body" style={{ overflowY: "auto", paddingRight: "0.5rem" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {allSkillsList.map((skill, idx) => (
                  <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--item-border)", paddingBottom: "0.5rem" }}>
                    <span style={{ fontWeight: 600, color: "var(--text-heading)", fontSize: "0.9rem" }}>{skill.name}</span>
                    <span className="badge" style={{ background: "rgba(99, 102, 241, 0.12)", color: "var(--primary-hover)", fontSize: "0.75rem" }}>{skill.count} jobs</span>
                  </div>
                ))}
                {allSkillsList.length === 0 && (
                  <p className="muted text-sm text-center">No skills detected.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
