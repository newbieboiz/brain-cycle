import type { ReviewGrade, SrsState, TimestampMs } from "@/lib/types";

export type Sm2Result = {
  next: SrsState;
  prevDueAt: TimestampMs;
};

const MIN_EASE = 1.3;

function clamp(min: number, value: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function createInitialSrsState(
  cardId: string,
  now: TimestampMs,
): SrsState {
  return {
    cardId,
    dueAt: now,
    intervalDays: 0,
    easeFactor: 2.5,
    repetitions: 0,
    lapses: 0,
    lastReviewedAt: undefined,
  };
}

function addMs(now: TimestampMs, ms: number): TimestampMs {
  return now + ms;
}

function daysToMs(days: number): number {
  return Math.round(days * 24 * 60 * 60 * 1000);
}

/**
 * SM-2 inspired scheduling.
 *
 * - grade 0-2: treat as a lapse, reset repetitions, short relearn delay
 * - grade 3-5: advance repetitions; first intervals 1d, 6d, then interval*=EF
 *
 * We keep everything in ms timestamps and a day-based interval for reporting.
 */
export function applySm2(
  prev: SrsState,
  grade: ReviewGrade,
  now: TimestampMs,
): Sm2Result {
  const prevDueAt = prev.dueAt;

  const isLapse = grade <= 2;
  const q = grade;
  const efDelta = 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02);
  const nextEase = clamp(MIN_EASE, prev.easeFactor + efDelta, 3.0);

  if (isLapse) {
    // Short relearn: due in 10 minutes, keep EF updated but reset repetition count.
    const dueAt = addMs(now, 10 * 60 * 1000);
    return {
      prevDueAt,
      next: {
        ...prev,
        dueAt,
        intervalDays: 0,
        easeFactor: nextEase,
        repetitions: 0,
        lapses: prev.lapses + 1,
        lastReviewedAt: now,
      },
    };
  }

  const nextRepetitions = prev.repetitions + 1;
  let intervalDays: number;

  if (nextRepetitions === 1) intervalDays = 1;
  else if (nextRepetitions === 2) intervalDays = 6;
  else intervalDays = Math.max(1, Math.round(prev.intervalDays * nextEase));

  // Small modifiers for Hard/Easy to better match common SR UX.
  if (grade === 3) intervalDays = Math.max(1, Math.round(intervalDays * 0.8));
  if (grade === 5) intervalDays = Math.max(1, Math.round(intervalDays * 1.3));

  const dueAt = addMs(now, daysToMs(intervalDays));

  return {
    prevDueAt,
    next: {
      ...prev,
      dueAt,
      intervalDays,
      easeFactor: nextEase,
      repetitions: nextRepetitions,
      lastReviewedAt: now,
    },
  };
}

