"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import { id as boubaId, createId } from "@/lib/boubakikid";

export type PhysicsMode = "magnetic" | "scatter" | "gravity";

// All the angular/spiky characters: the excluded set plus other sharp-looking glyphs
const SPIKY_POOL = "KVWXZkvwxzAMNYTLFEHIJPR<>^*/\\|!#%&+741";

function getResponsiveConfig(width: number) {
  if (width < 500) return { charSize: 18, spacing: 26, idLength: 10 };
  if (width < 800) return { charSize: 22, spacing: 32, idLength: 10 };
  return { charSize: 28, spacing: 38, idLength: 12 };
}

type Particle = {
  char: string;
  baseX: number;
  baseY: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  kind: "spiky" | "id" | "label" | "github";
};

function createGrid(
  width: number,
  height: number,
  idChars: string,
  spacing: number
): Particle[] {
  const particles: Particle[] = [];
  const cols = Math.ceil(width / spacing) + 2;
  const rows = Math.ceil(height / spacing) + 2;
  const offsetX = (width - (cols - 1) * spacing) / 2;
  // Shift grid up by half a row so the midpoint between ID row and label row is viewport center
  const offsetY = (height - (rows - 1) * spacing) / 2 - spacing / 2;

  // Center row for ID, row below for "boubakikid" label
  const centerRow = Math.floor(rows / 2);
  const labelRow = centerRow + 1;

  const idLen = idChars.length;
  const centerCol = Math.floor(cols / 2);
  const idStartCol = centerCol - Math.floor(idLen / 2);

  const labelText = "boubakikid";
  // On desktop (12-char ID), align label start with ID start.
  // On mobile (shorter ID), center label independently so it doesn't pull left.
  const labelStartCol = idLen >= labelText.length
    ? idStartCol
    : centerCol - Math.floor(labelText.length / 2);

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = offsetX + col * spacing;
      const y = offsetY + row * spacing;

      // Is this cell part of the center ID?
      const isIdCell =
        row === centerRow &&
        col >= idStartCol &&
        col < idStartCol + idLen;

      // Is this cell part of the label?
      const isLabelCell =
        row === labelRow &&
        col >= labelStartCol &&
        col < labelStartCol + labelText.length;

      // GitHub icon: beside label on desktop, below (aligned with b) on mobile
      const isMobile = spacing < 38;
      const isGithubCell = isMobile
        ? row === labelRow + 1 && col === labelStartCol
        : row === labelRow && col === labelStartCol + labelText.length + 1;

      if (isIdCell) {
        const idIndex = col - idStartCol;
        particles.push({
          char: idChars[idIndex],
          baseX: x,
          baseY: y,
          x,
          y,
          vx: 0,
          vy: 0,
          kind: "id",
        });
      } else if (isLabelCell) {
        const labelIndex = col - labelStartCol;
        particles.push({
          char: labelText[labelIndex],
          baseX: x,
          baseY: y,
          x,
          y,
          vx: 0,
          vy: 0,
          kind: "label",
        });
      } else if (isGithubCell) {
        particles.push({
          char: "",
          baseX: x,
          baseY: y,
          x,
          y,
          vx: 0,
          vy: 0,
          kind: "github",
        });
      } else {
        particles.push({
          char: SPIKY_POOL[Math.floor(Math.random() * SPIKY_POOL.length)],
          baseX: x,
          baseY: y,
          x,
          y,
          vx: 0,
          vy: 0,
          kind: "spiky",
        });
      }
    }
  }

  return particles;
}

function applyPhysics(
  particles: Particle[],
  mouseX: number,
  mouseY: number,
  mode: PhysicsMode
) {
  const radius = 160;
  const radiusSq = radius * radius;

  for (const p of particles) {
    // ID and github chars don't move — they stay anchored
    if (p.kind === "id" || p.kind === "github") {
      p.x = p.baseX;
      p.y = p.baseY;
      continue;
    }

    const dx = p.x - mouseX;
    const dy = p.y - mouseY;
    const distSq = dx * dx + dy * dy;

    if (distSq < radiusSq && distSq > 1) {
      const dist = Math.sqrt(distSq);
      const nx = dx / dist;
      const ny = dy / dist;
      const force = 1 - dist / radius;

      switch (mode) {
        case "magnetic": {
          const strength = force * 6;
          p.vx += nx * strength;
          p.vy += ny * strength;
          break;
        }
        case "scatter": {
          const strength = force * force * 20;
          p.vx += nx * strength;
          p.vy += ny * strength;
          break;
        }
        case "gravity": {
          const tangentX = -ny;
          const tangentY = nx;
          const repel = force * 5;
          const tangent = force * 3.5;
          p.vx += nx * repel + tangentX * tangent;
          p.vy += ny * repel + tangentY * tangent;
          break;
        }
      }
    }

    // Spring back to base position
    const homeX = p.baseX - p.x;
    const homeY = p.baseY - p.y;
    const springStrength = mode === "scatter" ? 0.01 : 0.03;
    p.vx += homeX * springStrength;
    p.vy += homeY * springStrength;

    // Damping
    const damping = mode === "scatter" ? 0.92 : 0.88;
    p.vx *= damping;
    p.vy *= damping;

    p.x += p.vx;
    p.y += p.vy;
  }
}

