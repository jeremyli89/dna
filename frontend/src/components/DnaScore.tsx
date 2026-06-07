import type { DnaScore as DnaScoreType } from "../types";

interface Props {
  score: DnaScoreType;
}

export function DnaScoreCard({ score }: Props) {
  return (
    <div className="card relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute -top-8 -right-8 h-32 w-32 rounded-full bg-dna-accent/5 blur-2xl" />
      <div className="absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-dna-purple/5 blur-2xl" />

      <div className="relative">
        <p className="label mb-4">Your DNA Profile</p>

        {/* DNA ID */}
        <div className="mb-6">
          <p className="text-xs text-dna-muted mb-1">DNA ID</p>
          <p className="text-4xl font-black font-mono tracking-widest text-gradient">
            {score.dna_id}
          </p>
        </div>

        {/* Similarity */}
        {score.similarity_to_last_month !== null && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-dna-muted">Identity similarity vs. 3 months ago</p>
              <span className="text-sm font-bold text-white">
                {score.similarity_to_last_month.toFixed(1)}%
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-dna-border overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${score.similarity_to_last_month}%`,
                  background: "linear-gradient(90deg, #1db954, #a855f7)",
                }}
              />
            </div>
            <p className="mt-2 text-xs text-dna-muted">
              {score.similarity_to_last_month > 85
                ? "Your music identity is highly stable."
                : score.similarity_to_last_month > 65
                ? "You're evolving your taste gradually."
                : "Your listening identity has shifted significantly."}
            </p>
          </div>
        )}

        {/* Trait mini-bars */}
        <div className="grid grid-cols-3 gap-2">
          {Object.entries(score.trait_vector).map(([key, val]) => (
            <div key={key} className="bg-dna-surface rounded-lg p-2 text-center">
              <p className="text-xs text-dna-muted capitalize">{key.replace("_", " ")}</p>
              <p className="text-sm font-bold font-mono text-white mt-0.5">{val.toFixed(0)}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
