"use client";

import { Sun, Moon, Monitor } from "lucide-react";
import { useTheme, useIsMounted } from "@/providers/ThemeProvider";
import { useState, useRef, useEffect } from "react";

type ThemeOption = { value: "system" | "light" | "dark"; label: string; icon: React.ReactNode };

const options: ThemeOption[] = [
  { value: "system", label: "System", icon: <Monitor size={14} /> },
  { value: "light", label: "Light", icon: <Sun size={14} /> },
  { value: "dark", label: "Dark", icon: <Moon size={14} /> },
];

export default function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const mounted = useIsMounted();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  // Prevent hydration mismatch: render nothing until mounted
  if (!mounted) {
    return (
      <button
        className="p-2 rounded-lg transition"
        aria-label="Theme"
        disabled
      >
        <span className="sr-only">Loading theme toggle</span>
      </button>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="p-2 rounded-lg text-text-dim hover:text-text-primary hover:bg-overlay-hover transition"
        aria-label="Toggle theme"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {resolvedTheme === "dark" ? <Moon size={18} /> : <Sun size={18} />}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-36 bg-surface-card border border-border-default rounded-xl shadow-2xl py-1.5 z-50 animate-slide-in">
          {options.map((option) => (
            <button
              key={option.value}
              onClick={() => {
                setTheme(option.value);
                setOpen(false);
              }}
              className={[
                "w-full flex items-center gap-2.5 px-3 py-2 text-sm transition",
                theme === option.value
                  ? "text-brand-400 bg-brand-500/10"
                  : "text-text-muted hover:bg-overlay-hover hover:text-text-primary",
              ].join(" ")}
            >
              {option.icon}
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
