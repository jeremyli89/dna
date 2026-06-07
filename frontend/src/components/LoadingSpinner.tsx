export function LoadingSpinner({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const s = size === "sm" ? "h-4 w-4" : size === "lg" ? "h-12 w-12" : "h-8 w-8";
  return (
    <div className={`${s} animate-spin rounded-full border-2 border-dna-border border-t-dna-accent`} />
  );
}

export function SkeletonCard() {
  return (
    <div className="card">
      <div className="space-y-3">
        <div className="h-4 w-1/3 rounded bg-shimmer" />
        <div className="h-8 w-1/2 rounded bg-shimmer" />
        <div className="h-4 w-full rounded bg-shimmer" />
        <div className="h-4 w-2/3 rounded bg-shimmer" />
      </div>
    </div>
  );
}

export function FullPageLoader() {
  return (
    <div className="min-h-screen bg-dna-bg flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-2 border-dna-border border-t-dna-accent" />
        <p className="text-dna-muted text-sm">Loading your DNA…</p>
      </div>
    </div>
  );
}
