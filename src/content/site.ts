/**
 * ============================================================================
 * DON & SILVA GROUP — CONTENT SOURCE OF TRUTH
 * ============================================================================
 * Every user-facing string, service, stat and contact detail lives here.
 * Components read from this file and never hard-code copy, so rebranding or
 * adding a division is an edit to this file alone.
 *
 * ⚠️  PLACEHOLDERS: anything marked `TODO` below is invented scaffolding —
 *     phone numbers, emails, ABN, addresses, founding year and stats.
 *     Replace them with the real details before this site goes live.
 * ============================================================================
 */

export type Division = {
  slug: string;
  /** `null` for divisions that don't have a site yet. */
  href: string | null;
  name: string;
  shortName: string;
  discipline: string;
  status: "operating" | "in-development";
  summary: string;
  /** Hex accent used by the 3D scene + card glow for this division. */
  accent: string;
  brand: "group" | "cleaning";
};

export type Service = {
  slug: string;
  title: string;
  blurb: string;
  points: string[];
  /** Which piece of cleaning equipment represents this service in 3D. */
  model: "spray" | "bucket" | "vacuum" | "keys" | "building" | "hardhat";
};

/* -------------------------------------------------------------------------- */
/* GROUP — the parent company                                                  */
/* -------------------------------------------------------------------------- */

export const group = {
  name: "Don & Silva Group",
  shortName: "D&S Group",
  initials: "DS",
  domain: "donandsilvagroup.com.au",
  url: "https://donandsilvagroup.com.au",
  tagline: "One standard. Every service.",
  eyebrow: "Australian owned & operated",

  hero: {
    line1: "One standard.",
    line2: "Every service.",
    body: "Don & Silva Group is being built as a multi-disciplinary services company, starting with cleaning. More divisions will follow, each answering to the same standard of work.",
  },

  /** The group's positioning statement. Used on /about and in metadata. */
  mission:
    "We exist to make dependable service the default, not the exception. One team, one standard, held across every division we operate.",

  /**
   * TODO: confirm the real founding year before launch.
   */
  founded: 2024,

  principles: [
    {
      title: "Do it once, properly",
      body: "We would rather take the extra twenty minutes than be called back. Every job is finished to the same brief, whoever is holding the mop.",
    },
    {
      title: "Show up when we said",
      body: "Scheduling is a promise. Our crews arrive in the window we quoted, and you hear from us before you have to chase us.",
    },
    {
      title: "One accountable group",
      body: "Every division reports into the same leadership. If something is not right, there is one number to call and one team that owns the fix.",
    },
    {
      title: "Built to expand",
      body: "Cleaning is the first division, not the last. The systems, training and standards we are building are designed to carry into every field we enter.",
    },
  ],

} as const;

/* -------------------------------------------------------------------------- */
/* DIVISIONS                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * The group's companies. Cleaning is live; the rest are marked
 * `in-development` and render as locked cards on the hub.
 *
 * TODO: rename, replace or remove the in-development entries — they are
 * illustrative placeholders for the expansion the group is planning, not
 * announced business lines.
 */
export const divisions: Division[] = [
  {
    slug: "cleaning",
    href: "/cleaning",
    name: "Don & Silva Cleaning",
    shortName: "Cleaning",
    discipline: "Commercial & residential cleaning",
    status: "operating",
    summary:
      "Contract and one-off cleaning for offices, strata, construction handovers and homes. Scoped in writing, checklist-driven, one standard every visit.",
    accent: "#2fd4c4",
    brand: "cleaning",
  },
];

export const operatingDivisions = divisions.filter(
  (d) => d.status === "operating",
);

/* -------------------------------------------------------------------------- */
/* CLEANING — the first division                                               */
/* -------------------------------------------------------------------------- */

