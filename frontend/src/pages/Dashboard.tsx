import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Navbar } from "../components/Navbar";
import { DnaRadarChart, DimensionBars } from "../components/DnaRadarChart";
import { TrendChart, StreamCountChart } from "../components/TrendChart";
import { InsightList } from "../components/InsightCard";
import { DnaScoreCard } from "../components/DnaScore";
import { SkeletonCard, LoadingSpinner } from "../components/LoadingSpinner";
import { useAuth } from "../hooks/useAuth";
import { usePersonality } from "../hooks/usePersonality";
import { useInsights } from "../hooks/useInsights";
import { useAutoPoller } from "../hooks/useAutoPoller";
import { api } from "../api/client";
import type { IngestStatus } from "../types";

export function Dashboard() {
  const { user } = useAuth();
  const { dimensions, trend, dnaScore, loading, error, refetch } = usePersonality();
  const { insights, generating, generate } = useInsights();
  const [status, setStatus] = useState<IngestStatus | null>(null);
  const [recomputing, setRecomputing] = useState(false);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);

  useAutoPoller((newTracks) => {
    setLastSynced(new Date());
    setStatus((s) => s ? { ...s, api_streams: s.api_streams + newTracks, total_streams: s.total_streams + newTracks } : s);
  });

  useEffect(() => {
    api.ingest.status().then(setStatus).catch(() => {});
  }, []);

  const recompute = async () => {
    setRecomputing(true);
    try {
      await api.personality.recompute();
      refetch();
    } finally {
      setRecomputing(false);
    }
  };

  const isEmpty = status && status.total_streams === 0;

  return (
    <div className="min-h-screen bg-dna-bg">
      <Navbar user={user} />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Empty state */}
        {isEmpty && (
          <div className="text-center py-24">
            <p className="text-5xl mb-4">🧬</p>
            <h2 className="text-2xl font-bold mb-3">No data yet</h2>
            <p className="text-dna-muted mb-6 max-w-md mx-auto">
              Import your Spotify Extended Streaming History to generate your music
              DNA profile.
            </p>
            <Link to="/import" className="btn-primary">
              Import History →
            </Link>
          </div>
        )}

        {!isEmpty && (
          <>
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-2xl font-bold">
                  {user?.display_name
                    ? `${user.display_name.split(" ")[0]}'s DNA`
                    : "Your Music DNA"}
                </h1>
                {status && (
                  <p className="text-sm text-dna-muted mt-1">
                    {status.total_streams.toLocaleString()} streams ·{" "}
                    {status.oldest_stream
                      ? new Date(status.oldest_stream).getFullYear()
                      : "—"}
                    {" — "}
                    {status.newest_stream
                      ? new Date(status.newest_stream).toLocaleDateString("en-US", { month: "short", year: "numeric" })
                      : "—"}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                {lastSynced && (
                  <span className="text-xs text-dna-muted self-center">
                    synced {lastSynced.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                )}
                {status && status.unenriched > 0 && (
                  <span className="text-xs text-dna-muted self-center">
                    {status.unenriched} enriching…
                  </span>
                )}
                <button
                  onClick={recompute}
                  disabled={recomputing}
                  className="btn-secondary text-sm"
                >
                  {recomputing ? (
                    <span className="flex items-center gap-2">
                      <LoadingSpinner size="sm" />
                      Recomputing…
                    </span>
                  ) : (
                    "Recompute"
                  )}
                </button>
                <Link to="/import" className="btn-primary text-sm">
                  + Import
                </Link>
              </div>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : error ? (
              <div className="card border-red-500/30 text-center py-12">
                <p className="text-red-400 mb-3">{error}</p>
                <button onClick={refetch} className="btn-secondary">Retry</button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Top row: DNA score + radar */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {dnaScore && (
                    <div className="lg:col-span-1">
                      <DnaScoreCard score={dnaScore} />
                    </div>
                  )}
                  {dimensions && (
                    <div className="lg:col-span-2 card">
                      <div className="flex items-center justify-between mb-4">
                        <p className="label">Personality Radar</p>
                        <p className="text-xs text-dna-muted">Last 90 days</p>
                      </div>
                      <DnaRadarChart dimensions={dimensions} />
                    </div>
                  )}
                </div>

                {/* Dimensions breakdown */}
                {dimensions && (
                  <div className="card">
                    <p className="label mb-6">Dimension Breakdown</p>
                    <DimensionBars dimensions={dimensions} />
                  </div>
                )}

                {/* Trend charts */}
                {trend.length > 0 && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="card">
                      <div className="flex items-center justify-between mb-4">
                        <p className="label">Personality Trend</p>
                        <p className="text-xs text-dna-muted">{trend.length} weeks</p>
                      </div>
                      <TrendChart snapshots={trend} />
                    </div>
                    <div className="card">
                      <p className="label mb-4">Listening Volume</p>
                      <StreamCountChart snapshots={trend} />
                    </div>
                  </div>
                )}

                {/* Insights + Era placeholder */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2">
                    <InsightList
                      insights={insights}
                      generating={generating}
                      onGenerate={generate}
                    />
                  </div>
                  <div className="card text-center py-10 flex flex-col items-center justify-center gap-3">
                    <p className="text-3xl">🕰️</p>
                    <p className="font-semibold text-sm">Music Era Detection</p>
                    <p className="text-xs text-dna-muted max-w-[180px] leading-relaxed">
                      Automatically clusters your listening history into distinct
                      musical eras. Coming in Phase 2.
                    </p>
                    <span className="dimension-badge border border-dna-border text-dna-muted text-xs">
                      Phase 2
                    </span>
                  </div>
                </div>

                {/* Stats bar */}
                {status && (
                  <div className="card">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                      <StatItem
                        label="Total Streams"
                        value={status.total_streams.toLocaleString()}
                        color="#1db954"
                      />
                      <StatItem
                        label="From History"
                        value={status.history_streams.toLocaleString()}
                        color="#a855f7"
                      />
                      <StatItem
                        label="Via API"
                        value={status.api_streams.toLocaleString()}
                        color="#3b82f6"
                      />
                      <StatItem
                        label="Trend Weeks"
                        value={trend.length.toString()}
                        color="#f59e0b"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function StatItem({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div>
      <p className="label mb-1">{label}</p>
      <p className="stat-number" style={{ color }}>
        {value}
      </p>
    </div>
  );
}
