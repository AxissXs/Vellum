"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Search, X, Check } from "lucide-react";
import { clsx } from "clsx";

type Team = { id: string; name: string };

export default function TeamMultiSelect({
  teams,
  selected,
  onChange,
}: {
  teams: Team[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  const filtered = useMemo(() => {
    if (!query.trim()) return teams;
    const q = query.toLowerCase();
    return teams.filter((t) => t.name.toLowerCase().includes(q));
  }, [teams, query]);

  function toggle(id: string) {
    onChange(selected.includes(id) ? selected.filter((i) => i !== id) : [...selected, id]);
  }

  const selectedNames = teams.filter((t) => selected.includes(t.id)).map((t) => t.name);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={clsx(
          "w-full rounded-lg border bg-overlay-5 px-3 py-2 text-sm text-left focus:outline-none focus:ring-2 focus:ring-brand-500 transition",
          open ? "border-brand-500 ring-2 ring-brand-500" : "border-border-default"
        )}
      >
        {selected.length === 0 ? (
          <span className="text-text-dim">Select teams...</span>
        ) : (
          <span className="text-text-primary">{selected.length} team{selected.length !== 1 ? "s" : ""} selected</span>
        )}
      </button>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {selectedNames.map((name) => (
            <span key={name} className="inline-flex items-center gap-1 rounded-md bg-brand-500/10 border border-brand-500/20 px-2 py-0.5 text-xs text-brand-400">
              {name}
              <button
                type="button"
                onClick={() => onChange(selected.filter((id) => teams.find((t) => t.id === id)?.name === name))}
                className="hover:text-brand-300"
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-border-default bg-surface-card shadow-xl overflow-hidden">
          <div className="border-b border-border-subtle p-2">
            <div className="flex items-center gap-2 rounded-md bg-overlay-5 px-2 py-1.5">
              <Search size={14} className="text-text-dim flex-shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search teams..."
                className="w-full bg-transparent text-sm text-text-primary placeholder:text-text-dim focus:outline-none"
              />
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <p className="px-3 py-4 text-center text-xs text-text-dim">No teams found</p>
            ) : (
              filtered.map((team) => {
                const isSelected = selected.includes(team.id);
                return (
                  <button
                    key={team.id}
                    type="button"
                    onClick={() => toggle(team.id)}
                    className={clsx(
                      "flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition",
                      isSelected ? "bg-brand-500/10 text-brand-400" : "text-text-primary hover:bg-overlay-hover"
                    )}
                  >
                    <div className={clsx(
                      "h-4 w-4 rounded border flex items-center justify-center flex-shrink-0 transition",
                      isSelected ? "border-brand-500 bg-brand-500" : "border-border-default"
                    )}>
                      {isSelected && <Check size={12} className="text-text-inverse" />}
                    </div>
                    {team.name}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
