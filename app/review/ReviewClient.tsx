"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card as UiCard, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { DeckPicker } from "@/components/DeckPicker";
import { ReviewCard } from "@/components/ReviewCard";
import { listDecks, listDueCards } from "@/lib/db";
import type { Deck } from "@/lib/types";
import { cn } from "@/lib/utils";

type DueItem = Awaited<ReturnType<typeof listDueCards>>[number];

export function ReviewClient() {
  const searchParams = useSearchParams();
  const initialDeckId = searchParams.get("deckId");

  const [selected, setSelected] = useState<string | "all">(initialDeckId ?? "all");
  const [decks, setDecks] = useState<Deck[] | null>(null);
  const [queue, setQueue] = useState<DueItem[] | null>(null);
  const [index, setIndex] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  const deckMap = useMemo(() => {
    const map = new Map<string, Deck>();
    for (const d of decks ?? []) map.set(d.id, d);
    return map;
  }, [decks]);

  const load = useCallback(async () => {
    const [d, q] = await Promise.all([
      listDecks(),
      listDueCards({ deckId: selected === "all" ? undefined : selected, limit: 200 }),
    ]);
    setDecks(d);
    setQueue(q);
    setIndex(0);
    setNow(Date.now());
  }, [selected]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [d, q] = await Promise.all([
          listDecks(),
          listDueCards({ deckId: selected === "all" ? undefined : selected, limit: 200 }),
        ]);
        if (cancelled) return;
        setDecks(d);
        setQueue(q);
        setIndex(0);
        setNow(Date.now());
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : "Failed to load review queue");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selected]);

  const current = queue?.[index];
  const done = queue !== null && index >= queue.length;

  const subtitle = useMemo(() => {
    if (queue === null) return "Loading…";
    if (queue.length === 0) return "Nothing due right now.";
    return `${queue.length} due • ${Math.min(index + 1, queue.length)}/${queue.length}`;
  }, [queue, index]);

  return (
    <div className='space-y-6'>
      <div className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
        <div className='space-y-1'>
          <h1 className='text-2xl font-semibold tracking-tight'>Review</h1>
          <p className='text-sm text-muted-foreground'>{subtitle}</p>
        </div>
        <div className='flex flex-wrap items-center gap-2'>
          <DeckPicker value={selected} onChange={setSelected} />
          <Button variant='secondary' onClick={() => load()} disabled={queue === null}>
            Refresh
          </Button>
        </div>
      </div>

      <Separator />

      {queue === null ? (
        <p className='text-sm text-muted-foreground'>Loading…</p>
      ) : queue.length === 0 ? (
        <UiCard>
          <CardHeader>
            <CardTitle className='text-base'>You’re all caught up</CardTitle>
          </CardHeader>
          <CardContent className='space-y-3'>
            <p className='text-sm text-muted-foreground'>
              Add more cards or come back later when more are due.
            </p>
            <div className='flex flex-wrap gap-2'>
              <Link href='/decks' className={cn(buttonVariants())}>
                Go to decks
              </Link>
              <Link href='/' className={cn(buttonVariants({ variant: "secondary" }))}>
                Back to today
              </Link>
            </div>
          </CardContent>
        </UiCard>
      ) : done ? (
        <UiCard>
          <CardHeader>
            <CardTitle className='text-base'>Session complete</CardTitle>
          </CardHeader>
          <CardContent className='space-y-3'>
            <p className='text-sm text-muted-foreground'>
              Nice work. Want to check if more became due?
            </p>
            <div className='flex flex-wrap gap-2'>
              <Button onClick={() => load()}>Load next due</Button>
              <Link href='/' className={cn(buttonVariants({ variant: "secondary" }))}>
                Back to today
              </Link>
            </div>
          </CardContent>
        </UiCard>
      ) : current ? (
        <ReviewCard
          deck={
            deckMap.get(current.card.deckId) ?? {
              id: current.card.deckId,
              name: "Deck",
              createdAt: 0,
              updatedAt: 0,
            }
          }
          card={current.card}
          srs={current.srs}
          now={now}
          onGraded={() => setIndex((i) => i + 1)}
        />
      ) : (
        <p className='text-sm text-muted-foreground'>Loading…</p>
      )}
    </div>
  );
}
