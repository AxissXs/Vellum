"use client";

import { X, Keyboard } from "lucide-react";
import { clsx } from "clsx";
import { SHORTCUTS } from "@/hooks/useKeyboardShortcuts";

interface KeyboardShortcutsHelpProps {
  open: boolean;
  onClose: () => void;
}

export default function KeyboardShortcutsHelp({ open, onClose }: KeyboardShortcutsHelpProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-2xl shadow-2xl p-6 mx-4">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Keyboard size={20} className="text-brand-400" />
            <h2 className="text-lg font-semibold text-white">Keyboard Shortcuts</h2>
          </div>
          <button
            data-kbd-close="true"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-2.5">
          {SHORTCUTS.map((s) => (
            <div
              key={s.key}
              className="flex items-center justify-between gap-4 rounded-lg bg-white/5 px-3 py-2"
            >
              <span className="text-sm text-slate-300">{s.description}</span>
              <kbd
                className={clsx(
                  "inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 rounded-md",
                  "bg-slate-800 border border-white/10 text-xs font-mono text-white shadow-sm"
                )}
              >
                {s.key}
              </kbd>
            </div>
          ))}
        </div>

        <p className="mt-5 text-xs text-slate-500 text-center">
          Press <kbd className="px-1 rounded bg-slate-800 border border-white/10 text-[10px] text-white">Esc</kbd> to close
        </p>
      </div>
    </div>
  );
}
