"use client";

import { useRef, useState, useCallback } from "react";
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

const ALL_CHARS =
  "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

type Bubble = {
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  r: number;
  char: string;
  color: string;
  settled: boolean;
};

const WARM_PALETTE = [
  "#c4b5fd", "#a78bfa", "#93c5fd", "#67e8f9", "#86efac",
  "#d8b4fe", "#f0abfc", "#f9a8d4", "#fda4af", "#fcd34d",
];

const COLD_PALETTE = [
  "#ef4444", "#f97316", "#eab308", "#ec4899", "#8b5cf6",
  "#f43f5e", "#fb923c", "#facc15", "#d946ef", "#a855f7",
];

export default function BubblesPage() {
  const { isReady, charWidths } = usePretextMeasure("32px Inter", ALL_CHARS);
  const boubaCanvasRef = useRef<CanvasHandle>(null);
  const nanoidCanvasRef = useRef<CanvasHandle>(null);

  const boubaBubblesRef = useRef<Bubble[]>([]);
  const nanoidBubblesRef = useRef<Bubble[]>([]);

  const [lastBouba, setLastBouba] = useState("");
  const [lastNanoid, setLastNanoid] = useState("");

  const scaleFactor = 3.5; // Scale char widths to visible bubble sizes

  const spawnBubbles = useCallback(
    (
      idStr: string,
      bubblesRef: React.RefObject<Bubble[]>,
      canvasHandle: CanvasHandle | null,
      palette: string[]
    ) => {
      if (!canvasHandle || !isReady) return;
      const { width } = canvasHandle;

      // Clear old bubbles if too many
      if (bubblesRef.current.length > 120) {
        bubblesRef.current = bubblesRef.current.slice(-60);
      }

      const chars = [...idStr];
      const totalWidth = chars.reduce((sum, c) => {
        const w = charWidths.get(c) ?? 10;
        return sum + w * scaleFactor * 2 + 4;
      }, 0);
      let startX = (width - totalWidth) / 2 + Math.random() * 40 - 20;

      for (let i = 0; i < chars.length; i++) {
        const char = chars[i];
        const w = charWidths.get(char) ?? 10;
        const r = w * scaleFactor * 0.5 + 6;
        const x = startX + r;
        startX += r * 2 + 2;

        bubblesRef.current.push({
          x,
          y: -r - Math.random() * 40,
          prevX: x + (Math.random() - 0.5) * 2,
          prevY: -r - Math.random() * 60,
          r,
          char,
          color: palette[i % palette.length],
          settled: false,
        });
      }
    },
    [isReady, charWidths]
  );

  const generate = useCallback(() => {
    if (!isReady) return;
    const bId = boubaId();
    const nId = nanoidGen();
    setLastBouba(bId);
    setLastNanoid(nId);
    spawnBubbles(bId, boubaBubblesRef, boubaCanvasRef.current, WARM_PALETTE);
    spawnBubbles(nId, nanoidBubblesRef, nanoidCanvasRef.current, COLD_PALETTE);
  }, [isReady, spawnBubbles]);

  // Verlet physics step
  const step = useCallback(
    (bubbles: Bubble[], floorY: number, wallX: number) => {
      const gravity = 0.15;
      const damping = 0.98;
      const iterations = 3;

      for (const b of bubbles) {
        if (b.settled) continue;

        const vx = (b.x - b.prevX) * damping;
        const vy = (b.y - b.prevY) * damping + gravity;

        b.prevX = b.x;
        b.prevY = b.y;
        b.x += vx;
        b.y += vy;
      }

      // Collision resolution
      for (let iter = 0; iter < iterations; iter++) {
        for (let i = 0; i < bubbles.length; i++) {
          const a = bubbles[i];

          // Floor
          if (a.y + a.r > floorY) {
            a.y = floorY - a.r;
            if (Math.abs(a.y - a.prevY) < 0.5) a.settled = true;
          }

          // Walls
          if (a.x - a.r < 0) a.x = a.r;
          if (a.x + a.r > wallX) a.x = wallX - a.r;

          // Circle-circle
          for (let j = i + 1; j < bubbles.length; j++) {
            const b = bubbles[j];
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const minDist = a.r + b.r;

            if (dist < minDist && dist > 0) {
              const overlap = (minDist - dist) / 2;
              const nx = dx / dist;
              const ny = dy / dist;
              a.x -= nx * overlap;
              a.y -= ny * overlap;
              b.x += nx * overlap;
              b.y += ny * overlap;
            }
          }
        }
      }
    },
    []
  );

  const drawBubbles = useCallback(
    (handle: CanvasHandle | null, bubbles: Bubble[]) => {
      if (!handle?.ctx) return;
      const { ctx, width, height } = handle;

      ctx.fillStyle = "#050505";
      ctx.fillRect(0, 0, width, height);

      step(bubbles, height - 4, width);

      for (const b of bubbles) {
        // Bubble fill
        ctx.globalAlpha = 0.15;
        ctx.fillStyle = b.color;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fill();

        // Bubble stroke
        ctx.globalAlpha = 0.6;
        ctx.strokeStyle = b.color;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Character
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = b.color;
        ctx.font = `${Math.max(b.r * 0.7, 8)}px Inter`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(b.char, b.x, b.y);
      }
      ctx.globalAlpha = 1;
    },
    [step]
  );

  useAnimationFrame(() => {
    drawBubbles(boubaCanvasRef.current, boubaBubblesRef.current);
    drawBubbles(nanoidCanvasRef.current, nanoidBubblesRef.current);
  }, isReady);

  return (
    <div className="min-h-screen pt-12">
      <Nav />
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Bubble Generator</h1>
          <p className="text-[var(--muted)] max-w-2xl">
            Each character becomes a circle whose diameter equals its measured
            pixel width. boubakikid characters produce{" "}
            <span className="text-violet-400">uniform, harmonious clusters</span>
            ; nanoid characters produce{" "}
            <span className="text-red-400">irregular arrangements</span>.
          </p>
        </div>

        <button
          onClick={generate}
          disabled={!isReady}
          className="mb-6 px-6 py-2.5 text-sm bg-neutral-800 hover:bg-neutral-700 rounded-md transition-colors disabled:opacity-40"
        >
          {isReady ? "Generate" : "Loading..."}
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Boubakikid */}
          <div>
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-violet-400 text-sm font-medium">
                boubakikid
              </span>
              {lastBouba && (
                <code className="text-xs text-neutral-500 font-mono">
                  {lastBouba}
                </code>
              )}
            </div>
            <div className="h-80 rounded-lg overflow-hidden border border-neutral-800">
              <CanvasRenderer ref={boubaCanvasRef} />
            </div>
          </div>

          {/* Nanoid */}
          <div>
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-red-400 text-sm font-medium">nanoid</span>
              {lastNanoid && (
                <code className="text-xs text-neutral-500 font-mono">
                  {lastNanoid}
                </code>
              )}
            </div>
            <div className="h-80 rounded-lg overflow-hidden border border-neutral-800">
              <CanvasRenderer ref={nanoidCanvasRef} />
            </div>
          </div>
        </div>

        <div className="mt-8 border border-neutral-800 rounded-lg p-6 text-sm text-[var(--muted)]">
          <p>
            Circle diameters are proportional to each character&apos;s measured
            pixel width in Inter at 32px. The boubakikid alphabet ({ALPHABET.length}{" "}
            chars) has a narrower width distribution, so its bubbles pack more
            uniformly. Click Generate multiple times to see the pattern emerge.
          </p>
        </div>
      </div>
    </div>
  );
}
