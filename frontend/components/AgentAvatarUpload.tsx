"use client";

import { useState } from "react";
import { AgentAvatar } from "./AgentAvatar";

interface Props {
  agentId: number;
  currentLogoUrl?: string | null;
  onUpload: (url: string) => void;
}

export function AgentAvatarUpload({ agentId, currentLogoUrl, onUpload }: Props) {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentLogoUrl ?? null);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("Image must be under 2MB.");
      return;
    }

    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/upload/logo", { method: "POST", body: form });
      if (!res.ok) throw new Error("Upload failed");
      const { url } = await res.json();
      setPreviewUrl(url);
      onUpload(url);
    } catch {
      setError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  function handleRemove() {
    setPreviewUrl(null);
    onUpload("");
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
      <AgentAvatar agentId={agentId} logoUrl={previewUrl} badgeTier="NONE" size={64} showTooltip={false} />
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <label style={{ fontSize: "13px", fontWeight: 600, color: "#2563EB", cursor: "pointer", textDecoration: "underline", textUnderlineOffset: "2px" }}>
            {uploading ? "Uploading…" : previewUrl ? "Change logo" : "Upload logo"}
            <input type="file" accept="image/*" onChange={handleFile} disabled={uploading} style={{ display: "none" }} />
          </label>
          {previewUrl && (
            <button onClick={handleRemove} style={{ fontSize: "13px", color: "#94a3b8", background: "none", border: "none", cursor: "pointer" }}>
              Remove
            </button>
          )}
        </div>
        <p style={{ fontSize: "11px", color: "#94a3b8", marginTop: "4px" }}>
          {previewUrl ? "Custom logo active." : "Using generated robot avatar. Upload a custom logo optionally."}
        </p>
        {error && <p style={{ fontSize: "11px", color: "#ef4444", marginTop: "4px" }}>{error}</p>}
      </div>
    </div>
  );
}
