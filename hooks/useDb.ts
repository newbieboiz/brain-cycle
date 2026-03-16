"use client";

import { useMemo } from "react";
import * as db from "@/lib/db";

export function useDb() {
  return useMemo(() => db, []);
}

