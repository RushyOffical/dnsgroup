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
}: StageProps) {
  const host = useRef<HTMLDivElement>(null);
  const { dpr, ready } = useDeviceTier();
  const [visible, setVisible] = useState(false);
  const [failed, setFailed] = useState(false);

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

  return (
    <div ref={host} className={cn("relative", className)}>
      {fallback ? (
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
