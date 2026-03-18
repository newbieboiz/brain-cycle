"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { formatDistanceToNowStrict } from "date-fns";
import { toast } from "sonner";
import { buttonVariants } from "@/components/ui/button";
import { Card as UiCard, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { listDecks } from "@/lib/db";
import { useDueCount } from "@/hooks/useDueCount";
import type { Deck } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  const { count, error } = useDueCount();
  const [decks, setDecks] = useState<Deck[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    listDecks()
      .then((d) => {
        if (!cancelled) setDecks(d);
      })
      .catch((e: unknown) => {
        toast.error(e instanceof Error ? e.message : "Failed to load decks");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const subtitle = useMemo(() => {
    if (error) return "Could not load due count.";
    if (count === null) return "Loading…";
    if (count === 0) return "Nothing due right now.";
    return `${count} card${count === 1 ? "" : "s"} due`;
  }, [count, error]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Today</h1>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <Link
          href="/review"
          aria-disabled={count === null || (count ?? 0) === 0}
          className={cn(
            buttonVariants(),
            (count === null || (count ?? 0) === 0) && "pointer-events-none opacity-50",
          )}
        >
          Start review
        </Link>
      </div>

      <Separator />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <UiCard>
          <CardHeader>
            <CardTitle className="text-base">Quick actions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Link href="/decks" className={buttonVariants({ variant: "secondary" })}>
              Manage decks
            </Link>
            <Link href="/settings" className={buttonVariants({ variant: "outline" })}>
              Import / export
            </Link>
          </CardContent>
        </UiCard>

        <UiCard>
          <CardHeader>
            <CardTitle className="text-base">Recently updated decks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {decks === null ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : decks.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No decks yet. Create one to begin.
              </p>
            ) : (
              <div className="space-y-2">
                {decks.slice(0, 5).map((d) => (
                  <div key={d.id} className="flex items-center justify-between gap-2">
                    <Link
                      href={`/decks/${d.id}`}
                      className="truncate text-sm font-medium hover:underline"
                    >
                      {d.name}
                    </Link>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatDistanceToNowStrict(d.updatedAt, { addSuffix: true })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </UiCard>
      </div>
    </div>
  );
}
