import type { Insight } from "../types";

interface Props {
  insight: Insight;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  return `${weeks}w ago`;
}

const typeConfig = {
  weekly: { label: "Weekly", color: "#1db954", bg: "rgba(29,185,84,0.08)" },
  drift: { label: "Drift", color: "#a855f7", bg: "rgba(168,85,247,0.08)" },
  era: { label: "Era", color: "#3b82f6", bg: "rgba(59,130,246,0.08)" },
};

export function InsightCard({ insight }: Props) {
  const config = typeConfig[insight.insight_type as keyof typeof typeConfig] ?? typeConfig.weekly;

  return (
    <div
      className="card-hover group"
      style={{ background: config.bg, borderColor: `${config.color}22` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span
              className="dimension-badge text-xs"
              style={{ color: config.color, background: `${config.color}22`, border: `1px solid ${config.color}44` }}
            >
              {config.label}
            </span>
            <span className="text-xs text-dna-muted">{timeAgo(insight.generated_at)}</span>
          </div>
          <p className="text-sm text-white leading-relaxed">{insight.content}</p>
        </div>
        <div className="text-xl shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
          ✨
        </div>
      </div>
    </div>
  );
}

export function InsightList({
  insights,
  generating,
  onGenerate,
}: {
  insights: Insight[];
  generating: boolean;
  onGenerate: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-dna-muted uppercase tracking-wider">Insights</h3>
        <button
          onClick={onGenerate}
          disabled={generating}
          className="text-xs text-dna-accent hover:text-white transition-colors disabled:opacity-50"
        >
          {generating ? "Generating…" : "+ Generate"}
        </button>
      </div>
      {insights.length === 0 ? (
        <div className="card text-center py-8">
          <p className="text-dna-muted text-sm">No insights yet.</p>
          <button
            onClick={onGenerate}
            disabled={generating}
            className="mt-3 btn-primary text-sm"
          >
            {generating ? "Generating…" : "Generate First Insight"}
          </button>
        </div>
      ) : (
        insights.slice(0, 6).map((i) => <InsightCard key={i.id} insight={i} />)
      )}
    </div>
  );
}
