import { useState, useEffect } from "react";
import type { Insight } from "../types";
import { api } from "../api/client";

export function useInsights() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetch_ = () => {
    api.insights
      .weekly()
      .then(setInsights)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  const generate = async () => {
    setGenerating(true);
    try {
      const newInsight = await api.insights.generate();
      setInsights((prev) => [newInsight, ...prev]);
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => {
    fetch_();
  }, []);

  return { insights, loading, generating, generate, refetch: fetch_ };
}
