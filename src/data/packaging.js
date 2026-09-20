// ---------------------------------------------------------------------------
// Packaging marketplace seed data — 13 fictional listings.
// 9 Aekovera Partner listings (pinned first) + 4 community listings with
// higher prices and weaker reviews so the contrast tells the story.
// All products, suppliers, prices, ratings, and reviews are invented for
// this demo; no real converters, orders, or emails are involved.
// ---------------------------------------------------------------------------

import { BRAND_CONTEXT } from './outreach.js'

export const CATEGORIES = [
  { id: 'all', label: 'All packaging' },
  { id: 'jars', label: 'Jars' },
  { id: 'closures', label: 'Caps & Closures' },
  { id: 'pouches', label: 'Pouches' },
  { id: 'labels', label: 'Labels' },
]

export const SAMPLE_SPEC_SHEET = 'Aekovera-Spec-Sheet-SAUCE-v1.pdf'

const TAG_LOW_MOQ = 'Low MOQ — label-ready for small brands'
const TAG_SAUCE_BRAND = 'Recommended for your sauce brand'

export const packagingListings = [
  // =========================== AEKOVERA PARTNERS ===========================

  // ----- Jars --------------------------------------------------------------
  {
    id: 'jar-12oz-63ct-allegheny',
    name: '12 oz Round Glass Sauce Jar · 63mm CT Finish',
    category: 'jars',
    supplier: 'Allegheny Glassworks Co.',
    location: 'Pittsburgh, PA',
    partner: true,
    rating: 4.9,
    reviewCount: 212,
    leadTime: '10 business days',
    art: 'jar-round',
    tags: [TAG_SAUCE_BRAND, TAG_LOW_MOQ],
    tiers: [
      { min: 1000, price: 1.1 },
      { min: 5000, price: 0.92 },
      { min: 25000, price: 0.84 },
    ],
    specs: [
      { label: 'Capacity', value: '12 oz (355 ml) · hot-fill safe' },
      { label: 'Finish', value: '63mm CT (continuous thread)' },
      { label: 'Closure', value: 'Pairs with 63mm one-piece Plastisol lid' },
      { label: 'Pallet config', value: '2,304 units · 56 cases · 48×40" GMA' },
    ],
    breakdown: { 5: 88, 4: 9, 3: 2, 2: 1, 1: 0 },
    quotes: [
      { text: 'Zero breakage across three pallets — packaging was double-corrugated and shrink-framed. Our filler loved the consistent 63mm threads.', author: 'Marissa T.', date: 'Aug 12, 2026' },
      { text: 'Best per-unit price we quoted anywhere, and the glass is noticeably heavier than the import alternative.', author: 'Devon R.', date: 'Jul 28, 2026' },
      { text: 'Ordered 1,000 units for our first run as a tiny brand. Nobody else would talk to us at that volume.', author: 'Priya S.', date: 'Jul 3, 2026' },
      { text: 'Label-ready dimensions matched the spec sheet to the millimeter. Our labels wrapped perfectly first try.', author: 'Jonah K.', date: 'Jun 15, 2026' },
    ],
  },
  {
    id: 'jar-16oz-63ct-baystate',
    name: '16 oz Squat Glass Sauce Jar · 63mm CT Finish',
    category: 'jars',
    supplier: 'Bay State Jar & Glass',
    location: 'Worcester, MA',
    partner: true,
    rating: 4.8,
    reviewCount: 164,
    leadTime: '12 business days',
    art: 'jar-squat',
    tags: [TAG_SAUCE_BRAND],
    tiers: [
      { min: 1500, price: 0.98 },
      { min: 5000, price: 0.86 },
      { min: 25000, price: 0.79 },
    ],
    specs: [
      { label: 'Capacity', value: '16 oz (473 ml) · hot-fill safe' },
      { label: 'Finish', value: '63mm CT (continuous thread)' },
      { label: 'Closure', value: 'Pairs with 63mm one-piece Plastisol lid' },
      { label: 'Pallet config', value: '1,920 units · 48 cases · 48×40" GMA' },
    ],
    breakdown: { 5: 84, 4: 12, 3: 3, 2: 1, 1: 0 },
    quotes: [
      { text: 'The squat profile stacks denser on pallets — freight came in 9% under our old jar.', author: 'Elena V.', date: 'Aug 20, 2026' },
      { text: 'Consistent wall thickness batch to batch. We run them on a hot-fill line at 190°F with no issues.', author: 'Marcus B.', date: 'Aug 2, 2026' },
      { text: 'Samples arrived in four days with the spec sheet tucked in the box. Easy yes.', author: 'Kim H.', date: 'Jul 11, 2026' },
    ],
  },
  {
    id: 'jar-32oz-70twist-blueridge',
    name: '32 oz Mason Jar · 70mm Regular Twist',
    category: 'jars',
    supplier: 'Blue Ridge Container Works',
    location: 'Asheville, NC',
    partner: true,
    rating: 4.9,
    reviewCount: 318,
    leadTime: '14 business days',
    art: 'jar-mason',
    tags: [TAG_SAUCE_BRAND],
    tiers: [
      { min: 2000, price: 1.42 },
      { min: 10000, price: 1.26 },
      { min: 50000, price: 1.18 },
    ],
    specs: [
      { label: 'Capacity', value: '32 oz (946 ml) · retort capable' },
      { label: 'Finish', value: '70mm regular twist' },
      { label: 'Closure', value: 'Pairs with 70mm deep-profile twist cap' },
      { label: 'Pallet config', value: '1,440 units · 36 cases · 48×40" GMA' },
    ],
    breakdown: { 5: 90, 4: 8, 3: 2, 2: 0, 1: 0 },
    quotes: [
      { text: 'Our premium marinara line ships in these — shelf presence is outstanding and returns are nil.', author: 'Grace L.', date: 'Sep 1, 2026' },
      { text: 'Retort-processed 12 batches so far. Seams and finish are machined-quality, no chipping.', author: 'Tom W.', date: 'Aug 18, 2026' },
      { text: 'They matched a competitor’s quote and still delivered two weeks faster.', author: 'Ana P.', date: 'Jul 22, 2026' },
    ],
  },

  // ----- Caps & Closures -----------------------------------------------------
  {
    id: 'lid-63ct-midwest',
    name: '63mm CT One-Piece Lid · Plastisol Liner, 8-Panel',
    category: 'closures',
    supplier: 'Midwest Closure Corp.',
    location: 'Columbus, OH',
    partner: true,
    rating: 4.8,
    reviewCount: 97,
    leadTime: '8 business days',
    art: 'lid-top',
    tags: ['Pairs with 63mm CT jars'],
    tiers: [
      { min: 2500, price: 0.22 },
      { min: 10000, price: 0.19 },
      { min: 50000, price: 0.16 },
    ],
    specs: [
      { label: 'Size', value: '63mm CT · 8-panel skirt' },
      { label: 'Liner', value: 'Plastisol · hot-fill & twist-off rated' },
      { label: 'Material', value: 'FDA 21 CFR food-contact laminate' },
      { label: 'Pallet config', value: '38,400 units · 60 cartons · 48×40" GMA' },
    ],
    breakdown: { 5: 85, 4: 11, 3: 3, 2: 1, 1: 0 },
    quotes: [
      { text: 'Seal integrity has been flawless on our hot-fill line — 1,200 jars, zero leakers.', author: 'Rachel D.', date: 'Aug 25, 2026' },
      { text: 'Color-matched our brand orange on the first proof. Turns the jar into the label.', author: 'Sam F.', date: 'Aug 8, 2026' },
      { text: 'The 8-panel skirt grips tight; no back-off after retort.', author: 'Luis G.', date: 'Jun 30, 2026' },
    ],
  },
  {
    id: 'cap-70twist-midwest',
    name: '70mm Deep-Profile Twist Cap · Button Plug',
    category: 'closures',
    supplier: 'Midwest Closure Corp.',
    location: 'Columbus, OH',
    partner: true,
    rating: 4.7,
    reviewCount: 76,
    leadTime: '8 business days',
    art: 'cap-side',
    tags: ['Pairs with 70mm twist jars'],
    tiers: [
      { min: 2500, price: 0.26 },
      { min: 10000, price: 0.23 },
      { min: 50000, price: 0.2 },
    ],
    specs: [
      { label: 'Size', value: '70mm regular twist · deep profile' },
      { label: 'Liner', value: 'Button plug · oxygen-barrier option' },
      { label: 'Material', value: 'FDA 21 CFR food-contact PP' },
      { label: 'Pallet config', value: '30,000 units · 50 cartons · 48×40" GMA' },
    ],
    breakdown: { 5: 81, 4: 13, 3: 4, 2: 2, 1: 0 },
    quotes: [
      { text: 'Deep profile looks premium on the 32 oz mason — the matte-touch finish photographs beautifully.', author: 'Nina C.', date: 'Aug 14, 2026' },
      { text: 'Torque specs were in the box and matched our capper settings exactly.', author: 'Owen J.', date: 'Jul 19, 2026' },
      { text: 'Reliable liner adhesion; only wish the amber colorway shipped faster.', author: 'Bea M.', date: 'Jun 9, 2026' },
    ],
  },

  // ----- Pouches -------------------------------------------------------------
  {
    id: 'pouch-8oz-spout-flexpacknw',
    name: '8 oz Spouted Sauce Pouch · Matte, Reclosable',
    category: 'pouches',
    supplier: 'Flexpack NW',
    location: 'Portland, OR',
    partner: true,
    rating: 4.8,
    reviewCount: 54,
    leadTime: '15 business days',
    art: 'pouch-spout',
    tags: [TAG_LOW_MOQ],
    tiers: [
      { min: 5000, price: 0.28 },
      { min: 20000, price: 0.24 },
      { min: 100000, price: 0.21 },
    ],
    specs: [
      { label: 'Capacity', value: '8 oz (237 ml) · hot-fill 185°F' },
      { label: 'Material', value: 'Recyclable mono-PE · high barrier' },
      { label: 'Seal', value: 'Double-seal spout · burst-tested' },
      { label: 'Pallet config', value: '40,000 units · 20 cartons · 48×40" GMA' },
    ],
    breakdown: { 5: 83, 4: 12, 3: 4, 2: 1, 1: 0 },
    quotes: [
      { text: 'Matte finish with the clear sauce window — farmers-market customers pick it up just to feel it.', author: 'Harper N.', date: 'Aug 29, 2026' },
      { text: 'Drop-tested 6 ft fully filled, no seam splits. Their burst-test report sold us.', author: 'Chris Y.', date: 'Aug 5, 2026' },
      { text: '5,000 MOQ let us pilot a pouch SKU without betting the whole year.', author: 'Dana O.', date: 'Jul 14, 2026' },
    ],
  },
  {
    id: 'pouch-12oz-standup-summit',
    name: '12 oz Stand-Up Sauce Pouch · Clear Window',
    category: 'pouches',
    supplier: 'Summit Flex Packaging',
    location: 'Denver, CO',
    partner: true,
    rating: 4.7,
    reviewCount: 41,
    leadTime: '12 business days',
    art: 'pouch-standup',
    tags: [],
    tiers: [
      { min: 5000, price: 0.31 },
      { min: 20000, price: 0.27 },
      { min: 100000, price: 0.24 },
    ],
    specs: [
      { label: 'Capacity', value: '12 oz (355 ml) · shelf-stable' },
      { label: 'Material', value: 'PET/AL/PE laminate · light barrier' },
      { label: 'Seal', value: 'Corner tear-notch · resealable zipper' },
      { label: 'Pallet config', value: '36,000 units · 18 cartons · 48×40" GMA' },
    ],
    breakdown: { 5: 79, 4: 14, 3: 5, 2: 2, 1: 0 },
    quotes: [
      { text: 'The zipper reseal actually holds sauce — no dried-out caps in the pantry return bin.', author: 'Felix A.', date: 'Aug 22, 2026' },
      { text: 'Print registration on our gradient artwork was perfect across 20k units.', author: 'Iris M.', date: 'Aug 1, 2026' },
      { text: 'Light barrier kept our chili oil from fading on shelf. Reordering.', author: 'Hank T.', date: 'Jul 6, 2026' },
    ],
  },

  // ----- Labels ----------------------------------------------------------------
  {
    id: 'label-63wrap-inkwell',
    name: 'Die-Cut BOPP Label · 63mm Wrap, Matte Laminate',
    category: 'labels',
    supplier: 'Inkwell Label Co.',
    location: 'Milwaukee, WI',
    partner: true,
    rating: 4.9,
    reviewCount: 188,
    leadTime: '7 business days',
    art: 'label-wrap',
    tags: ['Pairs with 63mm CT jars', TAG_LOW_MOQ],
    tiers: [
      { min: 500, price: 0.09 },
      { min: 5000, price: 0.07 },
      { min: 25000, price: 0.06 },
    ],
    specs: [
      { label: 'Size', value: 'Die-cut wrap · fits 12/16 oz 63mm jars' },
      { label: 'Material', value: 'White BOPP · waterproof adhesive' },
      { label: 'Finish', value: 'Matte laminate · condensation-proof' },
      { label: 'Pallet config', value: 'Rolls of 1,000 · 60 rolls per carton' },
    ],
    breakdown: { 5: 89, 4: 8, 3: 2, 2: 1, 1: 0 },
    quotes: [
      { text: 'Refrigerator-door condensation peeled every other label we tried off. These stay put through a full truck ride.', author: 'Wren B.', date: 'Aug 30, 2026' },
      { text: 'Matte laminate makes our brand orange pop without the glare. Two seasons in, zero complaints.', author: 'Theo K.', date: 'Aug 9, 2026' },
      { text: '500-label run for our market test — priced like it was nothing. Perfect for small brands.', author: 'Sofia R.', date: 'Jul 17, 2026' },
    ],
  },
  {
    id: 'label-sleeve-harbor',
    name: 'Full-Wrap Shrink Sleeve · 63mm, Gloss',
    category: 'labels',
    supplier: 'Harbor Press Group',
    location: 'Seattle, WA',
    partner: true,
    rating: 4.6,
    reviewCount: 88,
    leadTime: '11 business days',
    art: 'label-sleeve',
    tags: ['Pairs with 63mm CT jars'],
    tiers: [
      { min: 1000, price: 0.14 },
      { min: 10000, price: 0.12 },
      { min: 50000, price: 0.1 },
    ],
    specs: [
      { label: 'Size', value: 'Full-body sleeve · 63mm neck diameter' },
      { label: 'Material', value: 'PETG · 100% coverage print' },
      { label: 'Finish', value: 'Gloss · steam-shrink rated' },
      { label: 'Pallet config', value: 'Rolls of 2,000 · 40 rolls per carton' },
    ],
    breakdown: { 5: 76, 4: 17, 3: 5, 2: 1, 1: 1 },
    quotes: [
      { text: '360° artwork with no label seam — the jar looks like it was printed in-house.', author: 'Maya E.', date: 'Aug 26, 2026' },
      { text: 'Steam tunnel shrink was even, no tunneling at the neck. Their test-run video helped us spec the line.', author: 'Rick P.', date: 'Jul 29, 2026' },
      { text: 'Great quality; proofs took one extra round to nail the orange.', author: 'Jess L.', date: 'Jun 25, 2026' },
    ],
  },

  // =========================== COMMUNITY (NON-PARTNER) =======================
  {
    id: 'jar-12oz-63ct-vantagepack',
    name: '12 oz Round Glass Sauce Jar · 63mm',
    category: 'jars',
    supplier: 'VantagePack Containers',
    location: 'Newark, NJ',
    partner: false,
    rating: 3.1,
    reviewCount: 63,
    leadTime: '21–35 business days',
    art: 'jar-round',
    tags: [],
    tiers: [
      { min: 5000, price: 1.58 },
      { min: 25000, price: 1.39 },
    ],
    specs: [
      { label: 'Capacity', value: '12 oz (355 ml) · fill line unverified' },
      { label: 'Finish', value: '63mm (thread tolerance ±0.4mm)' },
      { label: 'Closure', value: 'Universal 63mm lid — fit not guaranteed' },
      { label: 'Pallet config', value: '2,400 units · unload palletized' },
    ],
    breakdown: { 5: 26, 4: 18, 3: 15, 2: 23, 1: 18 },
    quotes: [
      { text: 'Two of five cartons arrived with cracked shoulders. Replacing them took three weeks and a lot of emails.', author: 'Derek M.', date: 'Aug 27, 2026' },
      { text: 'Jar heights vary by almost 2mm across cases — our labeler kept jamming. QC is a gamble.', author: 'Yvonne C.', date: 'Aug 11, 2026' },
      { text: 'Quote looked cheap until the freight and breakage math landed. We moved on.', author: 'Omar H.', date: 'Jul 23, 2026' },
    ],
  },
  {
    id: 'jar-16oz-63ct-meridian',
    name: '16 oz Squat Glass Jar · 63mm',
    category: 'jars',
    supplier: 'Meridian Bottle Depot',
    location: 'Houston, TX',
    partner: false,
    rating: 2.9,
    reviewCount: 41,
    leadTime: '30–45 business days',
    art: 'jar-squat',
    tags: [],
    tiers: [
      { min: 10000, price: 1.35 },
      { min: 50000, price: 1.24 },
    ],
    specs: [
      { label: 'Capacity', value: '16 oz (473 ml) · nominal' },
      { label: 'Finish', value: '63mm (import tolerance)' },
      { label: 'Closure', value: 'Lid sold separately' },
      { label: 'Pallet config', value: 'On request — often mixed freight' },
    ],
    breakdown: { 5: 21, 4: 17, 3: 17, 2: 25, 1: 20 },
    quotes: [
      { text: 'Six weeks late on a promised 15-day lead. Missed our entire summer season.', author: 'Bianca F.', date: 'Aug 24, 2026' },
      { text: 'Half the order showed up in re-used cartons with no dunnage. Breakage on arrival was over 8%.', author: 'Grant S.', date: 'Aug 3, 2026' },
      { text: 'Shipping is the whole problem — production is fine once it finally leaves the dock.', author: 'Halle W.', date: 'Jul 8, 2026' },
    ],
  },
  {
    id: 'lid-63ct-cordova',
    name: '63mm CT Lid · Universal Fit',
    category: 'closures',
    supplier: 'Cordova Closure Supply',
    location: 'Bakersfield, CA',
    partner: false,
    rating: 3.4,
    reviewCount: 29,
    leadTime: '18–28 business days',
    art: 'lid-top',
    tags: [],
    tiers: [
      { min: 10000, price: 0.34 },
      { min: 50000, price: 0.29 },
    ],
    specs: [
      { label: 'Size', value: '63mm · universal (unverified fit)' },
      { label: 'Liner', value: 'Thin-film · hot-fill margin unclear' },
      { label: 'Material', value: 'Food-contact laminate · cert on request' },
      { label: 'Pallet config', value: '36,000 units · mixed cartons' },
    ],
    breakdown: { 5: 31, 4: 21, 3: 14, 2: 20, 1: 14 },
    quotes: [
      { text: 'Every third lid has a rough seam ring that shreds the jar threads at capper speed.', author: 'Nate B.', date: 'Aug 19, 2026' },
      { text: 'Quality swings between cartons — one batch seals fine, the next leaks sauce in the bag.', author: 'Carla D.', date: 'Jul 26, 2026' },
      { text: 'Dome dents in transit look terrible on a premium shelf SKU.', author: 'Victor L.', date: 'Jun 20, 2026' },
    ],
  },
  {
    id: 'pouch-8oz-spout-southport',
    name: '8 oz Spouted Pouch · Gloss',
    category: 'pouches',
    supplier: 'Southport FlexPacks',
    location: 'Charleston, SC',
    partner: false,
    rating: 3.8,
    reviewCount: 22,
    leadTime: '24–40 business days',
    art: 'pouch-spout',
    tags: [],
    tiers: [
      { min: 20000, price: 0.41 },
      { min: 100000, price: 0.36 },
    ],
    specs: [
      { label: 'Capacity', value: '8 oz (237 ml) · nominal' },
      { label: 'Material', value: 'Multi-layer laminate · non-recyclable' },
      { label: 'Seal', value: 'Single-seal spout' },
      { label: 'Pallet config', value: 'On request' },
    ],
    breakdown: { 5: 40, 4: 22, 3: 13, 2: 15, 1: 10 },
    quotes: [
      { text: 'Pouches printed beautifully — shame the vessel sat in customs for five weeks.', author: 'Alina V.', date: 'Aug 21, 2026' },
      { text: 'Seal strength is inconsistent; we saw spout leaks on the hotter fills.', author: 'Rodney P.', date: 'Jul 31, 2026' },
      { text: 'Fine for shelf-stable only. Skip it if you hot-fill above 180°F.', author: 'Trish N.', date: 'Jun 12, 2026' },
    ],
  },
]

