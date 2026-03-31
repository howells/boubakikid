"use client";

import { useState, useMemo } from "react";
import { ALPHABET } from "boubakikid";
import Nav from "@/components/nav";
import { usePretextMeasure } from "@/hooks/use-pretext-measure";

const EXCLUDED = "kvwxz";
const FULL_LOWER = "abcdefghijklmnopqrstuvwxyz";
const DIGITS = "0123456789";
const ALL_CHARS = FULL_LOWER + DIGITS + FULL_LOWER.toUpperCase();

type ViewMode = "all" | "bouba" | "excluded";

type Cell = {
  char: string;
  width: number;
  area: number;
  x: number;
  y: number;
  w: number;
  h: number;
  category: "bouba" | "excluded" | "other";
};

// Squarified treemap layout
function squarify(
  items: { char: string; width: number; area: number; category: "bouba" | "excluded" | "other" }[],
  x: number,
  y: number,
  w: number,
  h: number
): Cell[] {
  const sorted = [...items].sort((a, b) => b.area - a.area);
  const totalArea = sorted.reduce((sum, item) => sum + item.area, 0);
  const cells: Cell[] = [];

  let cx = x,
    cy = y,
    cw = w,
    ch = h;
  let remaining = [...sorted];

  while (remaining.length > 0) {
    const isVertical = cw >= ch;
    const side = isVertical ? ch : cw;
    const remainingArea = remaining.reduce((sum, item) => sum + item.area, 0);

    // Find best row
    let bestRow: typeof remaining = [];
    let bestRatio = Infinity;

    for (let i = 1; i <= remaining.length; i++) {
      const row = remaining.slice(0, i);
      const rowArea = row.reduce((sum, item) => sum + item.area, 0);
      const rowWidth = (rowArea / remainingArea) * (isVertical ? cw : ch);

      let worstRatio = 0;
      for (const item of row) {
        const itemHeight = (item.area / rowArea) * side;
        const ratio = Math.max(rowWidth / itemHeight, itemHeight / rowWidth);
        worstRatio = Math.max(worstRatio, ratio);
      }

      if (worstRatio <= bestRatio) {
        bestRatio = worstRatio;
        bestRow = row;
      } else {
        break;
      }
    }

    // Layout the best row
    const rowArea = bestRow.reduce((sum, item) => sum + item.area, 0);
    const rowWidth = (rowArea / remainingArea) * (isVertical ? cw : ch);

    let offset = 0;
    for (const item of bestRow) {
      const itemSize = (item.area / rowArea) * side;

      cells.push({
        ...item,
        x: isVertical ? cx : cx + offset,
        y: isVertical ? cy + offset : cy,
        w: isVertical ? rowWidth : itemSize,
        h: isVertical ? itemSize : rowWidth,
      });

      offset += itemSize;
    }

    // Advance
    if (isVertical) {
      cx += rowWidth;
      cw -= rowWidth;
    } else {
      cy += rowWidth;
      ch -= rowWidth;
    }

    remaining = remaining.slice(bestRow.length);
  }

  return cells;
}

