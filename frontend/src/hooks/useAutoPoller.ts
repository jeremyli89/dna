import { useEffect, useRef } from "react";
import { api } from "../api/client";

const POLL_INTERVAL_MS = 3 * 60 * 1000; // 3 minutes

export function useAutoPoller(onNewTracks?: (count: number) => void) {
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const poll = async () => {
      try {
        const res = await api.ingest.poll();
        if (res.new_tracks > 0) {
          onNewTracks?.(res.new_tracks);
        }
      } catch {
        // silent — token expired or rate limited, will retry next interval
      }
    };

    poll(); // immediate first poll
    timerRef.current = setInterval(poll, POLL_INTERVAL_MS);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);
}
