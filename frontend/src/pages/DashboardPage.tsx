import { ChangeEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { uploadAndMatch, generateCVSuggestions } from "../lib/api";
import type { CVSuggestionsResponse, UploadMatchResult } from "../types";

export default function DashboardPage() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [topK, setTopK] = useState(10);
  const [loading, setLoading] = useState(false);
  const [suggestionLoading, setSuggestionLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<UploadMatchResult | null>(null);
  const [suggestions, setSuggestions] = useState<CVSuggestionsResponse | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFile(e.target.files?.[0] ?? null);
    setError("");
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
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
      setSuggestions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate suggestions");
      setSuggestions(null);
    } finally {
      setSuggestionLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <div className="page">
      <header className="topbar">
        <h1>SmartHire Dashboard</h1>
        <button className="secondary" onClick={handleSignOut}>
          Sign Out
        </button>
      </header>

      <section className="card">
        <h2>Upload Resume</h2>
        <p className="muted">PDF or DOCX — parse your resume, shortlist top jobs, and generate personalized CV improvements.</p>
        <div className="row">
          <input type="file" accept=".pdf,.docx,.doc" onChange={onFileChange} />
          <input
            type="number"
            min={1}
            max={50}
            value={topK}
            onChange={(e) => setTopK(Number(e.target.value))}
            className="compact-input"
            aria-label="Top N jobs"
          />
          <button onClick={handleUpload} disabled={loading || !file}>
            {loading ? "Processing..." : "Parse & Match Jobs"}
          </button>
        </div>
        <p className="muted">Shortlist Top N jobs for matching: {topK}</p>
        {error && <p className="error">{error}</p>}
      </section>

      {result && (
        <>
          <section className="card">
            <h2>Parsed Profile</h2>
            <p>
              <strong>Name:</strong> {result.profile.name || "—"}
            </p>
            <p>
              <strong>Target Role:</strong> {result.profile.target_role || "—"}
            </p>
            <p>
              <strong>Email:</strong> {result.profile.email || "—"}
            </p>
            <p>
              <strong>Skills:</strong> {result.profile.skills.join(", ") || "—"}
            </p>
            {result.profile.summary && (
              <p>
                <strong>Summary:</strong> {result.profile.summary}
              </p>
            )}
          </section>

          <section className="card">
            <h2>Top Job Matches</h2>
            <p className="muted">Choose a matched job to generate targeted CV improvement suggestions.</p>
            <div className="job-list">
              {result.matches.map((job) => (
                <article key={job.job_id} className={`job-item ${selectedJobId === job.job_id ? "selected" : ""}`}>
                  <div className="job-header">
                    <span className="rank">#{job.rank}</span>
                    <h3>{job.title}</h3>
                    <span className="score">{job.match_score}%</span>
                  </div>
                  <p className="muted">
                    {job.experience_level} · {job.years_of_experience} yrs
                  </p>
                  <p className="skills-preview">{job.keywords}</p>
                  <button
                    className="secondary"
                    onClick={() => handleGenerateSuggestions(job.job_id)}
                    disabled={suggestionLoading && selectedJobId !== job.job_id}
                  >
                    {selectedJobId === job.job_id && suggestionLoading ? "Improving CV..." : "Improve CV for this job"}
                  </button>
                </article>
              ))}
            </div>
          </section>

          {suggestions && (
            <section className="card">
              <h2>CV Improvement Suggestions</h2>
              <p className="muted">Generated by Gemini based on the selected matched job.</p>

              <div className="suggestion-block">
                <h3>Summary Rewrite</h3>
                <p>{suggestions.summary_rewrite}</p>
              </div>

              <div className="suggestion-block">
                <h3>Missing Skills</h3>
                <p>{suggestions.missing_skills.length ? suggestions.missing_skills.join(", ") : "No missing skills identified."}</p>
              </div>

              <div className="suggestion-block">
                <h3>Bullet Improvements</h3>
                {suggestions.bullet_improvements.map((bullet, idx) => (
                  <div key={idx} className="bullet-item">
                    <p>
                      <strong>Original:</strong> {bullet.original}
                    </p>
                    <p>
                      <strong>Improved:</strong> {bullet.improved}
                    </p>
                    <p className="muted">{bullet.rationale}</p>
                  </div>
                ))}
              </div>

              <div className="suggestion-block">
                <h3>ATS Tips</h3>
                <ul>
                  {suggestions.ats_tips.map((tip, idx) => (
                    <li key={idx}>{tip}</li>
                  ))}
                </ul>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
