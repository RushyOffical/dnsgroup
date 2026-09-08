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
  /** Drives which 3D primitive the service card renders. */
  shape: "prism" | "torus" | "capsule" | "octa" | "sphere" | "box";
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
    body: "Don & Silva Group is a multi-disciplinary services company. We start with cleaning — and we are building toward a group of specialist divisions that all answer to the same standard of work.",
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

  /**
   * TODO: these figures are placeholders — replace with real numbers or
   * delete the stats band entirely rather than shipping invented metrics.
   */
  stats: [
    { value: "1", label: "Division operating", suffix: "" },
    { value: "100", label: "Satisfaction guarantee", suffix: "%" },
    { value: "24", label: "Hour quote turnaround", suffix: "h" },
    { value: "7", label: "Days a week available", suffix: "" },
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
      "Contract and one-off cleaning for offices, strata, construction handovers and homes. Insured crews, checklist-driven, same standard every visit.",
    accent: "#2fd4c4",
    brand: "cleaning",
  },
  {
    slug: "facilities",
    href: null,
    name: "Don & Silva Facilities",
    shortName: "Facilities",
    discipline: "Facilities & grounds management",
    status: "in-development",
    summary:
      "Planned division: ongoing building maintenance, grounds keeping and site presentation under one managed contract.",
    accent: "#5b8def",
    brand: "group",
  },
  {
    slug: "property",
    href: null,
    name: "Don & Silva Property",
    shortName: "Property",
    discipline: "Property care & turnover",
    status: "in-development",
    summary:
      "Planned division: end-to-end preparation of properties between tenancies — repairs, presentation and handover.",
    accent: "#a97bf0",
    brand: "group",
  },
  {
    slug: "trades",
    href: null,
    name: "Don & Silva Trades",
    shortName: "Trades",
    discipline: "Maintenance & light trades",
    status: "in-development",
    summary:
      "Planned division: the small repairs that sit between a cleaner and a full contractor, handled by one accountable crew.",
    accent: "#e08b4c",
    brand: "group",
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
    body: "Commercial and residential cleaning across Melbourne and Victoria. Fully insured crews, a written checklist for every site, and the same finish on week fifty as on day one.",
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
      shape: "prism",
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
      shape: "box",
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
      shape: "torus",
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
      shape: "octa",
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
      shape: "sphere",
    },
    {
      slug: "domestic",
      title: "Homes & regular domestic",
      blurb:
        "Regular household cleaning with the same crew each visit, so nobody has to re-explain the house.",
      points: [
        "Weekly, fortnightly or monthly",
        "Consistent, police-checked crew",
        "Products safe around kids and pets",
        "Skip or reschedule any visit free",
      ],
      shape: "capsule",
    },
  ] satisfies Service[],

  /** Why-us column on the cleaning page. */
  assurances: [
    {
      title: "Fully insured",
      body: "Public liability cover on every job, with certificates available on request before we start.",
    },
    {
      title: "Checklist-driven",
      body: "Each site gets a written scope. Crews sign off against it, so the standard does not drift between visits.",
    },
    {
      title: "Vetted crews",
      body: "Police-checked, trained in-house, and briefed on your site before their first shift.",
    },
    {
      title: "Backed by the group",
      body: "Behind the crew is Don & Silva Group — one point of accountability, not a subcontractor chain.",
    },
  ],

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
      a: "Yes. Every crew arrives fully equipped. If your site requires specific products or a particular chemical register, we will work to it.",
    },
    {
      q: "Are you insured?",
      a: "Yes — public liability cover applies to every job, and we are happy to provide certificates of currency before work starts.",
    },
    {
      q: "Can we get the same cleaners each visit?",
      a: "That is the default for contract work. Consistency is how the standard holds, so we keep the same crew on your site wherever we can.",
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
  { label: "Services", href: "/cleaning#services" },
  { label: "Process", href: "/cleaning#process" },
  { label: "Areas", href: "/cleaning#areas" },
  { label: "FAQ", href: "/cleaning#faq" },
  { label: "Contact", href: "/contact" },
] as const;