export const cleaning = {
  name: "Don & Silva Cleaning",
  shortName: "D&S Cleaning",
  parent: group.name,
  tagline: "Cleaning held to a group standard.",
  eyebrow: "A Don & Silva Group company",

  hero: {
    line1: "Spotless,",
    line2: "on schedule.",
    body: "Commercial and residential cleaning across Melbourne and Victoria. Every site scoped in writing, worked to a checklist, and held to one standard from the first clean.",
  },

  promise:
    "If any part of a clean is not right, tell us within 24 hours and we will come back and put it right at no cost.",

  services: [
    {
      slug: "commercial",
      title: "Commercial & office",
      blurb:
        "Scheduled cleaning for offices, showrooms and workplaces — after hours, so your team walks into a reset space.",
      points: [
        "Nightly, weekly or fortnightly contracts",
        "Desks, kitchens, amenities and glass",
        "Consumables restocked and tracked",
        "After-hours access and alarm handling",
      ],
      model: "spray",
    },
    {
      slug: "end-of-lease",
      title: "End of lease & bond",
      blurb:
        "A full bond clean built against the agent's checklist, so the inspection passes the first time.",
      points: [
        "Agent-checklist driven, room by room",
        "Oven, range hood and wet areas detailed",
        "Carpet steam clean available",
        "Free re-clean if the agent flags anything",
      ],
      model: "keys",
    },
    {
      slug: "strata",
      title: "Strata & common areas",
      blurb:
        "Lobbies, lifts, stairwells, car parks and bin rooms kept presentable for residents and buyers alike.",
      points: [
        "Scheduled common-area rounds",
        "Bin room wash-out and rotation",
        "Car park and stairwell sweeping",
        "Reporting back to the committee",
      ],
      model: "building",
    },
    {
      slug: "construction",
      title: "Post-construction",
      blurb:
        "Builders clean and final handover detail — dust out of every track, seal and corner before the client walks in.",
      points: [
        "Rough, detail and final handover stages",
        "Render, silicone and sticker removal",
        "Window, track and frame detailing",
        "Coordinated around trade schedules",
      ],
      model: "hardhat",
    },
    {
      slug: "deep-clean",
      title: "Deep clean & sanitisation",
      blurb:
        "A full reset for spaces that have been let go, or need sanitising to a documented standard.",
      points: [
        "Kitchens, bathrooms and high-touch points",
        "Hospital-grade sanitiser on request",
        "Mould and grout treatment",
        "Before-and-after photo record",
      ],
      model: "bucket",
    },
    {
      slug: "domestic",
      title: "Homes & regular domestic",
      blurb:
        "Regular household cleaning with the same crew each visit, so nobody has to re-explain the house.",
      points: [
        "Weekly, fortnightly or monthly",
        "Police-checked before their first visit",
        "Products safe around kids and pets",
        "Skip or reschedule any visit free",
      ],
      model: "vacuum",
    },
  ] satisfies Service[],

  /** Why-us column on the cleaning page. */
  assurances: [
    {
      title: "Scoped in writing",
      body: "Every site gets a written scope before we quote, so you know exactly what is and is not included. Nothing is left to interpretation.",
    },
    {
      title: "Cover confirmed up front",
      body: "You will have our certificate of currency in hand before anyone sets foot on your site — not after you have asked twice.",
    },
    {
      title: "One accountable contact",
      body: "You deal with the people who own the business, not a call centre and not a subcontractor chain.",
    },
    {
      title: "Backed by the group",
      body: "Cleaning is the first Don & Silva Group division, and the standard the rest of the group will be built on.",
    },
  ],

  /**
   * The scroll-driven 3D sequence on the cleaning page.
   *
   * The order is the actual trade order — top down, dry before wet — not an
   * arbitrary four steps. Describing method is safe pre-trading: it says how
   * the work is done, not that we have already done it for anyone.
   */
  method: {
    eyebrow: "The method",
    title: "Four passes, every time,",
    titleAccent: "in that order.",
    body: "Cleaning has an order, and skipping it is why a room looks done but does not stay done. We work top down and dry before wet, so nothing we have already cleaned gets dirtied again.",
    steps: [
      {
        key: "wipe",
        label: "Wipe down",
        index: "01",
        title: "Surfaces first, top down",
        body: "Desks, sills, screens, switches and door handles. Dust falls, so every surface is done before anything touches the floor — otherwise you are just moving it around.",
      },
      {
        key: "vacuum",
        label: "Vacuum",
        index: "02",
        title: "Then the floor, dry",
        body: "Everything the wipe-down knocked loose comes up dry — grit, crumbs, hair, the edges and under the desks that get skipped when someone is rushing.",
      },
      {
        key: "mop",
        label: "Mop",
        index: "03",
        title: "Then the floor, wet",
        body: "Only once it is dry-clean does water go down. Mopping over grit drags it across the floor and leaves the streaks you can see the next morning.",
      },
      {
        key: "shine",
        label: "Final pass",
        index: "04",
        title: "Then the once-over",
        body: "Glass, chrome and the details you notice only when they are wrong. This is the pass that decides whether a room reads as clean or merely tidied.",
      },
    ],
  },

  process: [
    {
      step: "01",
      title: "Walkthrough",
      body: "We visit the site, understand the space and agree exactly what is in scope.",
    },
    {
      step: "02",
      title: "Written quote",
      body: "A fixed, itemised quote within 24 hours. No hourly surprises, no vague line items.",
    },
    {
      step: "03",
      title: "First clean",
      body: "Your crew is briefed on your site and works to the agreed checklist from the first visit.",
    },
    {
      step: "04",
      title: "Held to it",
      body: "Scheduled spot-checks and an open line back to us. If it slips, we fix it.",
    },
  ],

  /**
   * TODO: trim or extend to the areas you actually cover. These are the
   * standard Melbourne metro groupings, not a confirmed coverage map.
   */
  serviceAreas: [
    "Melbourne CBD",
    "Inner North",
    "Inner East",
    "Bayside",
    "Eastern Suburbs",
    "South East",
    "Western Suburbs",
    "Northern Suburbs",
  ],

  faqs: [
    {
      q: "Do you bring your own equipment and products?",
      a: "Yes — we arrive fully equipped. If your site needs specific products or a particular chemical register, we will work to it.",
    },
    {
      q: "Are you insured?",
      a: "Public liability cover is in place before we take on a site, and we provide a certificate of currency before any work starts. Ask and it is yours.",
    },
    {
      q: "Can we get the same cleaners each visit?",
      a: "Yes. Consistency is how the standard holds, so we keep the same people on your site wherever we can.",
    },
    {
      q: "What if something is not done properly?",
      a: "Tell us within 24 hours and we will return and correct it at no charge. That applies to every service we run.",
    },
    {
      q: "How quickly can you start?",
      a: "One-off cleans can often be booked within a few days. Contract work starts once we have walked the site and agreed a scope.",
    },
    {
      q: "Do you clean outside standard hours?",
      a: "Yes. Most of our commercial work runs after hours or overnight so it never interrupts your business.",
    },
  ],
} as const;

