import { useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import { FullPageLoader } from "../components/LoadingSpinner";

export function Callback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const called = useRef(false);

  useEffect(() => {
    if (called.current) return;
    called.current = true;

    const code = params.get("code");
    const state = params.get("state");
    const error = params.get("error");

    if (error || !code) {
      navigate("/", { replace: true });
      return;
    }

    const savedState = sessionStorage.getItem("oauth_state");
    if (savedState && state && savedState !== state) {
      navigate("/", { replace: true });
      return;
    }

    api.auth
      .callback(code, state || undefined)
      .then(({ access_token, user }) => {
        localStorage.setItem("spotify_dna_token", access_token);
        localStorage.setItem("spotify_dna_user", JSON.stringify(user));
        sessionStorage.removeItem("oauth_state");
        navigate("/dashboard", { replace: true });
      })
      .catch(() => navigate("/", { replace: true }));
  }, []);

  return <FullPageLoader />;
}
