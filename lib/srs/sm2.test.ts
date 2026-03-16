import { applySm2, createInitialSrsState } from "@/lib/srs/sm2";

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

export function runSm2SelfTest() {
  const now = Date.now();
  const s0 = createInitialSrsState("c1", now);
  const r1 = applySm2(s0, 4, now);
  assert(r1.next.repetitions === 1, "repetitions should increment");
  assert(r1.next.intervalDays === 1, "first interval should be 1 day");

  const now2 = now + 1000;
  const r2 = applySm2(r1.next, 4, now2);
  assert(r2.next.repetitions === 2, "repetitions should increment again");
  assert(r2.next.intervalDays === 6, "second interval should be 6 days");

  const now3 = now2 + 1000;
  const r3 = applySm2(r2.next, 0, now3);
  assert(r3.next.repetitions === 0, "lapse should reset repetitions");
  assert(r3.next.dueAt > now3, "lapse should schedule in future");
  assert(r3.next.lapses === 1, "lapses should increment");
}

