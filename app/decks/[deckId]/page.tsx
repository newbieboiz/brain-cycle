"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card as UiCard, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createCard, deleteCard, listCards, listDecks, updateCard } from "@/lib/db";
import type { Card, Deck } from "@/lib/types";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function DeckDetailPage() {
  const params = useParams<{ deckId: string }>();
  const deckId = params.deckId;

  const [deck, setDeck] = useState<Deck | null>(null);
  const [cards, setCards] = useState<Card[] | null>(null);

  const [openAdd, setOpenAdd] = useState(false);
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");

  const [editing, setEditing] = useState<Card | null>(null);
  const [editFront, setEditFront] = useState("");
  const [editBack, setEditBack] = useState("");
  const [editSuspended, setEditSuspended] = useState(false);

  async function refresh() {
    const [decks, deckCards] = await Promise.all([listDecks(), listCards(deckId)]);
    setDeck(decks.find((d) => d.id === deckId) ?? null);
    setCards(deckCards);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [decks, deckCards] = await Promise.all([listDecks(), listCards(deckId)]);
        if (cancelled) return;
        setDeck(decks.find((d) => d.id === deckId) ?? null);
        setCards(deckCards);
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : "Failed to load deck");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [deckId]);

  const dueLink = useMemo(() => `/review?deckId=${encodeURIComponent(deckId)}`, [deckId]);

  async function onAdd() {
    try {
      if (!front.trim() || !back.trim()) {
        toast.error("Front and back are required");
        return;
      }
      await createCard(deckId, { front, back });
      setFront("");
      setBack("");
      setOpenAdd(false);
      toast.success("Card added");
      await refresh();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to add card");
    }
  }

  async function onDelete(cardId: string) {
    if (!confirm("Delete this card?")) return;
    try {
      await deleteCard(cardId);
      toast.success("Card deleted");
      await refresh();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to delete card");
    }
  }

  async function onSaveEdit() {
    if (!editing) return;
    try {
      await updateCard(editing.id, {
        front: editFront,
        back: editBack,
        suspended: editSuspended,
      });
      toast.success("Card updated");
      setEditing(null);
      await refresh();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to update card");
    }
  }

  return (
    <div className='space-y-6'>
      <div className='flex items-start justify-between gap-4'>
        <div className='space-y-1'>
          <p className='text-sm text-muted-foreground'>
            <Link href='/decks' className='hover:underline'>
              Decks
            </Link>{" "}
            / {deck?.name ?? "…"}
          </p>
          <h1 className='text-2xl font-semibold tracking-tight'>{deck?.name ?? "Deck"}</h1>
        </div>
        <div className='flex flex-wrap gap-2'>
          <Link href={dueLink} className={cn(buttonVariants({ variant: "secondary" }))}>
            Review this deck
          </Link>
          <Dialog open={openAdd} onOpenChange={setOpenAdd}>
            <DialogTrigger asChild>
              <Button>Add card</Button>
            </DialogTrigger>
            <DialogContent className='sm:max-w-2xl'>
              <DialogHeader>
                <DialogTitle>Add a card</DialogTitle>
              </DialogHeader>
              <div className='grid gap-4'>
                <div className='grid gap-2'>
                  <Label htmlFor='front'>Front</Label>
                  <Textarea
                    id='front'
                    value={front}
                    onChange={(e) => setFront(e.target.value)}
                    placeholder='Prompt / question'
                    rows={4}
                    autoFocus
                  />
                </div>
                <div className='grid gap-2'>
                  <Label htmlFor='back'>Back</Label>
                  <Textarea
                    id='back'
                    value={back}
                    onChange={(e) => setBack(e.target.value)}
                    placeholder='Answer'
                    rows={4}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant='secondary' onClick={() => setOpenAdd(false)}>
                  Cancel
                </Button>
                <Button onClick={onAdd}>Add</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className='sm:max-w-2xl'>
          <DialogHeader>
            <DialogTitle>Edit card</DialogTitle>
          </DialogHeader>
          <div className='grid gap-4'>
            <div className='grid gap-2'>
              <Label htmlFor='edit-front'>Front</Label>
              <Textarea
                id='edit-front'
                value={editFront}
                onChange={(e) => setEditFront(e.target.value)}
                rows={4}
              />
            </div>
            <div className='grid gap-2'>
              <Label htmlFor='edit-back'>Back</Label>
              <Textarea
                id='edit-back'
                value={editBack}
                onChange={(e) => setEditBack(e.target.value)}
                rows={4}
              />
            </div>
            <div className='flex items-center justify-between rounded-lg border p-3'>
              <div>
                <p className='text-sm font-medium'>Suspend card</p>
                <p className='text-xs text-muted-foreground'>
                  Suspended cards won’t appear in review sessions.
                </p>
              </div>
              <Switch checked={editSuspended} onCheckedChange={setEditSuspended} />
            </div>
          </div>
          <DialogFooter>
            <Button variant='secondary' onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={onSaveEdit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <UiCard>
        <CardHeader>
          <CardTitle className='text-base'>Cards</CardTitle>
        </CardHeader>
        <CardContent>
          {cards === null ? (
            <p className='text-sm text-muted-foreground'>Loading…</p>
          ) : cards.length === 0 ? (
            <div className='space-y-3'>
              <p className='text-sm text-muted-foreground'>
                No cards yet. Add a few prompts and start reviewing.
              </p>
              <Button onClick={() => setOpenAdd(true)}>Add your first card</Button>
            </div>
          ) : (
            <div className='rounded-lg border'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className='w-[45%]'>Front</TableHead>
                    <TableHead className='w-[45%]'>Back</TableHead>
                    <TableHead className='w-[10%] text-right'>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cards.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className='align-top'>
                        <div className='line-clamp-3 whitespace-pre-wrap text-sm'>{c.front}</div>
                        {c.suspended ? (
                          <p className='mt-1 text-xs text-muted-foreground'>Suspended</p>
                        ) : null}
                      </TableCell>
                      <TableCell className='align-top'>
                        <div className='line-clamp-3 whitespace-pre-wrap text-sm'>{c.back}</div>
                      </TableCell>
                      <TableCell className='align-top text-right'>
                        <div className='flex justify-end gap-2'>
                          <Button
                            size='sm'
                            variant='secondary'
                            onClick={() => {
                              setEditing(c);
                              setEditFront(c.front);
                              setEditBack(c.back);
                              setEditSuspended(c.suspended);
                            }}
                          >
                            Edit
                          </Button>
                          <Button size='sm' variant='destructive' onClick={() => onDelete(c.id)}>
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </UiCard>
    </div>
  );
}
