// ---------------------------------------------------------------------------
// Cold open — pinned script & data for the cinematic intro at /intro.
//
// Every figure, name, and outcome below is FICTIONAL DEMO DATA, pinned in this
// one file for review. Nothing here is a real-world fact; nothing leaves the
// browser. Edit numbers/copy here — the components only read from this config.
//
// Timeline (seconds):
//   0–10  WAR ROOM   three agent fleets fan out to partners
//   10–30 DATA FUNNEL thousands scanned → 312 qualified → 100 contacted
//   30–50 THE BLAST  100 outreach cards across six channels + paperwork
//   50–59 HOOK       the order, then "Aeko is calling you now" → live call
// ---------------------------------------------------------------------------

export const COLD_OPEN = {
  total: 60,
  handoffAt: 59,
  defaultNext: '/outreach/live',

  beats: {
    warRoom: { start: 0, dur: 10 },
    funnel: { start: 10, dur: 20 },
    blast: { start: 30, dur: 20 },
    hook: { start: 50, dur: 10 },
  },

  // Fictional fleet codenames + product lines for the war room.
  fleets: [
    {
      code: 'Aeko',
      product: 'Private-label cookies',
      mfrs: 46,
      logistics: 12,
      tickLabel: 'packets / min',
      tickTo: 9400,
      status: 'Fanning out — 58 partners engaged',
    },
    {
      code: 'KANKR',
      product: 'Chips',
      mfrs: 39,
      logistics: 9,
      tickLabel: 'bags / min',
      tickTo: 7200,
      status: 'Fanning out — 48 partners engaged',
    },
    {
      code: 'CHANKR',
      product: 'Sparkling water',
      mfrs: 31,
      logistics: 8,
      tickLabel: 'bottles / min',
      tickTo: 11600,
      status: 'Fanning out — 39 partners engaged',
    },
  ],

  // Fictional funnel figures (the counter story) + canvas render params.
  funnel: {
    dots: 620, // rendered sample of the field — the counter tells the real story
    scanned: 4873,
    gates: [
      { label: 'Certifications', pass: 1246, kill: 0.32, at: 2.6 },
      { label: 'Capacity', pass: 604, kill: 0.26, at: 6.6 },
      { label: 'MOQ', pass: 388, kill: 0.2, at: 10.6 },
      { label: 'Price tier', pass: 312, kill: 0.16, at: 14.2 },
    ],
    qualified: 312,
    contacted: 100,
    grid: 10, // 10×10 top-100 grid
    collapseAt: 16.4,
  },

  // The blast — channel labels mirror the /outreach workspace exactly.
  blast: {
    contacts: 100,
    channels: ['Email', 'Chat', 'Voice', 'Forms', 'Quotes', 'Intro'],
    replies: 61,
    docs: [
      { kind: 'Quote requests', count: 23, at: 7.2 },
      { kind: 'Warm-intro letters', count: 7, at: 10.4 },
      { kind: 'Purchase orders', count: 12, at: 13.4 },
    ],
  },

  // The hook. Order copy per demo brief; the fineprint keeps the fiction flag
  // that the rest of the demo carries.
  hook: {
    eyebrow: 'Incoming priority · Aekovera network',
    orderLines: ['Walmart order:', '500,000 cookie packets.', 'Urgent.'],
    note: 'Fictional demo order — simulated locally, no external network.',
    callEyebrow: 'Aeko',
    callLine: 'Aeko is calling you now',
    callSub: 'Aeko · Sourcing agent · Aekovera — for Stephanie Lang · Myazon Foods',
  },
}

// ---------------------------------------------------------------------------
// Fictional partner names — hand-pinned word parts; the blast and tickers
// derive deterministic unique combos. No real companies.
// ---------------------------------------------------------------------------

export const NAME_PARTS = {
  prefixes: [
    'Harvest Row', 'Blue Pine', 'Cedar & Crumb', 'Foxglove', 'Copperline',
    'Driftwood', 'Larkspur', 'Stonebridge', 'Windmere', 'Granite Gate',
    'Juniper Mill', 'Orchard Lane', 'Kestrel', 'Riverbend', 'Saltglass',
    'Hollow Oak', 'Pale Fox', 'Ironleaf', 'Marrow Bend', 'Tidewater',
    'Bright Kettle', 'Ashford', 'Nightjar', 'Golden Sheaf', 'Fallow Field',
    'Thistledown', 'Copper Kettle', 'Birchwater', 'Meadowgate', 'Flint Row',
    'Sparrow & Sons', 'Cobble Creek', 'Winter Harbor', 'Redbarn', 'Mossgrove',
    'Lantern Works', 'Fernhollow', 'Blackberry Lane', 'Old Millstone', 'Vale & Vine',
  ],
  suffixes: [
    'Foods', 'Baking Co.', 'Provisions', 'Packaging Co.', 'Bottling Co.',
    'Snack Works', 'Manufacturing', 'Co-Packing', 'Refreshment Co.', 'Milling Co.',
    'Confections', 'Supply Co.',
  ],
  logistics: [
    'Atlas Cold Chain', 'Meridian Freight Lines', 'Cobalt Cartage', 'Pallet & Pine Logistics',
    'Northgate Drayage', 'Swift Harbor Freight', 'Iron Rail Carriers', 'Bluebird Van Lines',
    'Granite State Freight', 'Keystone Coldchain', 'Wayfare Logistics', 'Cardinal Freightways',
  ],
}

// Deterministic unique fictional manufacturer name for index i (0..99).
export function contactName(i) {
  const p = NAME_PARTS.prefixes
  const s = NAME_PARTS.suffixes
  return `${p[i % p.length]} ${s[Math.floor(i / p.length) % s.length]}`
}

// Channel assignment for contact i — deterministic spread across the six.
export function contactChannel(i) {
  return COLD_OPEN.blast.channels[i % COLD_OPEN.blast.channels.length]
}

// ---------------------------------------------------------------------------
// Deterministic PRNG (mulberry32) + pure helpers used by the beats.
// ---------------------------------------------------------------------------

export function mulberry32(seed) {
  let a = seed >>> 0
  return function next() {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const easeOutCubic = (p) => 1 - Math.pow(1 - Math.min(Math.max(p, 0), 1), 3)

// Interpolate a big counter through [time, value] waypoints (t in seconds).
export function waypointValue(t, points) {
  if (t <= points[0][0]) return points[0][1]
  for (let i = 1; i < points.length; i++) {
    if (t <= points[i][0]) {
      const [t0, v0] = points[i - 1]
      const [t1, v1] = points[i]
      const p = easeOutCubic((t - t0) / (t1 - t0))
      return Math.round(v0 + (v1 - v0) * p)
    }
  }
  return points[points.length - 1][1]
}

export const fmtInt = (n) => Math.round(n).toLocaleString('en-US')
