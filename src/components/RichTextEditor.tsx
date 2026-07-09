"use client";

import { useMemo, useRef, useState } from "react";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Heading2,
  Quote,
  Code,
  Eye,
  Edit3,
  Link as LinkIcon,
} from "lucide-react";
import { clsx } from "clsx";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function renderMarkdown(value: string) {
  if (!value.trim()) return "";

  const lines = escapeHtml(value).split("\n");
  const html: string[] = [];
  let inUl = false;
  let inOl = false;

  const inline = (text: string) =>
    text
      .replace(/`([^`]+)`/g, '<code class="rounded bg-slate-800 px-1 py-0.5 text-brand-300">$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\*([^*]+)\*/g, "<em>$1</em>")
      .replace(
        /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
        '<a class="text-brand-400 hover:text-brand-300 underline" target="_blank" rel="noreferrer" href="$2">$1</a>'
      );

  const closeLists = () => {
    if (inUl) {
      html.push("</ul>");
      inUl = false;
    }
    if (inOl) {
      html.push("</ol>");
      inOl = false;
    }
  };

  for (const line of lines) {
    if (!line.trim()) {
      closeLists();
      html.push('<div class="h-2"></div>');
      continue;
    }

    if (line.startsWith("## ")) {
      closeLists();
      html.push(`<h3 class="text-sm font-semibold text-white mt-3 mb-1">${inline(line.slice(3))}</h3>`);
    } else if (line.startsWith("# ")) {
      closeLists();
      html.push(`<h2 class="text-base font-semibold text-white mt-3 mb-1">${inline(line.slice(2))}</h2>`);
    } else if (line.startsWith("> ")) {
      closeLists();
      html.push(`<blockquote class="border-l-2 border-brand-500 pl-3 text-slate-400 italic">${inline(line.slice(2))}</blockquote>`);
    } else if (/^-\s+/.test(line)) {
      if (!inUl) {
        closeLists();
        html.push('<ul class="list-disc pl-5 space-y-1">');
        inUl = true;
      }
      html.push(`<li>${inline(line.replace(/^-\s+/, ""))}</li>`);
    } else if (/^\d+\.\s+/.test(line)) {
      if (!inOl) {
        closeLists();
        html.push('<ol class="list-decimal pl-5 space-y-1">');
        inOl = true;
      }
      html.push(`<li>${inline(line.replace(/^\d+\.\s+/, ""))}</li>`);
    } else {
      closeLists();
      html.push(`<p>${inline(line)}</p>`);
    }
  }

  closeLists();
  return html.join("");
}

export function RichTextPreview({ value, empty = "No content yet" }: { value: string; empty?: string }) {
  const html = useMemo(() => renderMarkdown(value), [value]);

  if (!html) {
    return <p className="text-sm text-slate-600 italic">{empty}</p>;
  }

  return (
    <div
      className="prose prose-invert prose-sm max-w-none text-sm leading-6 text-slate-300 space-y-2"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = "Write with markdown-style formatting...",
  rows = 6,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  label?: string;
}) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [mode, setMode] = useState<"edit" | "preview">("edit");

  function insert(before: string, after = "", sample = "text") {
    const el = textareaRef.current;
    if (!el) return;

    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = value.slice(start, end) || sample;
    const next = value.slice(0, start) + before + selected + after + value.slice(end);
    onChange(next);

    window.requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + before.length, start + before.length + selected.length);
    });
  }

  function prefix(prefixText: string) {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const lineStart = value.lastIndexOf("\n", start - 1) + 1;
    const next = value.slice(0, lineStart) + prefixText + value.slice(lineStart);
    onChange(next);
    window.requestAnimationFrame(() => el.focus());
  }

  const tools = [
    { icon: Heading2, label: "Heading", action: () => prefix("## ") },
    { icon: Bold, label: "Bold", action: () => insert("**", "**", "bold text") },
    { icon: Italic, label: "Italic", action: () => insert("*", "*", "italic text") },
    { icon: List, label: "Bullet list", action: () => prefix("- ") },
    { icon: ListOrdered, label: "Numbered list", action: () => prefix("1. ") },
    { icon: Quote, label: "Quote", action: () => prefix("> ") },
    { icon: Code, label: "Code", action: () => insert("`", "`", "code") },
    { icon: LinkIcon, label: "Link", action: () => insert("[", "](https://example.com)", "link text") },
  ];

  return (
    <div>
      {label && <label className="block text-sm font-medium text-slate-300 mb-1.5">{label}</label>}
      <div className="overflow-hidden rounded-lg border border-white/10 bg-white/5 focus-within:ring-2 focus-within:ring-brand-500">
        <div className="flex items-center justify-between gap-2 border-b border-white/10 bg-slate-950/40 px-2 py-1.5">
          <div className="flex flex-wrap items-center gap-1">
            {tools.map((tool) => {
              const Icon = tool.icon;
              return (
                <button
                  key={tool.label}
                  type="button"
                  onClick={tool.action}
                  title={tool.label}
                  className="rounded-md p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition"
                >
                  <Icon size={14} />
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-1 rounded-md bg-slate-900 p-0.5">
            <button
              type="button"
              onClick={() => setMode("edit")}
              className={clsx(
                "inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] transition",
                mode === "edit" ? "bg-brand-500 text-white" : "text-slate-400 hover:text-white"
              )}
            >
              <Edit3 size={12} /> Edit
            </button>
            <button
              type="button"
              onClick={() => setMode("preview")}
              className={clsx(
                "inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] transition",
                mode === "preview" ? "bg-brand-500 text-white" : "text-slate-400 hover:text-white"
              )}
            >
              <Eye size={12} /> Preview
            </button>
          </div>
        </div>
        {mode === "edit" ? (
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={rows}
            className="w-full resize-none bg-transparent px-4 py-3 text-sm leading-6 text-white placeholder:text-slate-500 focus:outline-none"
            placeholder={placeholder}
          />
        ) : (
          <div className="min-h-[120px] px-4 py-3">
            <RichTextPreview value={value} empty="Nothing to preview yet" />
          </div>
        )}
      </div>
      <p className="mt-1.5 text-[11px] text-slate-600">
        Supports headings, bold, italic, lists, quotes, inline code, and links.
      </p>
    </div>
  );
}
