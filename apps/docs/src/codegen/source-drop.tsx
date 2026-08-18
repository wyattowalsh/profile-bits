"use client";

import { type DiscoverSourceResult, discoverSource } from "@profile-bits/core";
import { useState } from "react";

export type SourceDropProps = {
  onDiscover?: (result: DiscoverSourceResult, body: string) => void;
};

/** Playground-only paste/drop. Calls core discoverSource. Forbidden on /generate. */
export function SourceDrop({ onDiscover }: SourceDropProps) {
  const [kind, setKind] = useState<string>("");
  const [error, setError] = useState<string>("");

  function apply(filename: string, body: string, mime?: string) {
    try {
      const result = discoverSource({ filename, body, mime });
      setKind(result.kind);
      setError("");
      onDiscover?.(result, body);
    } catch (caught) {
      setKind("");
      setError(caught instanceof Error ? caught.message : "discover failed");
    }
  }

  return (
    <div data-slot="source-drop">
      <label htmlFor="source-drop-file">Source drop</label>
      <input
        id="source-drop-file"
        type="file"
        data-slot="source-drop-file"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file == null) {
            return;
          }
          void file.text().then((body) => {
            apply(file.name, body, file.type);
          });
        }}
      />
      <textarea
        data-slot="source-drop-paste"
        aria-label="Paste widget source"
        onChange={(event) => {
          apply("paste", event.target.value);
        }}
      />
      {kind !== "" ? <p data-slot="source-drop-kind">kind: {kind}</p> : null}
      {error !== "" ? (
        <p data-slot="source-drop-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
