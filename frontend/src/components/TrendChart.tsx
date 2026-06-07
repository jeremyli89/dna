import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { WeeklySnapshot } from "../types";
import { DIMENSION_META } from "../types";
import type { DimensionKey } from "../types";

interface Props {
  snapshots: WeeklySnapshot[];
}

const DIMENSION_KEYS: DimensionKey[] = [
  "explorer",
  "loyalist",
  "adventurous",
  "nostalgic",
  "mainstream",
  "night_owl",
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-dna-card border border-dna-border rounded-xl p-3 text-xs shadow-xl min-w-[160px]">
      <p className="text-dna-muted mb-2">{label}</p>
      {payload.map((entry: any) => (
        <div key={entry.dataKey} className="flex justify-between gap-4">
          <span style={{ color: entry.color }}>{entry.name}</span>
          <span className="font-mono text-white">{entry.value?.toFixed(1) ?? "—"}</span>
        </div>
      ))}
    </div>
  );
};

export function TrendChart({ snapshots }: Props) {
  const [active, setActive] = useState<Set<DimensionKey>>(
    new Set(["explorer", "adventurous", "nostalgic"])
  );

  const data = snapshots.map((s) => ({
    date: new Date(s.week_start).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    explorer: s.explorer_score,
    loyalist: s.loyalist_score,
    adventurous: s.adventurous_score,
    nostalgic: s.nostalgic_score,
    mainstream: s.mainstream_score,
    night_owl: s.night_owl_score,
  }));

  const toggle = (key: DimensionKey) => {
    setActive((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        if (next.size > 1) next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  return (
    <div className="space-y-4">
      {/* Dimension toggles */}
      <div className="flex flex-wrap gap-2">
        {DIMENSION_KEYS.map((key) => {
          const meta = DIMENSION_META[key];
          const on = active.has(key);
          return (
            <button
              key={key}
              onClick={() => toggle(key)}
              className={`dimension-badge transition-all ${
                on
                  ? "text-white border"
                  : "text-dna-muted border border-dna-border bg-transparent"
              }`}
              style={
                on
                  ? { borderColor: meta.color, backgroundColor: `${meta.color}22` }
                  : {}
              }
            >
              {meta.emoji} {meta.label}
            </button>
          );
        })}
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
          <CartesianGrid stroke="#1f1f1f" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fill: "#71717a", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fill: "#71717a", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          {DIMENSION_KEYS.filter((k) => active.has(k)).map((key) => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              name={DIMENSION_META[key].label}
              stroke={DIMENSION_META[key].color}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 5, strokeWidth: 0 }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function StreamCountChart({ snapshots }: Props) {
  const data = snapshots.map((s) => ({
    date: new Date(s.week_start).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    streams: s.stream_count ?? 0,
    artists: s.unique_artists ?? 0,
  }));

  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
        <CartesianGrid stroke="#1f1f1f" strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fill: "#71717a", fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
        />
        <YAxis tick={{ fill: "#71717a", fontSize: 11 }} tickLine={false} axisLine={false} />
        <Tooltip content={<CustomTooltip />} />
        <Line
          type="monotone"
          dataKey="streams"
          name="Streams"
          stroke="#1db954"
          strokeWidth={2}
          dot={false}
          connectNulls
        />
        <Line
          type="monotone"
          dataKey="artists"
          name="Artists"
          stroke="#a855f7"
          strokeWidth={2}
          dot={false}
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
