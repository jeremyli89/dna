import { useState, useEffect } from "react";
import type { User } from "../types";
import { api } from "../api/client";

interface AuthState {
  user: User | null;
  loading: boolean;
}

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({ user: null, loading: true });

  useEffect(() => {
    const token = localStorage.getItem("spotify_dna_token");
    if (!token) {
      setState({ user: null, loading: false });
      return;
    }

    const cached = localStorage.getItem("spotify_dna_user");
    if (cached) {
      try {
        setState({ user: JSON.parse(cached), loading: false });
        return;
      } catch {
        // fall through
      }
    }

    api.auth
      .me()
      .then((user) => {
        localStorage.setItem("spotify_dna_user", JSON.stringify(user));
        setState({ user, loading: false });
      })
      .catch(() => {
        localStorage.removeItem("spotify_dna_token");
        localStorage.removeItem("spotify_dna_user");
        setState({ user: null, loading: false });
      });
  }, []);

  return state;
}

export function logout() {
  localStorage.removeItem("spotify_dna_token");
  localStorage.removeItem("spotify_dna_user");
  window.location.href = "/";
}
