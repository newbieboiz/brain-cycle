"use client";

import { useEffect, useState } from "react";
import { getDueCount } from "@/lib/db";

export function useDueCount(deckId?: string) {
  const [count, setCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const c = await getDueCount(deckId);
        if (!cancelled) setCount(c);
      } catch (e: unknown) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load due count");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [deckId]);

  return { count, error, refresh: () => getDueCount(deckId).then(setCount) };
}