export default function HeatmapPage() {
  const [mode, setMode] = useState<ViewMode>("all");
  const [hoveredChar, setHoveredChar] = useState<string | null>(null);

  const { charWidths, isReady } = usePretextMeasure("48px Inter", ALL_CHARS);

  const cells = useMemo(() => {
    if (!isReady) return [];

    const items = [...ALL_CHARS]
      .map((char) => {
        const width = charWidths.get(char) ?? 0;
        const isBouba = ALPHABET.includes(char.toLowerCase()) && char === char.toLowerCase() && !EXCLUDED.includes(char);
        const isExcluded = EXCLUDED.includes(char.toLowerCase());

        let category: "bouba" | "excluded" | "other";
        if (isBouba || DIGITS.includes(char)) category = "bouba";
        else if (isExcluded) category = "excluded";
        else category = "other";

        return { char, width, area: width * width, category };
      })
      .filter((item) => {
        if (mode === "bouba") return item.category === "bouba";
        if (mode === "excluded") return item.category === "excluded";
        return true;
      });

    return squarify(items, 0, 0, 800, 500);
  }, [isReady, charWidths, mode]);

  const hovered = hoveredChar
    ? cells.find((c) => c.char === hoveredChar)
    : null;

  return (
    <div className="min-h-screen pt-12">
      <Nav />
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Character Weight Map</h1>
          <p className="text-[var(--muted)] max-w-2xl">
            Every character sized by its measured pixel width. The boubakikid
            alphabet occupies a visually cohesive region of the map.
          </p>
        </div>

        {/* Mode toggle */}
        <div className="flex gap-2 mb-6">
          {(
            [
              ["all", "All Characters"],
              ["bouba", "boubakikid only"],
              ["excluded", "Excluded only"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              onClick={() => setMode(value)}
              className={`px-4 py-1.5 text-sm rounded transition-colors ${
                mode === value
                  ? "bg-neutral-600 text-white"
                  : "bg-neutral-800 text-[var(--muted)] hover:bg-neutral-700"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {!isReady && (
          <div className="text-[var(--muted)] text-sm mb-4">
            Loading fonts and measuring characters...
          </div>
        )}

        {isReady && (
          <>
            {/* Treemap */}
            <div className="border border-neutral-800 rounded-lg overflow-hidden">
              <svg
                viewBox="0 0 800 500"
                className="w-full"
                style={{ aspectRatio: "800/500" }}
              >
                {cells.map((cell) => {
                  const isHovered = hoveredChar === cell.char;
                  const fillColor =
                    cell.category === "bouba"
                      ? isHovered
                        ? "rgba(139, 92, 246, 0.35)"
                        : "rgba(139, 92, 246, 0.15)"
                      : cell.category === "excluded"
                      ? isHovered
                        ? "rgba(239, 68, 68, 0.35)"
                        : "rgba(239, 68, 68, 0.15)"
                      : isHovered
                      ? "rgba(115, 115, 115, 0.25)"
                      : "rgba(115, 115, 115, 0.08)";

                  const strokeColor =
                    cell.category === "bouba"
                      ? "rgba(139, 92, 246, 0.4)"
                      : cell.category === "excluded"
                      ? "rgba(239, 68, 68, 0.4)"
                      : "rgba(115, 115, 115, 0.2)";

                  const textColor =
                    cell.category === "bouba"
                      ? "#a78bfa"
                      : cell.category === "excluded"
                      ? "#f87171"
                      : "#737373";

                  const fontSize = Math.min(cell.w, cell.h) * 0.5;

                  return (
                    <g
                      key={cell.char}
                      onMouseEnter={() => setHoveredChar(cell.char)}
                      onMouseLeave={() => setHoveredChar(null)}
                      style={{ cursor: "default" }}
                    >
                      <rect
                        x={cell.x}
                        y={cell.y}
                        width={cell.w}
                        height={cell.h}
                        fill={fillColor}
                        stroke={strokeColor}
                        strokeWidth={0.5}
                        rx={2}
                      />
                      {fontSize > 6 && (
                        <text
                          x={cell.x + cell.w / 2}
                          y={cell.y + cell.h / 2}
                          textAnchor="middle"
                          dominantBaseline="central"
                          fill={textColor}
                          fontSize={fontSize}
                          fontFamily="Inter"
                          fontWeight={500}
                        >
                          {cell.char}
                        </text>
                      )}
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Tooltip */}
            {hovered && (
              <div className="mt-4 text-sm font-mono text-[var(--muted)]">
                <span
                  className={
                    hovered.category === "bouba"
                      ? "text-violet-400"
                      : hovered.category === "excluded"
                      ? "text-red-400"
                      : "text-neutral-400"
                  }
                >
                  &apos;{hovered.char}&apos;
                </span>{" "}
                — {hovered.width.toFixed(1)}px width —{" "}
                {hovered.category === "bouba"
                  ? "boubakikid alphabet"
                  : hovered.category === "excluded"
                  ? "excluded (angular)"
                  : "uppercase (not in boubakikid)"}
              </div>
            )}

            {/* Legend */}
            <div className="mt-6 flex gap-6 text-xs text-[var(--muted)]">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm bg-violet-500/30 border border-violet-500/50" />
                boubakikid ({ALPHABET.length} chars)
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm bg-red-500/30 border border-red-500/50" />
                excluded ({EXCLUDED.length} angular chars)
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm bg-neutral-500/20 border border-neutral-500/30" />
                uppercase (not in boubakikid)
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
