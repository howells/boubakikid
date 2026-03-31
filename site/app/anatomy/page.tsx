"use client";

import { useState, useMemo } from "react";
import { ALPHABET } from "boubakikid";
import Nav from "@/components/nav";
import { usePretextMeasure } from "@/hooks/use-pretext-measure";

const EXCLUDED = "kvwxz";
const FULL_LOWER = "abcdefghijklmnopqrstuvwxyz";
const DIGITS = "0123456789";
const ALL_CHARS = FULL_LOWER + DIGITS;

const FONTS = ["Inter", "Georgia", "Helvetica", "Courier New"];
const WEIGHTS = [300, 400, 500, 600, 700];

function polygon(
  cx: number,
  cy: number,
  r: number,
  sides: number,
  rotation: number = 0
): string {
  const points: string[] = [];
  for (let i = 0; i < sides; i++) {
    const angle = (Math.PI * 2 * i) / sides - Math.PI / 2 + rotation;
    points.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
  }
  return points.join(" ");
}

export default function AnatomyPage() {
  const [font, setFont] = useState("Inter");
  const [weight, setWeight] = useState(400);

  const fontString = `${weight} 48px ${font}`;
  const { charWidths, isReady } = usePretextMeasure(fontString, ALL_CHARS);

  const { included, excluded, stats } = useMemo(() => {
    if (!isReady) return { included: [], excluded: [], stats: null };

    const includedChars = [...ALPHABET].filter((c) => /[a-z]/.test(c));
    const excludedChars = [...EXCLUDED];

    const getWidth = (c: string) => charWidths.get(c) ?? 0;

    const incWidths = includedChars.map(getWidth);
    const excWidths = excludedChars.map(getWidth);
    const allWidths = [...incWidths, ...excWidths];

    const minW = Math.min(...allWidths);
    const maxW = Math.max(...allWidths);

    const normalize = (w: number) => {
      const range = maxW - minW || 1;
      return 28 + ((w - minW) / range) * 44; // 28-72px range
    };

    return {
      included: includedChars.map((c) => ({
        char: c,
        width: getWidth(c),
        size: normalize(getWidth(c)),
      })),
      excluded: excludedChars.map((c) => ({
        char: c,
        width: getWidth(c),
        size: normalize(getWidth(c)),
      })),
      stats: {
        incMean:
          incWidths.reduce((a, b) => a + b, 0) / incWidths.length,
        excMean:
          excWidths.reduce((a, b) => a + b, 0) / excWidths.length,
        incStd: Math.sqrt(
          incWidths
            .map(
              (w) =>
                (w - incWidths.reduce((a, b) => a + b, 0) / incWidths.length) **
                2
            )
            .reduce((a, b) => a + b, 0) / incWidths.length
        ),
        excStd: Math.sqrt(
          excWidths
            .map(
              (w) =>
                (w - excWidths.reduce((a, b) => a + b, 0) / excWidths.length) **
                2
            )
            .reduce((a, b) => a + b, 0) / excWidths.length
        ),
      },
    };
  }, [isReady, charWidths]);

  // Warm palette for round chars
  const warmColors = [
    "#f9a8d4", "#f0abfc", "#c4b5fd", "#93c5fd", "#86efac",
    "#fcd34d", "#fca5a5", "#fdba74", "#d8b4fe", "#a5b4fc",
    "#67e8f9", "#a7f3d0", "#fde68a", "#fed7aa", "#fbcfe8",
    "#e9d5ff", "#bfdbfe", "#bbf7d0", "#fef08a", "#fecaca",
    "#c084fc",
  ];

  // Cold palette for angular chars
  const coldColors = ["#ef4444", "#f97316", "#eab308", "#ec4899", "#8b5cf6"];

  return (
    <div className="min-h-screen pt-12">
      <Nav />
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Glyph Anatomy</h1>
          <p className="text-[var(--muted)] max-w-2xl">
            Each character sized by its actual pixel width, measured by
            pretext.js. Round characters from the boubakikid alphabet appear as{" "}
            <span className="text-violet-400">circles</span>; excluded angular
            characters appear as{" "}
            <span className="text-red-400">polygons</span>.
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap gap-4 mb-8">
          <div>
            <label className="block text-xs text-[var(--muted)] mb-1">
              Font
            </label>
            <select
              value={font}
              onChange={(e) => setFont(e.target.value)}
              className="bg-neutral-800 text-sm px-3 py-1.5 rounded border border-neutral-700"
            >
              {FONTS.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-[var(--muted)] mb-1">
              Weight
            </label>
            <div className="flex gap-1">
              {WEIGHTS.map((w) => (
                <button
                  key={w}
                  onClick={() => setWeight(w)}
                  className={`px-3 py-1.5 text-sm rounded transition-colors ${
                    weight === w
                      ? "bg-neutral-600 text-white"
                      : "bg-neutral-800 text-[var(--muted)] hover:bg-neutral-700"
                  }`}
                >
                  {w}
                </button>
              ))}
            </div>
          </div>
        </div>

        {!isReady && (
          <div className="text-[var(--muted)] text-sm mb-4">
            Loading fonts and measuring characters...
          </div>
        )}

        {isReady && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Round characters */}
            <div>
              <h2 className="text-sm font-medium text-violet-400 mb-4">
                boubakikid alphabet — round
              </h2>
              <div className="flex flex-wrap gap-3 items-end">
                {included.map((item, i) => (
                  <div
                    key={item.char}
                    className="flex flex-col items-center gap-1"
                  >
                    <svg
                      width={item.size}
                      height={item.size}
                      viewBox={`0 0 ${item.size} ${item.size}`}
                    >
                      <circle
                        cx={item.size / 2}
                        cy={item.size / 2}
                        r={item.size / 2 - 1}
                        fill={warmColors[i % warmColors.length]}
                        opacity={0.2}
                        stroke={warmColors[i % warmColors.length]}
                        strokeWidth={1.5}
                      />
                      <text
                        x={item.size / 2}
                        y={item.size / 2}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fill={warmColors[i % warmColors.length]}
                        fontSize={item.size * 0.45}
                        fontFamily={font}
                        fontWeight={weight}
                      >
                        {item.char}
                      </text>
                    </svg>
                    <span className="text-[10px] text-neutral-600 font-mono">
                      {item.width.toFixed(1)}
                    </span>
                  </div>
                ))}
              </div>

              {stats && (
                <div className="mt-4 text-xs text-[var(--muted)] font-mono">
                  μ={stats.incMean.toFixed(1)}px σ={stats.incStd.toFixed(2)}px
                </div>
              )}
            </div>

            {/* Angular characters */}
            <div>
              <h2 className="text-sm font-medium text-red-400 mb-4">
                excluded — angular
              </h2>
              <div className="flex flex-wrap gap-3 items-end">
                {excluded.map((item, i) => {
                  const sides = [3, 5, 4, 6, 3][i]; // Different polygon per char
                  const rotation = [0, 0.3, Math.PI / 4, 0, 0.6][i];
                  return (
                    <div
                      key={item.char}
                      className="flex flex-col items-center gap-1"
                    >
                      <svg
                        width={item.size}
                        height={item.size}
                        viewBox={`0 0 ${item.size} ${item.size}`}
                      >
                        <polygon
                          points={polygon(
                            item.size / 2,
                            item.size / 2,
                            item.size / 2 - 1,
                            sides,
                            rotation
                          )}
                          fill={coldColors[i % coldColors.length]}
                          opacity={0.2}
                          stroke={coldColors[i % coldColors.length]}
                          strokeWidth={1.5}
                        />
                        <text
                          x={item.size / 2}
                          y={item.size / 2}
                          textAnchor="middle"
                          dominantBaseline="central"
                          fill={coldColors[i % coldColors.length]}
                          fontSize={item.size * 0.45}
                          fontFamily={font}
                          fontWeight={weight}
                        >
                          {item.char}
                        </text>
                      </svg>
                      <span className="text-[10px] text-neutral-600 font-mono">
                        {item.width.toFixed(1)}
                      </span>
                    </div>
                  );
                })}
              </div>

              {stats && (
                <div className="mt-4 text-xs text-[var(--muted)] font-mono">
                  μ={stats.excMean.toFixed(1)}px σ={stats.excStd.toFixed(2)}px
                </div>
              )}
            </div>
          </div>
        )}

        {/* Width distribution bar */}
        {isReady && (
          <div className="mt-12 border border-neutral-800 rounded-lg p-6">
            <h3 className="text-sm font-medium text-neutral-300 mb-4">
              Width Distribution
            </h3>
            <div className="space-y-1">
              {[...included, ...excluded]
                .sort((a, b) => a.width - b.width)
                .map((item) => {
                  const isExcluded = EXCLUDED.includes(item.char);
                  const maxWidth = Math.max(
                    ...included.map((i) => i.width),
                    ...excluded.map((i) => i.width)
                  );
                  const pct = (item.width / maxWidth) * 100;
                  return (
                    <div key={item.char} className="flex items-center gap-2">
                      <span
                        className={`w-4 text-center text-xs font-mono ${
                          isExcluded ? "text-red-400" : "text-violet-400"
                        }`}
                      >
                        {item.char}
                      </span>
                      <div className="flex-1 h-3 bg-neutral-900 rounded-sm overflow-hidden">
                        <div
                          className={`h-full rounded-sm transition-all duration-500 ${
                            isExcluded ? "bg-red-500/40" : "bg-violet-500/40"
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-neutral-600 font-mono w-12 text-right">
                        {item.width.toFixed(1)}px
                      </span>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
