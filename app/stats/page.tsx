"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Card as UiCard, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Separator } from "@/components/ui/separator";
import { listReviews } from "@/lib/db";
import type { Review } from "@/lib/types";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

type DayPoint = { day: string; reviews: number };

function startOfDayMs(ts: number) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export default function StatsPage() {
  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [now] = useState(() => Date.now());

  useEffect(() => {
    listReviews(10000)
      .then(setReviews)
      .catch((e: unknown) =>
        toast.error(e instanceof Error ? e.message : "Failed to load reviews"),
      );
  }, []);

  const points = useMemo(() => {
    if (!reviews) return null;
    const days = 30;
    const byDay = new Map<number, number>();
    for (const r of reviews) {
      const day = startOfDayMs(r.gradedAt);
      byDay.set(day, (byDay.get(day) ?? 0) + 1);
    }
    const out: DayPoint[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const dayMs = startOfDayMs(now - i * 24 * 60 * 60 * 1000);
      out.push({ day: format(dayMs, "MMM d"), reviews: byDay.get(dayMs) ?? 0 });
    }
    return out;
  }, [reviews, now]);

  const total = useMemo(() => (reviews ? reviews.length : null), [reviews]);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Stats</h1>
        <p className="text-sm text-muted-foreground">
          {total === null ? "Loading…" : `${total} review${total === 1 ? "" : "s"} logged`}
        </p>
      </div>

      <Separator />

      <UiCard>
        <CardHeader>
          <CardTitle className="text-base">Reviews per day (last 30 days)</CardTitle>
        </CardHeader>
        <CardContent>
          {points === null ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <ChartContainer
              config={{
                reviews: { label: "Reviews", color: "hsl(var(--chart-1))" },
              }}
              className="h-[320px]"
            >
              <BarChart data={points} margin={{ left: 0, right: 0 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="day" tickLine={false} axisLine={false} interval={4} />
                <YAxis tickLine={false} axisLine={false} allowDecimals={false} width={30} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="reviews" fill="var(--color-reviews)" radius={6} />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </UiCard>
    </div>
  );
}

