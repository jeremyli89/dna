export interface User {
  id: string;
  spotify_id: string;
  display_name: string | null;
  email: string | null;
  avatar_url: string | null;
}

export interface PersonalityDimensions {
  explorer: number;
  loyalist: number;
  adventurous: number;
  nostalgic: number;
  mainstream: number;
  night_owl: number;
}

export interface WeeklySnapshot {
  week_start: string;
  explorer_score: number | null;
  loyalist_score: number | null;
  adventurous_score: number | null;
  nostalgic_score: number | null;
  mainstream_score: number | null;
  night_owl_score: number | null;
  stream_count: number | null;
  unique_artists: number | null;
  unique_genres: number | null;
}

export interface DnaScore {
  dna_id: string;
  similarity_to_last_month: number | null;
  trait_vector: PersonalityDimensions;
}

export interface Insight {
  id: string;
  generated_at: string;
  insight_type: string;
  content: string;
  data: Record<string, unknown> | null;
}

export interface IngestStatus {
  total_streams: number;
  unenriched: number;
  history_streams: number;
  api_streams: number;
  last_polled_at: number | null;
  oldest_stream: string | null;
  newest_stream: string | null;
}

export type DimensionKey = keyof PersonalityDimensions;

export const DIMENSION_META: Record<
  DimensionKey,
  { label: string; color: string; description: string; emoji: string }
> = {
  explorer: {
    label: "Explorer",
    color: "#1db954",
    description: "Discovers new artists & tracks",
    emoji: "🧭",
  },
  loyalist: {
    label: "Loyalist",
    color: "#f59e0b",
    description: "Devoted to favorite artists",
    emoji: "🎯",
  },
  adventurous: {
    label: "Adventurous",
    color: "#a855f7",
    description: "Genre diversity & range",
    emoji: "🎲",
  },
  nostalgic: {
    label: "Nostalgic",
    color: "#ec4899",
    description: "Affinity for older music",
    emoji: "📻",
  },
  mainstream: {
    label: "Mainstream",
    color: "#3b82f6",
    description: "Popular vs. niche taste",
    emoji: "📊",
  },
  night_owl: {
    label: "Night Owl",
    color: "#6366f1",
    description: "Late-night listening habits",
    emoji: "🦉",
  },
};
