export type Id = string;

export type TimestampMs = number;

export type Deck = {
  id: Id;
  name: string;
  createdAt: TimestampMs;
  updatedAt: TimestampMs;
};

export type Card = {
  id: Id;
  deckId: Id;
  front: string;
  back: string;
  suspended: boolean;
  createdAt: TimestampMs;
  updatedAt: TimestampMs;
};

export type SrsState = {
  cardId: Id;
  dueAt: TimestampMs;
  intervalDays: number;
  easeFactor: number;
  repetitions: number;
  lapses: number;
  lastReviewedAt?: TimestampMs;
};

export type ReviewGrade = 0 | 1 | 2 | 3 | 4 | 5;

export type Review = {
  id: Id;
  cardId: Id;
  deckId: Id;
  gradedAt: TimestampMs;
  grade: ReviewGrade;
  prevDueAt: TimestampMs;
  nextDueAt: TimestampMs;
  intervalDays: number;
  easeFactor: number;
};

export type ExportBlobV1 = {
  version: 1;
  exportedAt: TimestampMs;
  decks: Deck[];
  cards: Card[];
  srs: SrsState[];
  reviews: Review[];
};