/* -------------------------------------------------------------------------- */
/* CONTACT                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * TODO: every value in this block is a placeholder. Replace before launch —
 * these are not real, working contact details.
 */
export const contact = {
  phoneDisplay: "1300 000 000",
  phoneHref: "tel:1300000000",
  email: "hello@donandsilvagroup.com.au",
  emailCleaning: "cleaning@donandsilvagroup.com.au",
  abn: "00 000 000 000",
  region: "Melbourne & Victoria, Australia",
  hours: "Mon–Sat, 7:00am – 6:00pm (Melbourne time)",
  socials: [
    { label: "Instagram", href: "#" },
    { label: "Facebook", href: "#" },
    { label: "LinkedIn", href: "#" },
  ],
} as const;

/* -------------------------------------------------------------------------- */
/* NAVIGATION                                                                  */
/* -------------------------------------------------------------------------- */

export const groupNav = [
  { label: "Group", href: "/#group" },
  { label: "Divisions", href: "/#divisions" },
  { label: "Standard", href: "/#standard" },
  { label: "Contact", href: "/contact" },
] as const;

export const cleaningNav = [
  { label: "Method", href: "/cleaning#method" },
  { label: "Services", href: "/cleaning#services" },
  { label: "Process", href: "/cleaning#process" },
  { label: "Areas", href: "/cleaning#areas" },
  { label: "FAQ", href: "/cleaning#faq" },
  { label: "Contact", href: "/contact" },
] as const;
