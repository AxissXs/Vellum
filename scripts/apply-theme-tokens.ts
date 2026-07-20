/**
 * Bulk theme token replacement script.
 * Replaces hardcoded dark-theme Slate/white/black patterns with semantic tokens.
 */

import { readFile, writeFile } from "fs/promises";
import { glob } from "glob";

const files = await glob("src/**/*.{tsx,ts,css}");

const replacements = [
  // ── Surfaces ──
  { from: /bg-slate-950/g, to: "bg-surface-page" },
  { from: /bg-slate-900\b(?!\/)/g, to: "bg-surface-card" },
  { from: /bg-slate-900\/50/g, to: "bg-surface-card/50" },
  { from: /bg-slate-800\b(?!\/)/g, to: "bg-surface-strong" },
  { from: /bg-slate-800\/50/g, to: "bg-surface-strong/50" },
  { from: /bg-slate-700\b(?!\/)/g, to: "bg-surface-elevated" },
  { from: /bg-slate-950\/50/g, to: "bg-surface-page/50" },
  { from: /bg-slate-950\/60/g, to: "bg-surface-page/60" },

  // ── Text ──
  { from: /\btext-white\b(?!-[a-z])/g, to: "text-text-primary" },
  { from: /\btext-slate-100\b/g, to: "text-text-secondary" },
  { from: /\btext-slate-200\b/g, to: "text-text-secondary" },
  { from: /\btext-slate-300\b/g, to: "text-text-muted" },
  { from: /\btext-slate-400\b/g, to: "text-text-dim" },
  { from: /\btext-slate-500\b/g, to: "text-text-dim" },
  { from: /\btext-slate-600\b/g, to: "text-text-dim" },

  // ── White/black overlays (these are the trickiest) ──
  // bg-white/5  → overlay with 5% opacity of text-primary (white in dark, black in light)
  { from: /bg-white\/5/g, to: "bg-overlay-5" },
  { from: /bg-white\/10/g, to: "bg-overlay-10" },
  { from: /bg-white\/15/g, to: "bg-overlay-15" },
  { from: /bg-white\/\[0\.02\]/g, to: "bg-overlay-5" }, // very subtle
  { from: /bg-white\/\[0\.07\]/g, to: "bg-overlay-10" },

  // border-white/5 and /10
  { from: /border-white\/5/g, to: "border-border-subtle" },
  { from: /border-white\/10/g, to: "border-border-default" },
  { from: /border-white\/15/g, to: "border-border-strong" },

  // hover:bg-white/5, hover:bg-white/10
  { from: /hover:bg-white\/5/g, to: "hover:bg-overlay-hover" },
  { from: /hover:bg-white\/10/g, to: "hover:bg-overlay-active" },
  { from: /hover:bg-white\/15/g, to: "hover:bg-overlay-active" },

  // bg-black/50 → use a modal backdrop token (we'll add this)
  { from: /bg-black\/50/g, to: "bg-black/50" }, // keep for now, handle separately
  { from: /bg-black\/60/g, to: "bg-black/60" },

  // ── Focus ring offsets ──
  { from: /focus:ring-offset-slate-900/g, to: "focus:ring-offset-surface-card" },

  // ── Specific prose classes ──
  // prose-invert is dark-only; in light mode we want plain prose
  // We'll handle this with a data-attribute or class condition
  // For now, keep it as-is and we'll add a wrapper

  // ── Color-scheme override in CSS ── (handled in globals.css)
  // { from: /color-scheme:\s*dark/g, to: "color-scheme: dark" },
];

let totalReplacements = 0;
let filesChanged = 0;

for (const file of files) {
  if (file.includes("ThemeProvider")) continue;
  if (file.includes("ThemeToggle")) continue;
  if (file.includes("globals.css")) continue;

  let content = await readFile(file, "utf-8");
  let original = content;

  for (const { from, to } of replacements) {
    content = content.replace(from, to);
  }

  if (content !== original) {
    await writeFile(file, content, "utf-8");
    filesChanged++;
    for (const { from } of replacements) {
      const matches = original.match(from);
      if (matches) totalReplacements += matches.length;
    }
  }
}

console.log(`Replaced ~${totalReplacements} tokens across ${filesChanged} files.`);
