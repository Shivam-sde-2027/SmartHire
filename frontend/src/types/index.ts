export interface Education {
  degree?: string | null;
  institute?: string | null;
  year?: string | null;
  score?: string | null;
}

export interface Experience {
  company?: string | null;
  role?: string | null;
  duration?: string | null;
  highlights: string[];
}

export interface Project {
  name?: string | null;
  description?: string | null;
  tech_stack: string[];
}

export interface ResumeProfile {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  linkedin_url?: string | null;
  education: Education[];
  skills: string[];
  experience: Experience[];
  projects: Project[];
  total_experience_years?: number | null;
  summary?: string | null;
  target_role?: string | null;
}

export interface JobMatch {
  rank: number;
  job_id: string;
  title: string;
  experience_level: string;
  years_of_experience: string;
  skills: string;
  responsibilities: string;
  keywords: string;
  match_score: number;
}

export interface UploadMatchResult {
  id: string;
  profile: ResumeProfile;
  profile_text: string;
  matches: JobMatch[];
  top_k: number;
}

export interface CVSuggestionBullet {
  original: string;
  improved: string;
  rationale: string;
}

export interface CVSuggestionsResponse {
  missing_skills: string[];
  bullet_improvements: CVSuggestionBullet[];
  summary_rewrite: string;
  ats_tips: string[];
}
