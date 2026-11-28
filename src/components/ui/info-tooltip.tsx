"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface InfoTooltipProps {
  label: string;
  text: string;
  className?: string;
}

/**
 * Small "i" icon that reveals a short Indonesian explanation on hover or click/tap.
 * Uses fixed viewport positioning so it is never clipped inside scrollable tables.
 */
export function InfoTooltip({ label, text, className }: InfoTooltipProps) {
  const tooltipId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [openByClick, setOpenByClick] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);

  const isOpen = openByClick || hovered;

  useEffect(() => {
    if (!isOpen) return;

    function updatePosition() {
      const btn = buttonRef.current;
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      const width = 256;
      const margin = 12;
      const centeredLeft = rect.left + rect.width / 2 - width / 2;
      const left = Math.max(
        margin,
        Math.min(centeredLeft, window.innerWidth - width - margin),
      );
      const top = rect.bottom + 8;
      setCoords({ top, left });
    }

    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!openByClick) return;

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node | null;
      if (
        buttonRef.current?.contains(target) ||
        popoverRef.current?.contains(target)
      ) {
        return;
      }
      setOpenByClick(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpenByClick(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [openByClick]);

  return (
    <span
      className={cn("inline-flex items-center align-middle", className)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        ref={buttonRef}
        type="button"
        aria-label={`Penjelasan ${label}`}
        aria-expanded={isOpen}
        aria-describedby={isOpen ? tooltipId : undefined}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpenByClick((prev) => !prev);
        }}
        className="inline-flex size-4 items-center justify-center rounded-full text-muted-foreground/80 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Info aria-hidden="true" className="size-3.5" />
      </button>

      {isOpen && coords && (
        <div
          ref={popoverRef}
          id={tooltipId}
          role="tooltip"
          style={{ top: coords.top, left: coords.left }}
          className="fixed z-50 w-64 rounded-lg border bg-popover px-3 py-2 text-left text-xs leading-relaxed font-normal whitespace-normal text-popover-foreground shadow-md"
        >
          {text}
        </div>
      )}
    </span>
  );
}
