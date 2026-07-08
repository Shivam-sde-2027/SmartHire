import { supabase } from "./supabase";

const API_BASE = import.meta.env.VITE_API_BASE_URL as string;

async function authHeaders(): Promise<HeadersInit> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const headers: HeadersInit = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

export async function uploadAndMatch(file: File, topK = 10) {
  const form = new FormData();
  form.append("file", file);
  form.append("top_k", String(topK));

  const headers = await authHeaders();
  const res = await fetch(`${API_BASE}/resumes/upload-and-match`, {
    method: "POST",
    headers,
    body: form,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Upload failed");
  }

  return res.json();
}

export async function generateCVSuggestions(resumeId: string, jobId: string) {
  const headers = await authHeaders() as Record<string, string>;
  headers["Content-Type"] = "application/json";

  const res = await fetch(`${API_BASE}/suggestions/generate`, {
    method: "POST",
    headers,
    body: JSON.stringify({ resume_id: resumeId, job_id: jobId }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to generate CV suggestions");
  }

  return res.json();
}

export async function checkHealth() {
  const res = await fetch(`${API_BASE.replace("/api", "")}/health`);
  return res.json();
}

export async function getJobs(q?: string, experienceLevel?: string, page = 1, limit = 10) {
  const headers = await authHeaders();
  const params = new URLSearchParams();
  if (q) params.append("q", q);
  if (experienceLevel) params.append("experience_level", experienceLevel);
  params.append("page", String(page));
  params.append("limit", String(limit));

  const res = await fetch(`${API_BASE}/jobs?${params.toString()}`, { headers });
  if (!res.ok) throw new Error("Failed to fetch jobs");
  return res.json();
}

export async function getResumes() {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE}/resumes`, { headers });
  if (!res.ok) throw new Error("Failed to fetch resumes");
  return res.json();
}

export async function getSuggestions() {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE}/suggestions`, { headers });
  if (!res.ok) throw new Error("Failed to fetch CV suggestions");
  return res.json();
}

export async function getSuggestion(id: string) {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE}/suggestions/${id}`, { headers });
  if (!res.ok) throw new Error("Failed to fetch suggestion details");
  return res.json();
}

export async function getMentorSessions() {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE}/mentor/sessions`, { headers });
  if (!res.ok) throw new Error("Failed to fetch chat sessions");
  return res.json();
}

export async function getSessionMessages(sessionId: string) {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE}/mentor/sessions/${sessionId}/messages`, { headers });
  if (!res.ok) throw new Error("Failed to fetch chat messages");
  return res.json();
}

export async function streamMentorChat(
  query: string,
  sessionId: string | null,
  resumeId: string | null,
  onMessage: (text: string) => void,
  onCitation: (citations: any[]) => void,
  onSessionMetadata: (sessionId: string, title: string) => void,
  onError: (error: string) => void
) {
  try {
    const headers = await authHeaders() as Record<string, string>;
    headers["Content-Type"] = "application/json";

    const res = await fetch(`${API_BASE}/mentor/chat`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        query,
        session_id: sessionId || undefined,
        resume_id: resumeId || undefined,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Chat request failed");
    }

    const reader = res.body?.getReader();
    if (!reader) {
      throw new Error("No response body stream available.");
    }

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const rawData = line.substring(6).trim();
          if (!rawData) continue;
          try {
            const parsed = JSON.parse(rawData);
            if (parsed.type === "session_metadata") {
              onSessionMetadata(parsed.session_id, parsed.title);
            } else if (parsed.type === "citations") {
              onCitation(parsed.citations);
            } else if (parsed.type === "content") {
              onMessage(parsed.text);
            } else if (parsed.type === "error") {
              onError(parsed.text);
            }
          } catch (e) {
            console.error("SSE JSON parsing error:", e);
          }
        }
      }
    }
  } catch (err) {
    onError(err instanceof Error ? err.message : "Network error");
  }
}

export async function matchFromProfile(profile: any, topK = 10) {
  const headers = await authHeaders() as Record<string, string>;
  headers["Content-Type"] = "application/json";

  const res = await fetch(`${API_BASE}/resumes/match`, {
    method: "POST",
    headers,
    body: JSON.stringify({ profile, top_k: topK }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Job matching failed");
  }

  return res.json();
}