const MODES: { value: PhysicsMode; label: string }[] = [
  { value: "magnetic", label: "Magnetic" },
  { value: "scatter", label: "Scatter" },
  { value: "gravity", label: "Gravity" },
];

export default function CharacterField({
  mode: initialMode = "magnetic",
}: {
  mode?: PhysicsMode;
}) {
  const [mode, setMode] = useState<PhysicsMode>(initialMode);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const mouseRef = useRef({ x: -1000, y: -1000 });
  const [githubPos, setGithubPos] = useState<{ x: number; y: number } | null>(null);
  const frameRef = useRef(0);
  const configRef = useRef(getResponsiveConfig(typeof window !== "undefined" ? window.innerWidth : 1440));
  const idGenRef = useRef(createId(configRef.current.idLength));
  const currentIdRef = useRef(idGenRef.current());

  // Cycle IDs — rebuild only the ID particles in place
  useEffect(() => {
    const interval = setInterval(() => {
      const newId = idGenRef.current();
      currentIdRef.current = newId;

      // Update just the ID particles' chars
      const idParticles = particlesRef.current.filter((p) => p.kind === "id");
      for (let i = 0; i < idParticles.length && i < newId.length; i++) {
        idParticles[i].char = newId[i];
      }
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Setup canvas and particles
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;

      const ctx = canvas.getContext("2d")!;
      ctx.scale(dpr, dpr);

      const config = getResponsiveConfig(window.innerWidth);
      configRef.current = config;
      idGenRef.current = createId(config.idLength);
      currentIdRef.current = idGenRef.current();

      particlesRef.current = createGrid(
        window.innerWidth,
        window.innerHeight,
        currentIdRef.current,
        config.spacing
      );

      const ghParticle = particlesRef.current.find((p) => p.kind === "github");
      if (ghParticle) {
        setGithubPos({ x: ghParticle.baseX, y: ghParticle.baseY });
      }
    };

    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  // Mouse + touch tracking
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };
    const onMouseLeave = () => {
      mouseRef.current = { x: -1000, y: -1000 };
    };
    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const touch = e.touches[0];
      mouseRef.current = { x: touch.clientX, y: touch.clientY };
    };
    const onTouchEnd = () => {
      mouseRef.current = { x: -1000, y: -1000 };
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseleave", onMouseLeave);
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchstart", onTouchMove as EventListener, { passive: false });
    window.addEventListener("touchend", onTouchEnd);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseleave", onMouseLeave);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchstart", onTouchMove as EventListener);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, []);

  // Animation loop
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d")!;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;

    ctx.clearRect(0, 0, w, h);

    applyPhysics(
      particlesRef.current,
      mouseRef.current.x,
      mouseRef.current.y,
      mode
    );

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `${configRef.current.charSize}px "Geist Mono", monospace`;

    for (const p of particlesRef.current) {
      if (p.kind === "spiky") {
        const dx = p.x - p.baseX;
        const dy = p.y - p.baseY;
        const displacement = Math.sqrt(dx * dx + dy * dy);
        const opacity = Math.min(0.18 + displacement * 0.004, 0.45);
        ctx.fillStyle = `rgba(160, 160, 160, ${opacity})`;
      } else {
        // ID and label chars: both black
        ctx.fillStyle = "#0a0a0a";
      }

      ctx.fillText(p.char, p.x, p.y);
    }

    frameRef.current = requestAnimationFrame(draw);
  }, [mode]);

  useEffect(() => {
    frameRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frameRef.current);
  }, [draw]);

  return (
    <div className="fixed inset-0">
      <canvas ref={canvasRef} className="absolute inset-0" />

      {/* GitHub link positioned at grid cell */}
      {githubPos && (
        <a
          href="https://github.com/danielhowells/boubakikid"
          target="_blank"
          rel="noopener noreferrer"
          className="absolute pointer-events-auto hover:opacity-60 transition-opacity"
          style={{
            left: githubPos.x,
            top: githubPos.y - 2,
            transform: "translate(-50%, -50%)",
          }}
        >
          <svg
            width={configRef.current.charSize * 0.7}
            height={configRef.current.charSize * 0.7}
            viewBox="0 0 24 24"
            fill="#0a0a0a"
          >
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
          </svg>
        </a>
      )}

      {/* Mode toggle */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex gap-0 pointer-events-auto">
        {MODES.map((m) => (
          <button
            key={m.value}
            onClick={() => setMode(m.value)}
            className={`px-4 py-1.5 text-[11px] tracking-wide uppercase transition-colors border ${
              mode === m.value
                ? "bg-[#0a0a0a] text-white border-[#0a0a0a]"
                : "bg-white/80 text-[var(--muted)] border-neutral-200 hover:text-[#0a0a0a] hover:border-neutral-400"
            } ${
              m.value === "magnetic"
                ? "rounded-l-md border-r-0"
                : m.value === "gravity"
                ? "rounded-r-md border-l-0"
                : ""
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

    </div>
  );
}
