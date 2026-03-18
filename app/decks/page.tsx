"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { listDecks, createDeck, deleteDeck, updateDeck } from "@/lib/db";
import type { Deck } from "@/lib/types";

export default function DecksPage() {
  const [decks, setDecks] = useState<Deck[] | null>(null);
  const [creatingName, setCreatingName] = useState("");
  const [openCreate, setOpenCreate] = useState(false);

  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameName, setRenameName] = useState("");

  async function refresh() {
    const d = await listDecks();
    setDecks(d);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const d = await listDecks();
        if (!cancelled) setDecks(d);
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : "Failed to load decks");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onCreate() {
    try {
      const deck = await createDeck(creatingName);
      setCreatingName("");
      setOpenCreate(false);
      toast.success("Deck created");
      await refresh();
      window.location.assign(`/decks/${deck.id}`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to create deck");
    }
  }

  async function onDelete(deckId: string) {
    if (!confirm("Delete this deck and all its cards?")) return;
    try {
      await deleteDeck(deckId);
      toast.success("Deck deleted");
      await refresh();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to delete deck");
    }
  }

  async function onRename() {
    if (!renameId) return;
    try {
      await updateDeck(renameId, { name: renameName });
      toast.success("Deck renamed");
      setRenameId(null);
      setRenameName("");
      await refresh();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to rename deck");
    }
  }

  return (
    <div className='space-y-6'>
      <div className='flex items-start justify-between gap-4'>
        <div className='space-y-1'>
          <h1 className='text-2xl font-semibold tracking-tight'>Decks</h1>
          <p className='text-sm text-muted-foreground'>
            Organize cards into decks. Reviews can pull from one deck or all.
          </p>
        </div>

        <Dialog open={openCreate} onOpenChange={setOpenCreate}>
          <DialogTrigger asChild>
            <Button>Create deck</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create a deck</DialogTitle>
            </DialogHeader>
            <div className='space-y-2'>
              <Input
                value={creatingName}
                onChange={(e) => setCreatingName(e.target.value)}
                placeholder='e.g. Japanese vocab'
                autoFocus
              />
              <p className='text-xs text-muted-foreground'>You can rename it later.</p>
            </div>
            <DialogFooter>
              <Button variant='secondary' onClick={() => setOpenCreate(false)}>
                Cancel
              </Button>
              <Button onClick={onCreate}>Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog open={renameId !== null} onOpenChange={(o) => !o && setRenameId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename deck</DialogTitle>
          </DialogHeader>
          <Input value={renameName} onChange={(e) => setRenameName(e.target.value)} autoFocus />
          <DialogFooter>
            <Button variant='secondary' onClick={() => setRenameId(null)}>
              Cancel
            </Button>
            <Button onClick={onRename}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {decks === null ? (
        <p className='text-sm text-muted-foreground'>Loading…</p>
      ) : decks.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className='text-base'>No decks yet</CardTitle>
          </CardHeader>
          <CardContent className='space-y-3'>
            <p className='text-sm text-muted-foreground'>
              Create your first deck, then add a few cards.
            </p>
            <Button onClick={() => setOpenCreate(true)}>Create deck</Button>
          </CardContent>
        </Card>
      ) : (
        <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
          {decks.map((d) => (
            <Card key={d.id}>
              <CardHeader>
                <CardTitle className='text-base'>
                  <Link href={`/decks/${d.id}`} className='hover:underline'>
                    {d.name}
                  </Link>
                </CardTitle>
              </CardHeader>
              <CardContent className='flex flex-wrap gap-2'>
                <Link href={`/decks/${d.id}`} className={buttonVariants({ size: "sm" })}>
                  Open
                </Link>
                <Button
                  size='sm'
                  variant='secondary'
                  onClick={() => {
                    setRenameId(d.id);
                    setRenameName(d.name);
                  }}
                >
                  Rename
                </Button>
                <Button size='sm' variant='destructive' onClick={() => onDelete(d.id)}>
                  Delete
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
