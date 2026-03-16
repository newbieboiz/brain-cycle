"use client";

import { useMemo, useState } from "react";
import { formatDistanceToNowStrict } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card as UiCard, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { addReview, ensureSrsForCard, newReviewId, upsertSrs, updateDeck, updateCard } from "@/lib/db";
import { applySm2 } from "@/lib/srs/sm2";
import type { Card, Deck, ReviewGrade, SrsState } from "@/lib/types";

export function ReviewCard({
  deck,
  card,
  srs,
  now,
  onGraded,
}: {
  deck: Deck;
  card: Card;
  srs: SrsState;
  now: number;
  onGraded: () => void;
}) {
  const [revealed, setRevealed] = useState(false);
  const [saving, setSaving] = useState(false);

  const grades = useMemo(
    () =>
      [
        { label: "Again", grade: 0 as ReviewGrade, variant: "destructive" as const },
        { label: "Hard", grade: 3 as ReviewGrade, variant: "secondary" as const },
        { label: "Good", grade: 4 as ReviewGrade, variant: "default" as const },
        { label: "Easy", grade: 5 as ReviewGrade, variant: "outline" as const },
      ] as const,
    [],
  );

  async function grade(grade: ReviewGrade) {
    setSaving(true);
    try {
      const now = Date.now();
      const current = await ensureSrsForCard(card.id, now);
      const { next, prevDueAt } = applySm2(current, grade, now);
      await upsertSrs(next);
      await addReview({
        id: newReviewId(now),
        cardId: card.id,
        deckId: card.deckId,
        gradedAt: now,
        grade,
        prevDueAt,
        nextDueAt: next.dueAt,
        intervalDays: next.intervalDays,
        easeFactor: next.easeFactor,
      });
      // Touch deck + card updatedAt to keep recents meaningful.
      await Promise.all([
        updateDeck(deck.id, {}),
        updateCard(card.id, {}),
      ]);

      setRevealed(false);
      onGraded();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to save review");
    } finally {
      setSaving(false);
    }
  }

  return (
    <UiCard className="overflow-hidden">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base">{deck.name}</CardTitle>
          <p className="text-xs text-muted-foreground">
            Due{" "}
            {srs.dueAt <= now
              ? "now"
              : formatDistanceToNowStrict(srs.dueAt, { addSuffix: true })}
          </p>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-xs font-medium text-muted-foreground">Front</p>
          <div className="mt-2 whitespace-pre-wrap text-base">{card.front}</div>
        </div>
        <div
          className={cn(
            "rounded-lg border bg-muted/30 p-4",
            !revealed && "select-none blur-sm",
          )}
          aria-hidden={!revealed}
        >
          <p className="text-xs font-medium text-muted-foreground">Back</p>
          <div className="mt-2 whitespace-pre-wrap text-base">{card.back}</div>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button
          variant="secondary"
          onClick={() => setRevealed((r) => !r)}
          disabled={saving}
        >
          {revealed ? "Hide answer" : "Reveal answer"}
        </Button>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:justify-end">
          {grades.map((g) => (
            <Button
              key={g.label}
              variant={g.variant}
              onClick={() => grade(g.grade)}
              disabled={!revealed || saving}
            >
              {g.label}
            </Button>
          ))}
        </div>
      </CardFooter>
    </UiCard>
  );
}

