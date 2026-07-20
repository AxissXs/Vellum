"use client";

import { useMemo, useRef, useState, useEffect, useCallback } from "react";
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
  AtSign,
} from "lucide-react";
import { clsx } from "clsx";

type User = { id: string; name: string; avatarUrl: string | null };

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "\u0026amp;")
    .replaceAll("<", "\u0026lt;")
    .replaceAll(">", "\u0026gt;")
    .replaceAll('"', "\u0026quot;")
    .replaceAll("'", "\u0026#039;");
}

export function renderMarkdown(value: string) {
  if (!value.trim()) return "";

  const lines = escapeHtml(value).split("\n");
  const html: string[] = [];
  let inUl = false;
  let inOl = false;

  const inline = (text: string) =>
    text
      .replace(/`([^`]+)`/g, '<code class="rounded bg-surface-strong px-1 py-0.5 text-brand-400">$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\*([^*]+)\*/g, "<em>$1</em>")
      .replace(
        /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
        '<a class="text-brand-400 hover:text-brand-300 underline" target="_blank" rel="noreferrer" href="$2">$1</a>'
      )
      .replace(/@(\w+)/g, '<span class="text-brand-400 font-medium">@$1</span>');

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
      html.push(`<h3 class="text-sm font-semibold text-text-primary mt-3 mb-1">${inline(line.slice(3))}</h3>`);
    } else if (line.startsWith("# ")) {
      closeLists();
      html.push(`<h2 class="text-base font-semibold text-text-primary mt-3 mb-1">${inline(line.slice(2))}</h2>`);
    } else if (line.startsWith("> ")) {
      closeLists();
      html.push(`<blockquote class="border-l-2 border-brand-500 pl-3 text-text-dim italic">${inline(line.slice(2))}</blockquote>`);
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
    return <p className="text-sm text-text-dim italic">{empty}</p>;
  }

  return (
    <div
      className="prose dark:prose-invert prose-sm max-w-none text-sm leading-6 text-text-muted space-y-2"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  label?: string;
  users?: User[];
  onMentionSelect?: (user: User) => void;
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = "Write with markdown-style formatting...",
  rows = 6,
  label,
  users = [],
  onMentionSelect,
}: RichTextEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionPosition, setMentionPosition] = useState<{ top: number; left: number } | null>(null);
  const mentionListRef = useRef<HTMLDivElement | null>(null);

  const filteredUsers = useMemo(() => {
    if (!mentionQuery) return users;
    return users.filter((u) => u.name.toLowerCase().includes(mentionQuery.toLowerCase()));
  }, [users, mentionQuery]);

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

  const handleMentionSelect = useCallback((user: User) => {
    const el = textareaRef.current;
    if (!el) return;

    const start = el.selectionStart;
    // Find the @ position
    const beforeCursor = value.slice(0, start);
    const atIndex = beforeCursor.lastIndexOf("@");
    
    if (atIndex === -1) return;

    // Replace @query with @username
    const next = value.slice(0, atIndex) + `@${user.name.split(" ")[0]}` + value.slice(start);
    onChange(next);

    window.requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(atIndex + 1 + user.name.split(" ")[0].length, atIndex + 1 + user.name.split(" ")[0].length);
    });

    setShowMentions(false);
    setMentionQuery("");
    onMentionSelect?.(user);
  }, [onChange, onMentionSelect, value]);

  const handleInput = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    onChange(newValue);

    const cursorPos = e.target.selectionStart;
    const beforeCursor = newValue.slice(0, cursorPos);
    const afterCursor = newValue.slice(cursorPos);

    // Check if we're typing @ at the beginning or after a space/newline
    const lastAtIndex = beforeCursor.lastIndexOf("@");
    const charBeforeAt = lastAtIndex > 0 ? beforeCursor[lastAtIndex - 1] : "";
    
    // Check if there's no @ after the current one (we're in a mention)
    const nextAtIndex = afterCursor.indexOf("@");
    
    if (lastAtIndex !== -1 && 
        (lastAtIndex === 0 || /\s/.test(charBeforeAt)) &&
        nextAtIndex === -1 &&
        !beforeCursor.slice(lastAtIndex + 1).includes(" ")) {
      // We're in a mention
      const query = beforeCursor.slice(lastAtIndex + 1);
      setMentionQuery(query);
      setShowMentions(true);
      
      // Calculate position for dropdown
      const textarea = e.target;
      const textBeforeCursor = beforeCursor.slice(lastAtIndex + 1);
      // Approximate position - in reality this would need more precise measurement
      setMentionPosition({ top: 0, left: 0 }); // Will be positioned relative to textarea
    } else if (!beforeCursor.slice(lastAtIndex + 1).match(/^\w*$/)) {
      // Not a valid mention query
      setShowMentions(false);
      setMentionQuery("");
    }
  }, [onChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showMentions && filteredUsers.length > 0) {
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        handleMentionSelect(filteredUsers[0]);
      } else if (e.key === "Escape") {
        setShowMentions(false);
        setMentionQuery("");
      }
    }
  }, [showMentions, filteredUsers, handleMentionSelect]);

  // Click outside to close mentions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (mentionListRef.current && !mentionListRef.current.contains(event.target as Node)) {
        setShowMentions(false);
        setMentionQuery("");
      }
    };
    
    if (showMentions) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showMentions]);

  const tools = useMemo(() => [
    { icon: Heading2, label: "Heading", action: () => prefix("## ") },
    { icon: Bold, label: "Bold", action: () => insert("**", "**", "bold text") },
    { icon: Italic, label: "Italic", action: () => insert("*", "*", "italic text") },
    { icon: List, label: "Bullet list", action: () => prefix("- ") },
    { icon: ListOrdered, label: "Numbered list", action: () => prefix("1. ") },
    { icon: Quote, label: "Quote", action: () => prefix("> ") },
    { icon: Code, label: "Code", action: () => insert("`", "`", "code") },
    { icon: LinkIcon, label: "Link", action: () => insert("[", "](https://example.com)", "link text") },
  ], [prefix, insert]);

  return (
    <div>
      {label && <label className="block text-sm font-medium text-text-muted mb-1.5">{label}</label>}
      <div className="relative">
        <div className="overflow-hidden rounded-lg border border-border-default bg-overlay-5 focus-within:ring-2 focus-within:ring-brand-500">
          <div className="flex items-center justify-between gap-2 border-b border-border-default bg-surface-page/40 px-2 py-1.5">
            <div className="flex flex-wrap items-center gap-1">
              {tools.map((tool) => {
                const Icon = tool.icon;
                return (
                  <button
                    key={tool.label}
                    type="button"
                    onClick={tool.action}
                    title={tool.label}
                    className="rounded-md p-1.5 text-text-dim hover:bg-overlay-10 hover:text-text-primary transition"
                  >
                    <Icon size={14} />
                  </button>
                );
              })}
              {users.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setShowMentions(true);
                    setMentionQuery("");
                    textareaRef.current?.focus();
                  }}
                  title="Mention user"
                  className="rounded-md p-1.5 text-text-dim hover:bg-overlay-10 hover:text-text-primary transition"
                >
                  <AtSign size={14} />
                </button>
              )}
            </div>
            <div className="flex items-center gap-1 rounded-md bg-surface-card p-0.5">
              <button
                type="button"
                onClick={() => setMode("edit")}
                className={clsx(
                  "inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] transition",
                  mode === "edit" ? "bg-brand-500 text-text-primary" : "text-text-dim hover:text-text-primary"
                )}
              >
                <Edit3 size={12} /> Edit
              </button>
              <button
                type="button"
                onClick={() => setMode("preview")}
                className={clsx(
                  "inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] transition",
                  mode === "preview" ? "bg-brand-500 text-text-primary" : "text-text-dim hover:text-text-primary"
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
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              rows={rows}
              className="w-full resize-none border-0 bg-transparent px-4 py-3 text-sm text-text-primary placeholder:text-text-dim focus:outline-none min-h-[120px]"
              spellCheck={false}
            />
          ) : (
            <RichTextPreview value={value} />
          )}

          {/* Mentions dropdown */}
          {showMentions && filteredUsers.length > 0 && (
            <div
              ref={mentionListRef}
              className="absolute z-50 bottom-full left-4 mb-1 w-56 bg-surface-card border border-border-default rounded-lg shadow-xl py-1 animate-slide-in"
            >
              {filteredUsers.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => handleMentionSelect(user)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-muted hover:bg-overlay-5 hover:text-text-primary transition"
                >
                  <div className="h-7 w-7 rounded-full bg-brand-500/20 border border-brand-500/30 flex items-center justify-center text-[11px] font-bold text-brand-400 flex-shrink-0">
                    {user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                  </div>
                  <span className="truncate">{user.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}