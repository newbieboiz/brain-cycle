import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { Card, Deck, ExportBlobV1, Review, SrsState, TimestampMs } from "@/lib/types";
import { DB_NAME, DB_VERSION, STORES } from "@/lib/db/migrations";

type DeckRow = Deck;
type CardRow = Card;
type SrsRow = SrsState;
type ReviewRow = Review;

type IndexKey = string | number;

interface BrainCycleDb extends DBSchema {
  [STORES.decks]: {
    key: string;
    value: DeckRow;
    indexes: { by_updatedAt: number };
  };
  [STORES.cards]: {
    key: string;
    value: CardRow;
    indexes: { by_deckId: string; by_updatedAt: number };
  };
  [STORES.srs]: {
    key: string; // cardId
    value: SrsRow;
    indexes: { by_dueAt: number };
  };
  [STORES.reviews]: {
    key: string;
    value: ReviewRow;
    indexes: { by_gradedAt: number; by_deckId: string; by_cardId: string };
  };
}

let dbPromise: Promise<IDBPDatabase<BrainCycleDb>> | null = null;

function ensureBrowser() {
  if (typeof window === "undefined") {
    throw new Error("IndexedDB is only available in the browser.");
  }
}

export function getDb(): Promise<IDBPDatabase<BrainCycleDb>> {
  ensureBrowser();
  if (!dbPromise) {
    dbPromise = openDB<BrainCycleDb>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const decks = db.createObjectStore(STORES.decks, { keyPath: "id" });
        decks.createIndex("by_updatedAt", "updatedAt");

        const cards = db.createObjectStore(STORES.cards, { keyPath: "id" });
        cards.createIndex("by_deckId", "deckId");
        cards.createIndex("by_updatedAt", "updatedAt");

        const srs = db.createObjectStore(STORES.srs, { keyPath: "cardId" });
        srs.createIndex("by_dueAt", "dueAt");

        const reviews = db.createObjectStore(STORES.reviews, { keyPath: "id" });
        reviews.createIndex("by_gradedAt", "gradedAt");
        reviews.createIndex("by_deckId", "deckId");
        reviews.createIndex("by_cardId", "cardId");
      },
    });
  }
  return dbPromise;
}

