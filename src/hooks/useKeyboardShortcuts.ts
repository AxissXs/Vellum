"use client";

import { useState, useEffect, useCallback } from "react";

export const SHORTCUTS = [
  { key: "?", description: "Toggle keyboard shortcuts help" },
  { key: "n", description: "New task (opens add-task form)" },
  { key: "/", description: "Focus search" },
  { key: "Esc", description: "Close modal or cancel" },
];

function isInputActive(): boolean {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName.toLowerCase();
  const isEditable = "isContentEditable" in el && (el as HTMLElement).isContentEditable;
  return tag === "input" || tag === "textarea" || isEditable;
}

function isModalOpen(): boolean {
  return !!document.querySelector('[role="dialog"]');
}

export function useKeyboardShortcuts() {
  const [helpOpen, setHelpOpen] = useState(false);

  const toggleHelp = useCallback(() => {
    setHelpOpen((prev) => !prev);
  }, []);

  const closeHelp = useCallback(() => {
    setHelpOpen(false);
  }, []);

  useEffect(() => {
    function closeTopModal() {
      if (typeof window === "undefined") return;
      const modals = document.querySelectorAll<HTMLElement>('[role="dialog"]');
      if (modals.length === 0) return;

      const topModal = modals[modals.length - 1];
      const closeBtn = topModal.querySelector<HTMLElement>(
        'button[data-kbd-close="true"], [aria-label="Close"]'
      );
      if (closeBtn) {
        closeBtn.click();
        return;
      }

      const escEvent = new KeyboardEvent("keydown", {
        key: "Escape",
        bubbles: true,
      });
      topModal.dispatchEvent(escEvent);
    }

    function handleKeyDown(event: KeyboardEvent) {
      // N? and / should be suppressed when inputs are focused or a modal is open
      const inputFocused = isInputActive();
      const modalOpen = isModalOpen();

      // ? toggles help modal anytime
      if (event.key === "?" && !inputFocused) {
        event.preventDefault();
        toggleHelp();
        return;
      }

      // Esc closes modals (and help)
      if (event.key === "Escape") {
        if (helpOpen) {
          closeHelp();
          return;
        }
        closeTopModal();
        return;
      }

      // Block n and / when typing in inputs or when a modal is open
      if (inputFocused || modalOpen) return;

      if (event.key === "n" || event.key === "N") {
        event.preventDefault();
        window.dispatchEvent(new CustomEvent("keyboard:new-task", { detail: { status: "todo" } }));
        return;
      }

      if (event.key === "/") {
        event.preventDefault();
        window.dispatchEvent(new CustomEvent("keyboard:focus-search"));
        return;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [helpOpen, toggleHelp, closeHelp]);

  return { helpOpen, toggleHelp, closeHelp };
}
