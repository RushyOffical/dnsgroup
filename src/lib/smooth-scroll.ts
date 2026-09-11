import type Lenis from "lenis";

/**
 * A handle on the Lenis instance driving the page.
 *
 * Anything that scrolls the window programmatically has to go through Lenis
 * while it is running: it writes its own scroll target every frame, so a bare
 * `scrollIntoView` gets overwritten mid-animation and lands short.
 */
let lenis: Lenis | null = null;

export function registerSmoothScroll(instance: Lenis | null) {
  lenis = instance;
}

/**
 * Brings an element to the top of the viewport.
 *
 * How far it stops short of the top is the element's own `scroll-margin-top`,
 * which both paths honour — so clearing the fixed nav is a CSS decision at the
 * call site rather than a number duplicated here.
 *
 * Falls back to the native scroll when Lenis is not driving — which is the
 * case under `prefers-reduced-motion`, where the jump is instant by design.
 */
export function scrollToElement(target: HTMLElement) {
  if (lenis) {
    lenis.scrollTo(target);
    return;
  }

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  target.scrollIntoView({
    behavior: reduced ? "auto" : "smooth",
    block: "start",
  });
}