function ulidLike(now: TimestampMs): string {
  // Not a true ULID, but stable + sortable enough for local IDs.
  return `${now.toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export async function listDecks(): Promise<Deck[]> {
  const db = await getDb();
  const decks = await db.getAll(STORES.decks);
  return decks.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function createDeck(name: string, now: TimestampMs = Date.now()): Promise<Deck> {
  const db = await getDb();
  const deck: Deck = { id: ulidLike(now), name: name.trim() || "Untitled", createdAt: now, updatedAt: now };
  await db.put(STORES.decks, deck);
  return deck;
}

export async function updateDeck(deckId: string, patch: Partial<Pick<Deck, "name">>, now: TimestampMs = Date.now()): Promise<void> {
  const db = await getDb();
  const prev = await db.get(STORES.decks, deckId);
  if (!prev) return;
  await db.put(STORES.decks, { ...prev, ...patch, updatedAt: now });
}

export async function deleteDeck(deckId: string): Promise<void> {
  const db = await getDb();
  const tx = db.transaction([STORES.decks, STORES.cards, STORES.srs, STORES.reviews], "readwrite");
  await tx.objectStore(STORES.decks).delete(deckId);

  const cardsIdx = tx.objectStore(STORES.cards).index("by_deckId");
  const cardKeys = await cardsIdx.getAllKeys(deckId);
  for (const key of cardKeys as IndexKey[]) {
    const cardId = String(key);
    await tx.objectStore(STORES.cards).delete(cardId);
    await tx.objectStore(STORES.srs).delete(cardId);
    // delete reviews by cardId
    const revIdx = tx.objectStore(STORES.reviews).index("by_cardId");
    const revKeys = await revIdx.getAllKeys(cardId);
    for (const r of revKeys as IndexKey[]) await tx.objectStore(STORES.reviews).delete(String(r));
  }
  await tx.done;
}

export async function listCards(deckId: string): Promise<Card[]> {
  const db = await getDb();
  const idx = db.transaction(STORES.cards).store.index("by_deckId");
  const cards = await idx.getAll(deckId);
  return cards.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function createCard(
  deckId: string,
  input: Pick<Card, "front" | "back">,
  now: TimestampMs = Date.now(),
): Promise<Card> {
  const db = await getDb();
  const card: Card = {
    id: ulidLike(now),
    deckId,
    front: input.front.trim(),
    back: input.back.trim(),
    suspended: false,
    createdAt: now,
    updatedAt: now,
  };
  const tx = db.transaction([STORES.cards, STORES.srs], "readwrite");
  await tx.objectStore(STORES.cards).put(card);
  await tx.objectStore(STORES.srs).put({
    cardId: card.id,
    dueAt: now,
    intervalDays: 0,
    easeFactor: 2.5,
    repetitions: 0,
    lapses: 0,
    lastReviewedAt: undefined,
  } satisfies SrsState);
  await tx.done;
  return card;
}

export async function updateCard(
  cardId: string,
  patch: Partial<Pick<Card, "front" | "back" | "suspended">>,
  now: TimestampMs = Date.now(),
): Promise<void> {
  const db = await getDb();
  const prev = await db.get(STORES.cards, cardId);
  if (!prev) return;
  await db.put(STORES.cards, { ...prev, ...patch, updatedAt: now });
}

export async function deleteCard(cardId: string): Promise<void> {
  const db = await getDb();
  const tx = db.transaction([STORES.cards, STORES.srs, STORES.reviews], "readwrite");
  await tx.objectStore(STORES.cards).delete(cardId);
  await tx.objectStore(STORES.srs).delete(cardId);
  const revIdx = tx.objectStore(STORES.reviews).index("by_cardId");
  const revKeys = await revIdx.getAllKeys(cardId);
  for (const r of revKeys as IndexKey[]) await tx.objectStore(STORES.reviews).delete(String(r));
  await tx.done;
}

export async function getSrs(cardId: string): Promise<SrsState | undefined> {
  const db = await getDb();
  return db.get(STORES.srs, cardId);
}

export async function upsertSrs(state: SrsState): Promise<void> {
  const db = await getDb();
  await db.put(STORES.srs, state);
}

export async function addReview(review: Review): Promise<void> {
  const db = await getDb();
  await db.put(STORES.reviews, review);
}

export async function listReviews(limit = 5000): Promise<Review[]> {
  const db = await getDb();
  const reviews = await db.getAll(STORES.reviews);
  reviews.sort((a, b) => b.gradedAt - a.gradedAt);
  return reviews.slice(0, limit);
}

export async function listDueCards(options: {
  now?: TimestampMs;
  deckId?: string;
  limit?: number;
}): Promise<Array<{ card: Card; srs: SrsState }>> {
  const now = options.now ?? Date.now();
  const limit = options.limit ?? 100;
  const db = await getDb();

  // Read all due SRS rows via dueAt index, then join with cards.
  const tx = db.transaction([STORES.srs, STORES.cards], "readonly");
  const srsIdx = tx.objectStore(STORES.srs).index("by_dueAt");

  const due: SrsState[] = [];
  let cursor = await srsIdx.openCursor(IDBKeyRange.upperBound(now));
  while (cursor && due.length < limit * 3) {
    due.push(cursor.value);
    cursor = await cursor.continue();
  }

  const result: Array<{ card: Card; srs: SrsState }> = [];
  for (const srs of due) {
    const card = await tx.objectStore(STORES.cards).get(srs.cardId);
    if (!card) continue;
    if (card.suspended) continue;
    if (options.deckId && card.deckId !== options.deckId) continue;
    result.push({ card, srs });
    if (result.length >= limit) break;
  }

  await tx.done;
  // stable ordering: dueAt ascending
  result.sort((a, b) => a.srs.dueAt - b.srs.dueAt);
  return result;
}

export async function ensureSrsForCard(cardId: string, now: TimestampMs = Date.now()): Promise<SrsState> {
  const db = await getDb();
  const prev = await db.get(STORES.srs, cardId);
  if (prev) return prev;
  const srs: SrsState = {
    cardId,
    dueAt: now,
    intervalDays: 0,
    easeFactor: 2.5,
    repetitions: 0,
    lapses: 0,
    lastReviewedAt: undefined,
  };
  await db.put(STORES.srs, srs);
  return srs;
}

export async function getDueCount(deckId?: string, now: TimestampMs = Date.now()): Promise<number> {
  const due = await listDueCards({ deckId, now, limit: 10000 });
  return due.length;
}

export async function exportAll(): Promise<ExportBlobV1> {
  const db = await getDb();
  const [decks, cards, srs, reviews] = await Promise.all([
    db.getAll(STORES.decks),
    db.getAll(STORES.cards),
    db.getAll(STORES.srs),
    db.getAll(STORES.reviews),
  ]);
  return {
    version: 1,
    exportedAt: Date.now(),
    decks,
    cards,
    srs,
    reviews,
  };
}

export async function importAll(blob: ExportBlobV1): Promise<void> {
  if (blob.version !== 1) throw new Error(`Unsupported export version: ${String(blob.version)}`);
  const db = await getDb();
  const tx = db.transaction([STORES.decks, STORES.cards, STORES.srs, STORES.reviews], "readwrite");
  await Promise.all([
    tx.objectStore(STORES.decks).clear(),
    tx.objectStore(STORES.cards).clear(),
    tx.objectStore(STORES.srs).clear(),
    tx.objectStore(STORES.reviews).clear(),
  ]);
  for (const d of blob.decks) await tx.objectStore(STORES.decks).put(d);
  for (const c of blob.cards) await tx.objectStore(STORES.cards).put(c);
  for (const s of blob.srs) await tx.objectStore(STORES.srs).put(s);
  for (const r of blob.reviews) await tx.objectStore(STORES.reviews).put(r);
  await tx.done;
}

export async function resetAll(): Promise<void> {
  const db = await getDb();
  const tx = db.transaction([STORES.decks, STORES.cards, STORES.srs, STORES.reviews], "readwrite");
  await Promise.all([
    tx.objectStore(STORES.decks).clear(),
    tx.objectStore(STORES.cards).clear(),
    tx.objectStore(STORES.srs).clear(),
    tx.objectStore(STORES.reviews).clear(),
  ]);
  await tx.done;
}

export function newReviewId(now: TimestampMs = Date.now()): string {
  return ulidLike(now);
}

