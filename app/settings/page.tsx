"use client";

import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { exportAll, importAll, resetAll } from "@/lib/db";
import type { ExportBlobV1 } from "@/lib/types";

function download(filename: string, text: string) {
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function SettingsPage() {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [importText, setImportText] = useState("");

  const prettyHint = useMemo(
    () =>
      "Tip: export creates a JSON backup. You can re-import it on any device/browser.",
    [],
  );

  async function onExport() {
    try {
      const blob = await exportAll();
      download(`brain-cycle-export-${blob.exportedAt}.json`, JSON.stringify(blob, null, 2));
      toast.success("Export downloaded");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to export");
    }
  }

  async function onImportJson(json: string) {
    try {
      const parsed = JSON.parse(json) as ExportBlobV1;
      await importAll(parsed);
      toast.success("Import complete");
      setImportText("");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to import JSON");
    }
  }

  async function onReset() {
    if (!confirm("This will delete all decks, cards, and review history. Continue?")) return;
    try {
      await resetAll();
      toast.success("Local data reset");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to reset");
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">{prettyHint}</p>
      </div>

      <Separator />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Backup</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button onClick={onExport}>Export JSON</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Danger zone</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="destructive" onClick={onReset}>
              Reset local data
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Import</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                file.text().then(onImportJson).catch(() => toast.error("Failed to read file"));
              }}
            />
            <Button variant="secondary" onClick={() => fileRef.current?.click()}>
              Choose file…
            </Button>
            <Button
              variant="outline"
              onClick={() => onImportJson(importText)}
              disabled={!importText.trim()}
            >
              Import pasted JSON
            </Button>
          </div>
          <Textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            placeholder="Or paste exported JSON here…"
            rows={10}
          />
        </CardContent>
      </Card>
    </div>
  );
}

