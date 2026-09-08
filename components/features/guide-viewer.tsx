"use client";

import React, { useState } from "react";
import { ExternalLink, Edit2, Save, X, Info } from "lucide-react";
import { ButtonPrimary, ButtonSecondary } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

interface GuideViewerProps {
  projectId: string;
  initialContent: string | null;
  onContentUpdated?: (newContent: string) => void;
}

/**
 * Parses plain text containing URLs and Markdown-style links [Label](url)
 * into interactive React elements.
 */
function renderInteractiveText(text: string) {
  // Regex to match markdown links [text](url) or standalone URLs
  const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s<>"']+)/g;

  const elements: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = linkRegex.exec(text)) !== null) {
    const matchStart = match.index;
    const matchEnd = linkRegex.lastIndex;

    // Text before match
    if (matchStart > lastIndex) {
      elements.push(text.slice(lastIndex, matchStart));
    }

    if (match[1] && match[2]) {
      // Markdown link [Label](URL)
      const label = match[1];
      const url = match[2];
      elements.push(
        <a
          key={`link-${matchStart}`}
          href={url}
          target="_blank"
          rel="noreferrer"
          className="text-link-teal hover:underline inline-flex items-center gap-1 font-medium break-all"
        >
          <span>{label}</span>
          <ExternalLink className="w-3 h-3 shrink-0" />
        </a>
      );
    } else if (match[3]) {
      // Standalone URL
      const url = match[3];
      elements.push(
        <a
          key={`url-${matchStart}`}
          href={url}
          target="_blank"
          rel="noreferrer"
          className="text-link-teal hover:underline inline-flex items-center gap-1 font-mono text-[13px] break-all"
        >
          <span>{url}</span>
          <ExternalLink className="w-3 h-3 shrink-0" />
        </a>
      );
    }

    lastIndex = matchEnd;
  }

  // Trailing text
  if (lastIndex < text.length) {
    elements.push(text.slice(lastIndex));
  }

  return elements;
}

export function GuideViewer({
  projectId,
  initialContent,
  onContentUpdated,
}: GuideViewerProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(initialContent || "");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync with prop change if needed
  React.useEffect(() => {
    setContent(initialContent || "");
  }, [initialContent]);

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    try {
      const supabase = createClient() as any;
      const { error: updateError } = await supabase
        .from("projects")
        .update({ guide_content: content.trim() || null })
        .eq("id", projectId);

      if (updateError) throw updateError;

      setIsEditing(false);
      if (onContentUpdated) {
        onContentUpdated(content);
      }
    } catch (err: any) {
      console.error("Failed to update guide content:", err);
      setError(err?.message || "Gagal menyimpan panduan.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setContent(initialContent || "");
    setIsEditing(false);
    setError(null);
  };

  if (isEditing) {
    return (
      <div className="space-y-3">
        {error && (
          <div className="p-2.5 rounded-md bg-status-overdue/10 border border-status-overdue/30 text-status-overdue text-caption">
            {error}
          </div>
        )}

        <div className="space-y-1.5">
          <textarea
            rows={8}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Tulis tutorial atau catatan pengerjaan di sini...&#10;Contoh:&#10;1. Klaim faucet harian di [Faucet Sepolia](https://sepoliafaucet.com)&#10;2. Masuk ke web testnet https://beta.project.io&#10;3. Lakukan mint NFT testnet"
            className="w-full bg-bg-elevated-2 text-text-primary text-body-sm p-3.5 rounded-md border border-border-hairline-strong focus:outline-none focus:border-accent font-sans leading-relaxed transition-colors"
            disabled={isSaving}
          />
          <div className="flex items-center gap-1.5 text-caption text-text-tertiary">
            <Info className="w-3.5 h-3.5 text-accent shrink-0" />
            <span>
              Tips: Tulis URL langsung seperti <code className="text-text-secondary font-mono">https://faucet.com</code> atau format markdown <code className="text-text-secondary font-mono">[Nama Link](https://...)</code> agar bisa langsung diklik.
            </span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-1">
          <ButtonSecondary
            type="button"
            onClick={handleCancel}
            disabled={isSaving}
            className="!py-1.5 !px-3 text-caption inline-flex items-center gap-1"
          >
            <X className="w-3.5 h-3.5" />
            <span>Batal</span>
          </ButtonSecondary>
          <ButtonPrimary
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="!py-1.5 !px-3 text-caption inline-flex items-center gap-1"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? "Menyimpan..." : "Simpan Panduan"}</span>
          </ButtonPrimary>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-caption text-text-tertiary">
          Format tutorial mendukung link web otomatis & markdown link.
        </span>
        <ButtonSecondary
          onClick={() => setIsEditing(true)}
          className="!py-1 !px-2.5 text-caption inline-flex items-center gap-1"
        >
          <Edit2 className="w-3 h-3" />
          <span>Edit Panduan</span>
        </ButtonSecondary>
      </div>

      {content ? (
        <div className="p-4 rounded-md bg-bg-elevated-2 text-body-sm text-text-secondary whitespace-pre-wrap leading-relaxed border border-border-hairline">
          {renderInteractiveText(content)}
        </div>
      ) : (
        <div className="p-4 rounded-md bg-bg-elevated-2/60 border border-dashed border-border-hairline text-center space-y-1.5">
          <p className="text-body-sm text-text-secondary">
            Belum ada panduan kerja atau link tutorial yang disimpan.
          </p>
          <p className="text-caption text-text-tertiary">
            Simpan alur langkah airdrop, link faucet harian, atau petunjuk bridge agar tidak lupa.
          </p>
          <ButtonSecondary
            onClick={() => setIsEditing(true)}
            className="!py-1 !px-3 text-caption mt-1 inline-flex items-center gap-1.5"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>Tulis Panduan Sekarang</span>
          </ButtonSecondary>
        </div>
      )}
    </div>
  );
}
