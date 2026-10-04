"use client";

import Lenis from "lenis";
import { useEffect } from "react";

/**
 * Lenis drives the page scroll so scroll-linked 3D camera moves interpolate
 * smoothly instead of stepping with native wheel events. Disabled entirely
 * for users who ask for reduced motion.
 */
export default function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const lenis = new Lenis({
      duration: 1.05,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      // Native momentum on touch is better than anything we'd simulate.
      syncTouch: false,
    });

    let frame = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      frame = requestAnimationFrame(raf);
    };
    frame = requestAnimationFrame(raf);

    // Let hash links keep working while Lenis owns the scroll position.
    const onHashClick = (event: MouseEvent) => {
      const anchor = (event.target as HTMLElement | null)?.closest?.("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href || !href.includes("#")) return;
      const id = href.slice(href.indexOf("#") + 1);
      if (!id) return;
      const target = document.getElementById(id);
      if (!target) return;
      event.preventDefault();
      lenis.scrollTo(target, { offset: -80 });
      history.replaceState(null, "", `#${id}`);
    };

    document.addEventListener("click", onHashClick);
    return () => {
      document.removeEventListener("click", onHashClick);
      cancelAnimationFrame(frame);
      lenis.destroy();
    };
  }, []);

  return null;
}
