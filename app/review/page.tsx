import { Suspense } from "react";
import { ReviewClient } from "@/app/review/ReviewClient";

export default function ReviewPage() {
  return (
    <Suspense fallback={<div className="text-sm text-muted-foreground">Loading…</div>}>
      <ReviewClient />
    </Suspense>
  );
}

