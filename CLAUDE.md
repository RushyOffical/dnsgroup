@AGENTS.md

# Don & Silva Group — project context

Read this before changing anything. It carries decisions made with the owner
that are not obvious from the code.

## What this is

Marketing site for **Don & Silva Group** (parent company) and its first
division, **Don & Silva Cleaning**. The group intends to expand into further
service divisions over the coming years, so the architecture is built for
that rather than for one company.

- `/` — group hub
- `/cleaning` — the cleaning division
- `/contact` — shared quote form

## ⚠️ The business is PRE-TRADING. This is the most important rule here.

As of the last session the business was **still an idea** — not operating, no
crews, no insurance in place, no clients, no track record.

**Never write copy that claims otherwise.** Specifically, do not add:

- Insurance the business does not yet hold ("fully insured", "public liability
  cover applies to every job")
- Staff claims ("police-checked crews", "trained in-house", "our team of…")
- Track record ("since 2019", "500+ jobs", "trusted by…", "the same finish on
  week fifty as on day one")
- Invented statistics, client counts, ratings or testimonials
- Named divisions that do not exist

An earlier revision contained all of these and had to be stripped. The target
customers are **strata and facilities managers**, who ask for a certificate of
currency before they will even take a quote — so a false insurance claim is a
misrepresentation problem, not merely overstatement.

Forward commitments are fine ("you will have our certificate of currency
before anyone starts on site"). Claims of present fact are not.

If the owner says the business is now trading, that changes — but get it from
the owner, never infer it.

## Content lives in one file

`src/content/site.ts` is the single source of truth for every string, service,
stat, service area, FAQ and contact detail. **Components must never hard-code
copy.** Any wording change is an edit to that file.

Anything marked `TODO` there is placeholder and **not real** — phone, email,
ABN, founding year. Do not present placeholders as real, and do not invent
replacements. Ask the owner.

## Decisions already made

- **Market:** Melbourne / Victoria. Australian English throughout (organise,
  sanitise, colour, "bond clean", "strata").
- **Target customers:** strata / building managers, and offices / commercial.
- **Expansion logic:** sell more to the *same* buyer — grounds, waste, minor
  maintenance — rather than unrelated businesses. Division two is most likely
  grounds/garden or bin rooms: same buyer, same site visit, no licensing.
- **Divisions on the site:** only real ones. Facilities/Property/Trades were
  invented placeholders and have been removed. Do not reintroduce speculative
  divisions.
- **Brand:** parent is champagne gold, cleaning is aqua. Set via
  `[data-brand]` blocks in `src/app/globals.css`.
- **RIO Clean Group** (`riocleangroup.com.au`) was the owner's reference site
  but is blocked by the sandbox network policy, so none of its visual language
  is reflected here. If it becomes reachable, the design may be revisited.

## Adding a division

1. Entry in `divisions` in `src/content/site.ts`
2. `[data-brand="<slug>"]` block in `src/app/globals.css`
3. Route at `src/app/<slug>/page.tsx` wrapped in `<div data-brand="<slug>">`
4. Add to `subOrganization` in `src/app/layout.tsx` and to `src/app/sitemap.ts`

Hub, footer, mobile menu and contact page pick it up automatically.

## 3D constraints

The site is deliberately 3D-heavy. Keep these invariants:

- **One WebGL context per section, maximum.** Browsers cap live contexts.
  Never give each card its own canvas.
- Every scene goes through `components/three/Stage.tsx`, which pauses the
  render loop offscreen and caps DPR.
- `useDeviceTier` gates expensive work (transmission materials,
  postprocessing, particle counts). Respect the tiers.
- **No external 3D assets.** Lighting is `Lightformer` rigs; the lattice
  sprite is drawn to a canvas at runtime. Do not add CDN-hosted HDRIs.
- `prefers-reduced-motion` must render final states, never skip content.

## Quote form

Server Action at `src/app/actions/quote.ts`. Validation is shared
(`src/lib/quote.ts`) and runs on both sides. Delivery is pluggable
(`src/lib/delivery.ts`): Resend, webhook, or console. With nothing configured
it returns `unconfigured` and the client falls back to mailto — **preserve
that fallback**, it is what keeps the form working on a static deploy.

## Before finishing any change

Run both, and actually look at the result in a browser rather than assuming:

```bash
npm run build
npm run lint
```

## Repo notes

- Work happens on `claude/session-setup-z4d73z`; `main` is an empty root
  commit that exists only so the initial build had something to diff against.
- The repo's default branch is still the working branch. After the first
  merge, the default should be switched to `main`.
- There is no CI configured, so nothing validates a push automatically.
