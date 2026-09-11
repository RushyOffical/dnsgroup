"use client";

import { Canvas, type CanvasProps } from "@react-three/fiber";
import { AdaptiveDpr, Preload } from "@react-three/drei";
import {
  Suspense,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useDeviceTier } from "@/hooks/useDeviceTier";
import { cn } from "@/lib/utils";

type StageProps = {
  children: ReactNode;
  className?: string;
  /** Rendered behind the canvas — visible while WebGL boots, and the whole
   *  visual if WebGL is unavailable. */
  fallback?: ReactNode;
  camera?: CanvasProps["camera"];
  /** Keep rendering while scrolled out of view. Almost never wanted. */
  alwaysRender?: boolean;
  /** Fires when a click inside the canvas hits no interactive object. */
  onPointerMissed?: CanvasProps["onPointerMissed"];
  /**
   * What to do with the fallback once the canvas is live.
   *
   * `"behind"` leaves it painted underneath — right for a gradient glow that
   * is part of the look. `"until-ready"` clears it the moment the scene has
   * drawn, which is what a fallback showing the *same subject* needs, or it
   * ghosts through the alpha canvas as a second, misaligned copy.
   */
  fallbackMode?: "behind" | "until-ready";
};

/**
 * Shared wrapper for every 3D scene on the site.
 *
 * Three things every scene gets for free:
 *  - the render loop pauses when the canvas scrolls out of view
 *  - DPR is capped to what the device can actually push
 *  - a graceful fallback if the context is lost or WebGL is missing
 */
export default function Stage({
  children,
  className,
  fallback,
  camera = { position: [0, 0, 6], fov: 40 },
  alwaysRender = false,
  onPointerMissed,
  fallbackMode = "behind",
}: StageProps) {
  const host = useRef<HTMLDivElement>(null);
  const { dpr, ready } = useDeviceTier();
  const [visible, setVisible] = useState(false);
  const [failed, setFailed] = useState(false);
  const [drawn, setDrawn] = useState(false);

  useEffect(() => {
    const node = host.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { rootMargin: "200px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const active = alwaysRender || visible;
  const showFallback =
    fallbackMode === "behind" || failed || !drawn;

  return (
    <div ref={host} className={cn("relative", className)}>
      {fallback && showFallback ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-0"
        >
          {fallback}
        </div>
      ) : null}

      {!failed && ready ? (
        <Canvas
          className="!absolute inset-0 z-10"
          dpr={dpr}
          camera={camera}
          frameloop={active ? "always" : "never"}
          onPointerMissed={onPointerMissed}
          gl={{
            antialias: false,
            alpha: true,
            powerPreference: "high-performance",
            stencil: false,
            depth: true,
          }}
          onCreated={({ gl }) => {
            gl.domElement.addEventListener(
              "webglcontextlost",
              (event) => {
                event.preventDefault();
                setFailed(true);
              },
              { once: true },
            );
            // Two frames: one for R3F to commit the scene, one for it to be
            // on screen. Any earlier and clearing the fallback flashes.
            requestAnimationFrame(() =>
              requestAnimationFrame(() => setDrawn(true)),
            );
          }}
        >
          <Suspense fallback={null}>{children}</Suspense>
          <AdaptiveDpr pixelated />
          <Preload all />
        </Canvas>
      ) : null}
    </div>
  );
}
