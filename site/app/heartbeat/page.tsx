"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { id as boubaId, ALPHABET } from "boubakikid";
import { customAlphabet } from "nanoid";
import Nav from "@/components/nav";
import CanvasRenderer, { type CanvasHandle } from "@/components/canvas-renderer";
import { usePretextMeasure } from "@/hooks/use-pretext-measure";
import { useAnimationFrame } from "@/hooks/use-animation-frame";

const nanoidGen = customAlphabet(
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
  13
);

// Measure all chars we might encounter
const ALL_CHARS =
  "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

type WaveformPoint = { width: number; char: string };

type WaveformState = {
  points: WaveformPoint[];
  idBoundaries: number[]; // indices where new IDs start
};

function stdDev(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squaredDiffs = values.map((v) => (v - mean) ** 2);
  return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / values.length);
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export default function HeartbeatPage() {
  const { isReady, measureId } = usePretextMeasure("32px Inter", ALL_CHARS);

  const boubaCanvasRef = useRef<CanvasHandle>(null);
  const nanoidCanvasRef = useRef<CanvasHandle>(null);

  const boubaWaveRef = useRef<WaveformState>({ points: [], idBoundaries: [] });
  const nanoidWaveRef = useRef<WaveformState>({ points: [], idBoundaries: [] });

  const [autoPlay, setAutoPlay] = useState(true);
  const [boubaStats, setBoubaStats] = useState({ mean: 0, std: 0 });
  const [nanoidStats, setNanoidStats] = useState({ mean: 0, std: 0 });
  const [lastBoubaId, setLastBoubaId] = useState("");
  const [lastNanoidId, setLastNanoidId] = useState("");

  const tickRef = useRef(0);
  const maxPoints = 200;

  const addId = useCallback(() => {
    if (!isReady) return;

    const bId = boubaId();
    const nId = nanoidGen();

    const bWidths = measureId(bId);
    const nWidths = measureId(nId);

    const bWave = boubaWaveRef.current;
    const nWave = nanoidWaveRef.current;

    bWave.idBoundaries.push(bWave.points.length);
    nWave.idBoundaries.push(nWave.points.length);

    for (let i = 0; i < bId.length; i++) {
      bWave.points.push({ width: bWidths[i], char: bId[i] });
    }
    for (let i = 0; i < nId.length; i++) {
      nWave.points.push({ width: nWidths[i], char: nId[i] });
    }

    // Trim old data
    if (bWave.points.length > maxPoints) {
      const trim = bWave.points.length - maxPoints;
      bWave.points = bWave.points.slice(trim);
      bWave.idBoundaries = bWave.idBoundaries
        .map((b) => b - trim)
        .filter((b) => b >= 0);
    }
    if (nWave.points.length > maxPoints) {
      const trim = nWave.points.length - maxPoints;
      nWave.points = nWave.points.slice(trim);
      nWave.idBoundaries = nWave.idBoundaries
        .map((b) => b - trim)
        .filter((b) => b >= 0);
    }

    const allBWidths = bWave.points.map((p) => p.width);
    const allNWidths = nWave.points.map((p) => p.width);
    setBoubaStats({ mean: mean(allBWidths), std: stdDev(allBWidths) });
    setNanoidStats({ mean: mean(allNWidths), std: stdDev(allNWidths) });
    setLastBoubaId(bId);
    setLastNanoidId(nId);
  }, [isReady, measureId]);

  // Auto-generate on interval
  useEffect(() => {
    if (!autoPlay || !isReady) return;
    const interval = setInterval(addId, 600);
    return () => clearInterval(interval);
  }, [autoPlay, isReady, addId]);

  // Draw waveforms
  const drawWaveform = useCallback(
    (
      handle: CanvasHandle | null,
      wave: WaveformState,
      color: string,
      glowColor: string
    ) => {
      if (!handle?.ctx) return;
      const { ctx, width, height } = handle;

      // Clear with CRT-dark background
      ctx.fillStyle = "#050505";
      ctx.fillRect(0, 0, width, height);

      // Scanlines
      ctx.strokeStyle = "rgba(255,255,255,0.015)";
      ctx.lineWidth = 0.5;
      for (let y = 0; y < height; y += 3) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Grid lines
      ctx.strokeStyle = "rgba(255,255,255,0.05)";
      ctx.lineWidth = 0.5;
      for (let x = 0; x < width; x += width / 10) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();

      const points = wave.points;
      if (points.length < 2) return;

      // Normalize widths to canvas height
      const allWidths = points.map((p) => p.width);
      const minW = Math.min(...allWidths);
      const maxW = Math.max(...allWidths);
      const range = maxW - minW || 1;

      const padding = height * 0.15;
      const drawHeight = height - padding * 2;

      // ID boundaries — subtle vertical lines
      ctx.strokeStyle = "rgba(255,255,255,0.08)";
      ctx.lineWidth = 0.5;
      for (const boundary of wave.idBoundaries) {
        const x = (boundary / (maxPoints - 1)) * width;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }

      // Glow effect
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = 12;

      // Main waveform
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.beginPath();

      for (let i = 0; i < points.length; i++) {
        const x = (i / (maxPoints - 1)) * width;
        const normalized = (points[i].width - minW) / range;
        const y = padding + (1 - normalized) * drawHeight;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          // Cardinal spline interpolation for smooth curves
          const prev = points[i - 1];
          const prevX = ((i - 1) / (maxPoints - 1)) * width;
          const prevNorm = (prev.width - minW) / range;
          const prevY = padding + (1 - prevNorm) * drawHeight;

          const cpx = (prevX + x) / 2;
          ctx.quadraticCurveTo(prevX + (x - prevX) * 0.5, prevY, cpx, (prevY + y) / 2);
          ctx.quadraticCurveTo(x - (x - prevX) * 0.5, y, x, y);
        }
      }
      ctx.stroke();

      // Reset shadow
      ctx.shadowBlur = 0;

      // Draw dots at each point
      for (let i = 0; i < points.length; i++) {
        const x = (i / (maxPoints - 1)) * width;
        const normalized = (points[i].width - minW) / range;
        const y = padding + (1 - normalized) * drawHeight;

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    },
    []
  );

  useAnimationFrame(() => {
    drawWaveform(
      boubaCanvasRef.current,
      boubaWaveRef.current,
      "#4ade80",
      "#22c55e"
    );
    drawWaveform(
      nanoidCanvasRef.current,
      nanoidWaveRef.current,
      "#f87171",
      "#ef4444"
    );
  }, isReady);

  return (
    <div className="min-h-screen pt-12">
      <Nav />
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Typography Heartbeat</h1>
          <p className="text-[var(--muted)] max-w-2xl">
            Each character in a generated ID has a different pixel width.
            Plotted as a waveform, boubakikid IDs produce{" "}
            <span className="text-green-400">gentle, rolling waves</span> while
            standard nanoid IDs produce{" "}
            <span className="text-red-400">spiky, erratic signals</span>.
            Measured in real-time with pretext.js.
          </p>
        </div>

        <div className="flex gap-3 mb-6">
          <button
            onClick={addId}
            className="px-4 py-2 text-sm bg-neutral-800 hover:bg-neutral-700 rounded-md transition-colors"
          >
            Generate
          </button>
          <button
            onClick={() => setAutoPlay((v) => !v)}
            className={`px-4 py-2 text-sm rounded-md transition-colors ${
              autoPlay
                ? "bg-neutral-700 text-white"
                : "bg-neutral-800 text-[var(--muted)] hover:bg-neutral-700"
            }`}
          >
            {autoPlay ? "Auto ●" : "Auto ○"}
          </button>
        </div>

        {!isReady && (
          <div className="text-[var(--muted)] text-sm mb-4">
            Loading fonts and measuring characters...
          </div>
        )}

        {/* Boubakikid waveform */}
        <div className="mb-6">
          <div className="flex items-baseline justify-between mb-2">
            <div>
              <span className="text-green-400 text-sm font-medium">
                boubakikid
              </span>
              {lastBoubaId && (
                <code className="ml-3 text-xs text-neutral-500 font-mono">
                  {lastBoubaId}
                </code>
              )}
            </div>
            <div className="text-xs text-[var(--muted)] font-mono">
              μ={boubaStats.mean.toFixed(1)}px σ={boubaStats.std.toFixed(2)}px
            </div>
          </div>
          <div className="h-48 rounded-lg overflow-hidden border border-neutral-800">
            <CanvasRenderer ref={boubaCanvasRef} />
          </div>
        </div>

        {/* Nanoid waveform */}
        <div className="mb-8">
          <div className="flex items-baseline justify-between mb-2">
            <div>
              <span className="text-red-400 text-sm font-medium">nanoid</span>
              {lastNanoidId && (
                <code className="ml-3 text-xs text-neutral-500 font-mono">
                  {lastNanoidId}
                </code>
              )}
            </div>
            <div className="text-xs text-[var(--muted)] font-mono">
              μ={nanoidStats.mean.toFixed(1)}px σ=
              {nanoidStats.std.toFixed(2)}px
            </div>
          </div>
          <div className="h-48 rounded-lg overflow-hidden border border-neutral-800">
            <CanvasRenderer ref={nanoidCanvasRef} />
          </div>
        </div>

        {/* Explanation */}
        <div className="border border-neutral-800 rounded-lg p-6 text-sm text-[var(--muted)]">
          <p className="mb-2">
            <strong className="text-neutral-300">How it works:</strong>{" "}
            pretext.js measures the exact pixel width of each character in a
            given font using Canvas. Each point on the waveform is one
            character&apos;s width.
          </p>
          <p>
            boubakikid&apos;s alphabet ({ALPHABET.length} chars:{" "}
            <code className="text-neutral-400">{ALPHABET}</code>) produces
            lower variance because it excludes wide angular characters like{" "}
            <code className="text-neutral-400">k, v, w, x, z</code> and all
            uppercase. The result: a calmer signal.
          </p>
        </div>
      </div>
    </div>
  );
}
