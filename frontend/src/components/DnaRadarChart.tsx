import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { PersonalityDimensions } from "../types";
import { DIMENSION_META } from "../types";

interface Props {
  dimensions: PersonalityDimensions;
  animated?: boolean;
}

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="bg-dna-card border border-dna-border rounded-xl px-3 py-2 text-sm shadow-xl">
      <p className="font-semibold text-white">{d.payload.dimension}</p>
      <p className="text-dna-accent font-mono">{d.value.toFixed(1)}</p>
    </div>
  );
};

export function DnaRadarChart({ dimensions }: Props) {
  const data = [
    { dimension: "Explorer", value: dimensions.explorer, fullMark: 100 },
    { dimension: "Loyalist", value: dimensions.loyalist, fullMark: 100 },
    { dimension: "Adventurous", value: dimensions.adventurous, fullMark: 100 },
    { dimension: "Nostalgic", value: dimensions.nostalgic, fullMark: 100 },
    { dimension: "Mainstream", value: dimensions.mainstream, fullMark: 100 },
    { dimension: "Night Owl", value: dimensions.night_owl, fullMark: 100 },
  ];

  return (
    <ResponsiveContainer width="100%" height={340}>
      <RadarChart data={data} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
        <PolarGrid
          stroke="#222222"
          strokeWidth={1}
          gridType="polygon"
        />
        <PolarAngleAxis
          dataKey="dimension"
          tick={{ fill: "#71717a", fontSize: 12, fontWeight: 500 }}
          tickLine={false}
        />
        <PolarRadiusAxis
          angle={90}
          domain={[0, 100]}
          tick={{ fill: "#3f3f46", fontSize: 10 }}
          axisLine={false}
          tickCount={5}
        />
        <Radar
          name="You"
          dataKey="value"
          stroke="#1db954"
          fill="#1db954"
          fillOpacity={0.15}
          strokeWidth={2}
          dot={{ fill: "#1db954", strokeWidth: 0, r: 4 }}
        />
        <Tooltip content={<CustomTooltip />} />
      </RadarChart>
    </ResponsiveContainer>
  );
}

export function DimensionBars({ dimensions }: Props) {
  const entries = Object.entries(dimensions) as [keyof PersonalityDimensions, number][];

  return (
    <div className="space-y-4">
      {entries.map(([key, value]) => {
        const meta = DIMENSION_META[key];
        return (
          <div key={key}>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <span className="text-base">{meta.emoji}</span>
                <span className="text-sm font-medium text-white">{meta.label}</span>
              </div>
              <span
                className="text-sm font-bold font-mono"
                style={{ color: meta.color }}
              >
                {value.toFixed(0)}
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-dna-border overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${value}%`,
                  background: `linear-gradient(90deg, ${meta.color}88, ${meta.color})`,
                }}
              />
            </div>
            <p className="mt-1 text-xs text-dna-muted">{meta.description}</p>
          </div>
        );
      })}
    </div>
  );
}
