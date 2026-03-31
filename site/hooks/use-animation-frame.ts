"use client";

import { useEffect, useRef, useCallback } from "react";

/**
 * Runs a callback on every animation frame.
 * Automatically cleans up on unmount.
 *
 * @param callback - Called each frame with delta time in ms
 * @param active - Set to false to pause the loop
 */
export function useAnimationFrame(
  callback: (deltaMs: number) => void,
  active: boolean = true
) {
  const callbackRef = useRef(callback);
  const frameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  // Keep callback ref fresh without restarting the loop
  callbackRef.current = callback;

  const loop = useCallback((time: number) => {
    const delta = lastTimeRef.current ? time - lastTimeRef.current : 16;
    lastTimeRef.current = time;
    callbackRef.current(delta);
    frameRef.current = requestAnimationFrame(loop);
  }, []);

  useEffect(() => {
    if (!active) return;

    lastTimeRef.current = 0;
    frameRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frameRef.current);
    };
  }, [active, loop]);
}
