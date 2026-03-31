"use client";

import { useRef, useEffect, useImperativeHandle, forwardRef } from "react";

export type CanvasHandle = {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
};

type Props = {
  className?: string;
};

/**
 * High-DPI canvas with imperative ref API.
 *
 * Usage:
 *   const canvasRef = useRef<CanvasHandle>(null);
 *   <CanvasRenderer ref={canvasRef} className="w-full h-64" />
 *
 * Then in your animation loop:
 *   const { ctx, width, height } = canvasRef.current!;
 *   ctx.clearRect(0, 0, width, height);
 *   // draw...
 */
const CanvasRenderer = forwardRef<CanvasHandle, Props>(function CanvasRenderer(
  { className },
  ref
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handleRef = useRef<CanvasHandle | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        const dpr = window.devicePixelRatio || 1;
        canvas.width = width * dpr;
        canvas.height = height * dpr;

        const ctx = canvas.getContext("2d")!;
        ctx.scale(dpr, dpr);

        handleRef.current = {
          canvas,
          ctx,
          width,
          height,
        };
      }
    });

    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  useImperativeHandle(
    ref,
    () => {
      // Return a proxy that always reads from the latest handleRef
      return new Proxy({} as CanvasHandle, {
        get(_, prop: keyof CanvasHandle) {
          return handleRef.current?.[prop];
        },
      });
    },
    []
  );

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ display: "block", width: "100%", height: "100%" }}
    />
  );
});

export default CanvasRenderer;
