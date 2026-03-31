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

const ALL_CHARS =
  "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

type FloatingId = {
  text: string;
  y: number;
  x: number; // horizontal offset from center
  variance: number;
  opacity: number;
  speed: number;
  phase: number; // for sinusoidal drift
};

function variance(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
}

export default function RiverPage() {
  const { isReady, measureId } = usePretextMeasure("20px Inter", ALL_CHARS);

  const boubaCanvasRef = useRef<CanvasHandle>(null);
  const nanoidCanvasRef = useRef<CanvasHandle>(null);

  const boubaIdsRef = useRef<FloatingId[]>([]);
  const nanoidIdsRef = useRef<FloatingId[]>([]);

  const boubaVariancesRef = useRef<number[]>([]);
  const nanoidVariancesRef = useRef<number[]>([]);

  const [boubaAvgVar, setBoubaAvgVar] = useState(0);
  const [nanoidAvgVar, setNanoidAvgVar] = useState(0);

  const spawnId = useCallback(
    (
      generator: () => string,
      idsRef: React.RefObject<FloatingId[]>,
      variancesRef: React.RefObject<number[]>
    ) => {
      if (!isReady) return;
      const text = generator();
      const widths = measureId(text);
      const v = variance(widths);

      variancesRef.current.push(v);
      if (variancesRef.current.length > 50) {
        variancesRef.current = variancesRef.current.slice(-50);
      }

      idsRef.current.push({
        text,
        y: -20,
        x: 0,
        variance: v,
        opacity: 0,
        speed: 0.4 + Math.random() * 0.3,
        phase: Math.random() * Math.PI * 2,
      });

      // Trim old IDs
      if (idsRef.current.length > 60) {
        idsRef.current = idsRef.current.slice(-40);
      }
    },
    [isReady, measureId]
  );

  // Spawn IDs periodically
  useEffect(() => {
    if (!isReady) return;
    const interval = setInterval(() => {
      spawnId(boubaId, boubaIdsRef, boubaVariancesRef);
      spawnId(nanoidGen, nanoidIdsRef, nanoidVariancesRef);

      const bVars = boubaVariancesRef.current;
      const nVars = nanoidVariancesRef.current;
      if (bVars.length > 0) {
        setBoubaAvgVar(bVars.reduce((a, b) => a + b, 0) / bVars.length);
      }
      if (nVars.length > 0) {
        setNanoidAvgVar(nVars.reduce((a, b) => a + b, 0) / nVars.length);
      }
    }, 300);
    return () => clearInterval(interval);
  }, [isReady, spawnId]);

  const drawRiver = useCallback(
    (
      handle: CanvasHandle | null,
      ids: FloatingId[],
      color: string,
      _dimColor: string
    ) => {
      if (!handle?.ctx) return;
      const { ctx, width, height } = handle;

      // Gradient background
      const grad = ctx.createLinearGradient(0, 0, 0, height);
      grad.addColorStop(0, "rgba(5,5,5,0.3)");
      grad.addColorStop(1, "#050505");
      ctx.fillStyle = "#050505";
      ctx.fillRect(0, 0, width, height);

      // Advance and draw each ID
      ctx.font = "13px Inter, monospace";
      ctx.textAlign = "center";

      for (const id of ids) {
        id.y += id.speed;
        id.phase += 0.01;

        // Sinusoidal drift — amplitude proportional to variance
        const amplitude = Math.sqrt(id.variance) * 8;
        id.x = Math.sin(id.phase) * amplitude;

        // Fade in at top, fade out at bottom
        if (id.y < 40) {
          id.opacity = id.y / 40;
        } else if (id.y > height - 60) {
          id.opacity = Math.max(0, (height - id.y) / 60);
        } else {
          id.opacity = Math.min(1, id.opacity + 0.05);
        }

        ctx.globalAlpha = id.opacity * 0.7;
        ctx.fillStyle = color;
        ctx.fillText(id.text, width / 2 + id.x, id.y);
      }

      ctx.globalAlpha = 1;

      // Remove IDs that have scrolled past
      const filtered = ids.filter((id) => id.y < height + 20);
      ids.length = 0;
      ids.push(...filtered);

      // Sparkline at bottom
      const varRef =
        handle === boubaCanvasRef.current
          ? boubaVariancesRef.current
          : nanoidVariancesRef.current;
      if (varRef.length > 1) {
        const sparkH = 30;
        const sparkY = height - sparkH - 8;
        const maxVar = Math.max(...varRef, 1);

        ctx.strokeStyle = color;
        ctx.globalAlpha = 0.3;
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = 0; i < varRef.length; i++) {
          const x = (i / (varRef.length - 1)) * width;
          const y = sparkY + sparkH - (varRef[i] / maxVar) * sparkH;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    },
    []
  );

  useAnimationFrame(() => {
    drawRiver(
      boubaCanvasRef.current,
      boubaIdsRef.current,
      "#67e8f9",
      "#164e63"
    );
    drawRiver(
      nanoidCanvasRef.current,
      nanoidIdsRef.current,
      "#fbbf24",
      "#78350f"
    );
  }, isReady);

  return (
    <div className="min-h-screen pt-12">
      <Nav />
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">ID River</h1>
          <p className="text-[var(--muted)] max-w-2xl">
            Two parallel streams of IDs flowing downward. Each ID&apos;s
            horizontal drift is driven by its character-width variance.{" "}
            <span className="text-cyan-400">boubakikid flows calm</span>;{" "}
            <span className="text-amber-400">nanoid flows turbulent</span>.
          </p>
        </div>

        {!isReady && (
          <div className="text-[var(--muted)] text-sm mb-4">
            Loading fonts and measuring characters...
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Boubakikid river */}
          <div>
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-cyan-400 text-sm font-medium">
                boubakikid
              </span>
              <span className="text-xs text-[var(--muted)] font-mono">
                avg σ²={boubaAvgVar.toFixed(2)}
              </span>
            </div>
            <div className="h-[500px] rounded-lg overflow-hidden border border-neutral-800">
              <CanvasRenderer ref={boubaCanvasRef} />
            </div>
          </div>

          {/* Nanoid river */}
          <div>
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-amber-400 text-sm font-medium">
                nanoid
              </span>
              <span className="text-xs text-[var(--muted)] font-mono">
                avg σ²={nanoidAvgVar.toFixed(2)}
              </span>
            </div>
            <div className="h-[500px] rounded-lg overflow-hidden border border-neutral-800">
              <CanvasRenderer ref={nanoidCanvasRef} />
            </div>
          </div>
        </div>

        <div className="mt-8 border border-neutral-800 rounded-lg p-6 text-sm text-[var(--muted)]">
          <p>
            Width variance is computed per-ID using pretext.js character
            measurements. Lower variance → straighter flow. The sparkline at
            the bottom of each stream shows variance over the last 50 IDs.
            boubakikid&apos;s restricted alphabet naturally produces IDs with
            more uniform character widths.
          </p>
        </div>
      </div>
    </div>
  );
}
