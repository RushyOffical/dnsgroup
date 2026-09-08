# Don & Silva Group

Marketing site for **Don & Silva Group** (parent) and its first operating
division, **Don & Silva Cleaning**.

Built as a 3D-first site: WebGL heroes, scroll-linked camera work and
pointer-reactive cards, with the group/division structure baked into the
routing, the design tokens and the SEO schema so future companies slot in
without a redesign.

---

## Getting started

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
npm run start    # serve the production build
npm run lint
```

Requires Node 20+.

---

## Routes

| Route       | What it is                                                |
| ----------- | --------------------------------------------------------- |
| `/`         | Group hub — the parent company and its divisions           |
| `/cleaning` | Don & Silva Cleaning — the operating division              |
| `/contact`  | Quote request form, shared across the group                |
| `/sitemap.xml`, `/robots.txt` | Generated from `content/site.ts`          |

---

## The one file you'll edit most

**`src/content/site.ts`** is the single source of truth for every string,
service, stat, service area, FAQ and contact detail on the site. Components
never hard-code copy. Rebranding, re-pricing or re-scoping the site is an edit
to that file alone.

> ⚠️ **Before launch:** everything marked `TODO` in that file is placeholder
> scaffolding — phone number, email addresses, ABN, founding year, the stats
> band and the service areas. None of them are real. The three
> `in-development` divisions (Facilities, Property, Trades) are illustrative
> placeholders for the planned expansion, not announced business lines —
> rename or remove them.

---

## Adding a new division

The architecture was built for this. To add one:

1. **Content** — add an entry to `divisions` in `src/content/site.ts`. Set
   `status: "operating"` and an `href` once it has a page; leave `href: null`
   and `status: "in-development"` to show it as a locked card.
2. **Accent** — add a `[data-brand="<slug>"]` block in
   `src/app/globals.css` with that division's `--color-accent`,
   `--color-accent-soft` and `--color-accent-deep`.
3. **Page** — create `src/app/<slug>/page.tsx`, wrap it in
   `<div data-brand="<slug>">`, and reuse the section components. Every accent
   in the subtree re-resolves to the new colour automatically.
4. **Schema** — add the company to `subOrganization` in
   `src/app/layout.tsx` and a URL to `src/app/sitemap.ts`.

The homepage hub, footer, mobile menu and contact page all read from
`divisions` and pick the new company up with no further changes.

---

## How the 3D is kept fast

"Maximum 3D" is the design brief, so the scenes scale themselves rather than
being switched off:

- **`Stage`** (`components/three/Stage.tsx`) wraps every canvas. It pauses the
  render loop (`frameloop="never"`) whenever the canvas scrolls out of view,
  caps DPR to the device, and falls back to a CSS gradient if the WebGL
  context is lost or unavailable.
- **`useDeviceTier`** grades the device `high` / `mid` / `low` from core count,
  memory and pointer type. The tier drives geometry detail, particle counts,
  environment resolution, and whether the expensive
  `MeshTransmissionMaterial` and postprocessing passes run at all.
- **One WebGL context per section, maximum.** Browsers cap live contexts, so
  the six service cards share a single canvas that morphs on hover instead of
  each owning one.
- **`HeroFrame`** positions hero subjects into the empty column beside the
  headline and shrinks them as the viewport narrows, so the render never sits
  under the type.
- **No external 3D assets.** Lighting is built from `<Lightformer>` rigs and
  the lattice's dot sprite is drawn to a canvas at runtime — nothing is
  fetched from a CDN, so the scenes work offline and can't break on a
  third-party outage.
- **Reduced motion** is honoured throughout: Lenis is not started, camera rigs
  lock to a static framing, and entrance animations render at their final
  state rather than being skipped.

---

## Contact form

`components/sections/QuoteForm.tsx` validates client-side and then composes a
pre-filled email and hands it to the visitor's mail client. That works on a
static host with no backend.

To take submissions server-side, replace `handleSubmit` with a Server Action
or a POST to an API route — the validation already produces a clean object to
send.

---

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 ·
React Three Fiber + drei + postprocessing · Motion · Lenis
