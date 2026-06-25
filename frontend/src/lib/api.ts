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
  const headers = await authHeaders();
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
