"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { listDecks } from "@/lib/db";
import type { Deck } from "@/lib/types";

export function DeckPicker({
  value,
  onChange,
}: {
  value: string | "all";
  onChange: (next: string | "all") => void;
}) {
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

  return (
    <Select
      value={value}
      onValueChange={(v) => {
        if (!v) return;
        onChange(v === "all" ? "all" : v);
      }}
    >
      <SelectTrigger className='w-[240px]'>
        <SelectValue placeholder='Pick a deck' />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectItem value='all'>All decks</SelectItem>
          {decks?.map((d) => (
            <SelectItem key={d.id} value={d.id}>
              {d.name}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
