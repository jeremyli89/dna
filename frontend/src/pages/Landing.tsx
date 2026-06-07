import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";

const FEATURES = [
  {
    emoji: "🧬",
    title: "Music DNA",
    desc: "Six personality dimensions derived from your full listening history.",
  },
  {
    emoji: "📈",
    title: "Evolution Over Time",
    desc: "Watch how your taste evolves week by week over years.",
  },
  {
    emoji: "🎭",
    title: "Personality Eras",
    desc: "Discover the distinct musical phases of your life.",
  },
  {
    emoji: "✨",
    title: "AI Insights",
    desc: "Natural language summaries of your listening patterns.",
  },
];

const DIMENSIONS = [
  { label: "Explorer", value: 78, color: "#1db954" },
  { label: "Loyalist", value: 54, color: "#f59e0b" },
  { label: "Adventurous", value: 91, color: "#a855f7" },
  { label: "Nostalgic", value: 42, color: "#ec4899" },
  { label: "Mainstream", value: 33, color: "#3b82f6" },
  { label: "Night Owl", value: 61, color: "#6366f1" },
];

export function Landing() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("spotify_dna_token")) {
      navigate("/dashboard", { replace: true });
    }
  }, [navigate]);

  const handleLogin = async () => {
    setLoading(true);
    try {
      const { url, state } = await api.auth.getLoginUrl();
      sessionStorage.setItem("oauth_state", state);
      window.location.href = url;
    } catch {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dna-bg overflow-hidden">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 h-96 w-96 rounded-full bg-dna-accent/5 blur-3xl" />
        <div className="absolute top-1/4 right-1/4 h-96 w-96 rounded-full bg-dna-purple/5 blur-3xl" />
        <div className="absolute bottom-1/4 left-1/3 h-64 w-64 rounded-full bg-blue-500/5 blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative border-b border-dna-border/50 px-6 py-4">
        <div className="mx-auto max-w-6xl flex items-center justify-between">
          <span className="text-lg font-black tracking-tight text-gradient">
            SPOTIFY DNA
          </span>
          <button
            onClick={handleLogin}
            disabled={loading}
            className="btn-primary text-sm"
          >
            {loading ? "Connecting…" : "Sign in with Spotify"}
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative px-6 pt-24 pb-20 text-center">
        <div className="mx-auto max-w-3xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-dna-border bg-dna-surface px-4 py-1.5 text-xs text-dna-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-dna-accent animate-pulse" />
            Powered by 5 years of listening data
          </div>

          <h1 className="text-5xl sm:text-7xl font-black tracking-tighter mb-6 leading-[0.9]">
            Your music
            <br />
            <span className="text-gradient">has a DNA.</span>
          </h1>

          <p className="text-lg text-dna-muted max-w-xl mx-auto mb-10 leading-relaxed">
            Spotify DNA transforms your listening history into a living personality
            profile — six dimensions, evolving over time, uniquely yours.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={handleLogin}
              disabled={loading}
              className="btn-primary text-base px-8 py-4 glow-green"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/30 border-t-black" />
                  Connecting…
                </span>
              ) : (
                "Analyze My Listening →"
              )}
            </button>
            <p className="text-xs text-dna-muted">
              Free · No card required · Spotify account needed
            </p>
          </div>
        </div>
      </section>

      {/* Live preview of dimensions */}
      <section className="relative px-6 pb-20">
        <div className="mx-auto max-w-2xl">
          <div className="card glow-green">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="label">Sample Profile</p>
                <p className="text-xs text-dna-muted mt-0.5">Explorer · High Adventurous</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-dna-muted">DNA ID</p>
                <p className="font-mono font-bold text-gradient text-xl">3F-A2-E9</p>
              </div>
            </div>
            <div className="space-y-3">
              {DIMENSIONS.map((d) => (
                <div key={d.label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-white font-medium">{d.label}</span>
                    <span className="text-xs font-mono font-bold" style={{ color: d.color }}>
                      {d.value}
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-dna-border overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-1000"
                      style={{
                        width: `${d.value}%`,
                        background: `linear-gradient(90deg, ${d.color}66, ${d.color})`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features grid */}
      <section className="px-6 pb-24">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-center text-2xl font-bold mb-10">
            Built for music obsessives.
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {FEATURES.map((f) => (
              <div key={f.title} className="card-hover">
                <span className="text-3xl mb-3 block">{f.emoji}</span>
                <h3 className="text-base font-semibold text-white mb-1">{f.title}</h3>
                <p className="text-sm text-dna-muted leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-dna-border px-6 py-8 text-center">
        <p className="text-xs text-dna-muted">
          Spotify DNA is not affiliated with Spotify AB. Built with love for music nerds.
        </p>
      </footer>
    </div>
  );
}