export const partnerListings = packagingListings.filter((l) => l.partner)
export const communityListings = packagingListings.filter((l) => !l.partner)

// ----- pricing helpers (pure) ----------------------------------------------

export function applicableTier(tiers, qty) {
  return tiers.filter((t) => qty >= t.min).at(-1) ?? null
}

export function nextTierAbove(tiers, qty) {
  return tiers.find((t) => t.min > qty) ?? null
}

export function tierSavingsPct(tiers, tier) {
  const idx = tiers.indexOf(tier)
  if (idx <= 0) return 0
  return Math.round((1 - tier.price / tiers[idx - 1].price) * 100)
}

export function formatUsd(value, digits = 2) {
  return value.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: digits })
}

export function formatQty(value) {
  return value.toLocaleString('en-US')
}

export function categoryLabel(id) {
  return CATEGORIES.find((c) => c.id === id)?.label ?? id
}

// ----- simulated RFQ email (quoted from the on-file brand brief) ------------

const briefRow = (label) => BRAND_CONTEXT.rows.find((r) => r.label === label)?.value ?? ''

export function rfqEmailFor(listing) {
  const tierSummary = listing.tiers.map((t) => formatQty(t.min)).join(' / ')
  return {
    subject: `RFQ · ${listing.name} — ${BRAND_CONTEXT.client} first production run`,
    body: [
      `Hello ${listing.supplier} team,`,
      ``,
      `I'm the sourcing lead at ${BRAND_CONTEXT.client} — we're preparing the first production run of our ${briefRow('Product').toLowerCase()}, and your listing came up as a strong match on the Aekovera packaging marketplace.`,
      ``,
      `Brief on file: ${briefRow('Target volume')}, ${briefRow('Packaging')}, ${briefRow('Certifications')}.`,
      ``,
      `Could you quote the following for “${listing.name}” (${listing.location}):`,
      `• Tiered unit pricing at ${tierSummary} units`,
      `• Current lead time and capacity`,
      `• Pallet configuration and freight terms`,
      `• Food-contact compliance documentation`,
      ``,
      `The brand brief and spec sheet are attached. Happy to send artwork files whenever useful.`,
      ``,
      `Thanks,`,
      `Dana Whitfield`,
      `Sourcing · ${BRAND_CONTEXT.client}`,
    ].join('\n'),
  }
}
