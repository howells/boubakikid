"use client";

import { useEffect, useState, useCallback } from "react";

type MeasureResult = {
  /** Map of character → pixel width at the measured font */
  charWidths: Map<string, number>;
  /** Whether fonts are loaded and measurement is complete */
  isReady: boolean;
  /** Measure a full string, returning per-character widths */
  measureId: (id: string) => number[];
};

/**
 * Measures individual character pixel widths using pretext.js.
 *
 * Waits for the specified font to load, then uses prepareWithSegments
 * to get accurate per-character widths from the Canvas API.
 *
 * @param font - Resolved CSS font string, e.g. "32px Inter" (NOT a CSS variable)
 * @param characters - Characters to measure (defaults to full alphanumeric)
 */
export function usePretextMeasure(
  font: string = "32px Inter",
  characters?: string
): MeasureResult {
  const [charWidths, setCharWidths] = useState<Map<string, number>>(
    () => new Map()
  );
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function measure() {
      // Wait for fonts to be available
      await document.fonts.ready;

      // Dynamic import — pretext.js uses Canvas internally
      const { prepareWithSegments } = await import("@chenglou/pretext");

      const chars =
        characters ?? "0123456789abcdefghijklmnopqrstuvwxyz";
      const widths = new Map<string, number>();

      for (const char of chars) {
        const prepared = prepareWithSegments(char, font);
        widths.set(char, prepared.widths[0]);
      }

      if (!cancelled) {
        setCharWidths(widths);
        setIsReady(true);
      }
    }

    measure();

    return () => {
      cancelled = true;
    };
  }, [font, characters]);

  const measureId = useCallback(
    (id: string): number[] => {
      return [...id].map((char) => charWidths.get(char) ?? 0);
    },
    [charWidths]
  );

  return { charWidths, isReady, measureId };
}
