import type {
  User,
  PersonalityDimensions,
  WeeklySnapshot,
  DnaScore,
  Insight,
  IngestStatus,
} from "../types";

const BASE_URL = import.meta.env.VITE_API_URL || "";

function getToken(): string | null {
  return localStorage.getItem("spotify_dna_token");
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options.body instanceof FormData
      ? {}
      : { "Content-Type": "application/json" }),
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (res.status === 401) {
    localStorage.removeItem("spotify_dna_token");
    localStorage.removeItem("spotify_dna_user");
    window.location.href = "/";
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    const body = await res.text();
    throw new Error(body || `HTTP ${res.status}`);
  }

  return res.json() as Promise<T>;
}

async function uploadFile(path: string, file: File): Promise<unknown> {
  const token = getToken();
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(body || `HTTP ${res.status}`);
  }

  return res.json();
}

export const api = {
  auth: {
    getLoginUrl: () => request<{ url: string; state: string }>("/auth/login"),
    callback: (code: string, state?: string) =>
      request<{ access_token: string; user: User }>(
        `/auth/callback?code=${encodeURIComponent(code)}${state ? `&state=${encodeURIComponent(state)}` : ""}`
      ),
    me: () => request<User>("/profile/me"),
  },

  personality: {
    current: () => request<PersonalityDimensions>("/personality/current"),
    trend: (months = 12) =>
      request<WeeklySnapshot[]>(`/personality/trend?months=${months}`),
    dnaScore: () => request<DnaScore>("/personality/dna-score"),
    recompute: () => request<{ snapshots_computed: number }>("/personality/recompute", { method: "POST" }),
  },

  ingest: {
    uploadHistory: (file: File) => uploadFile("/ingest/history", file),
    poll: () => request<{ new_tracks: number; fetched: number }>("/ingest/poll", { method: "POST" }),
    status: () => request<IngestStatus>("/ingest/status"),
    computeSnapshots: () =>
      request<{ snapshots_computed: number }>("/ingest/compute-snapshots", { method: "POST" }),
  },

  insights: {
    weekly: () => request<Insight[]>("/insights/weekly"),
    generate: () => request<Insight>("/insights/generate", { method: "POST" }),
  },
};
