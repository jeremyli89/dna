import { useState, useEffect } from "react";
import type { PersonalityDimensions, WeeklySnapshot, DnaScore } from "../types";
import { api } from "../api/client";

export function usePersonality() {
  const [dimensions, setDimensions] = useState<PersonalityDimensions | null>(null);
  const [trend, setTrend] = useState<WeeklySnapshot[]>([]);
  const [dnaScore, setDnaScore] = useState<DnaScore | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = () => {
    setLoading(true);
    Promise.all([
      api.personality.current(),
      api.personality.trend(12),
      api.personality.dnaScore(),
    ])
      .then(([dims, tr, dna]) => {
        setDimensions(dims);
        setTrend(tr);
        setDnaScore(dna);
        setError(null);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    refetch();
  }, []);

  return { dimensions, trend, dnaScore, loading, error, refetch };
}
