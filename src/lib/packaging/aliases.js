/**
 * Taxonomy alias resolution for "What are you packaging?".
 *
 * Ported 1:1 from aekobaba_new src/lib/catalog/aliases.ts: free text maps
 * onto the CPG Packaging Taxonomy through a static table — a pure function,
 * identical behavior on every render. Category slugs referenced here exist
 * in src/data/packaging-marketplace/aekobaba-seed.json (the seed is ported
 * verbatim, so a taxonomy rename fails loudly in the UI, not silently).
 */

/** One free-text intent → taxonomy categories + the packaging terms it covers. */
const ALIAS_TABLE = {
  coffee: {
    categories: ['pouches-bags', 'labels'],
    terms: ['stand-up pouches', 'valve bags', 'labels'],
  },
  espresso: {
    categories: ['pouches-bags', 'labels'],
    terms: ['stand-up pouches', 'valve bags', 'labels'],
  },
  'hot sauce': {
    categories: ['glass-bottles', 'shrink-sleeves'],
    terms: ['woozy bottles', 'shrink sleeves'],
  },
  sauce: {
    categories: ['glass-bottles', 'shrink-sleeves'],
    terms: ['woozy bottles', 'shrink sleeves'],
  },
  salsa: {
    categories: ['glass-bottles', 'glass-jars'],
    terms: ['woozy bottles', 'glass jars'],
  },
  skincare: {
    categories: ['glass-jars', 'plastic-jars', 'droppers-vials', 'pumps-sprayers', 'collapsible-tubes'],
    terms: ['glass jars', 'plastic jars', 'droppers & vials', 'pumps & sprayers', 'collapsible tubes'],
  },
  cosmetics: {
    categories: ['glass-jars', 'plastic-jars', 'pumps-sprayers', 'collapsible-tubes'],
    terms: ['jars', 'pumps & sprayers', 'collapsible tubes'],
  },
  serum: {
    categories: ['droppers-vials', 'glass-bottles'],
    terms: ['droppers & vials', 'glass bottles'],
  },
  lotion: {
    categories: ['plastic-bottles', 'pumps-sprayers'],
    terms: ['plastic bottles', 'pumps & sprayers'],
  },
  shampoo: {
    categories: ['plastic-bottles', 'pumps-sprayers'],
    terms: ['plastic bottles', 'pumps & sprayers'],
  },
  supplements: {
    categories: ['plastic-bottles', 'glass-bottles', 'droppers-vials'],
    terms: ['plastic bottles', 'glass bottles', 'droppers & vials'],
  },
  supplement: {
    categories: ['plastic-bottles', 'glass-bottles', 'droppers-vials'],
    terms: ['plastic bottles', 'glass bottles', 'droppers & vials'],
  },
  vitamins: {
    categories: ['plastic-bottles', 'glass-bottles'],
    terms: ['plastic bottles', 'glass bottles'],
  },
  'protein powder': {
    categories: ['plastic-bottles', 'pouches-bags'],
    terms: ['plastic bottles', 'pouches'],
  },
  tea: {
    categories: ['metal-tins', 'pouches-bags'],
    terms: ['tins', 'pouches'],
  },
  snacks: {
    categories: ['pouches-bags', 'folding-cartons'],
    terms: ['pouches', 'folding cartons'],
  },
  snack: {
    categories: ['pouches-bags', 'folding-cartons'],
    terms: ['pouches', 'folding cartons'],
  },
  granola: {
    categories: ['pouches-bags', 'folding-cartons'],
    terms: ['pouches', 'folding cartons'],
  },
  honey: {
    categories: ['glass-jars', 'plastic-bottles'],
    terms: ['glass jars', 'plastic bottles'],
  },
  kombucha: {
    categories: ['glass-bottles', 'closures'],
    terms: ['glass bottles', 'closures'],
  },
  juice: {
    categories: ['glass-bottles', 'plastic-bottles', 'closures'],
    terms: ['glass bottles', 'plastic bottles', 'closures'],
  },
  beverage: {
    categories: ['glass-bottles', 'plastic-bottles', 'closures'],
    terms: ['glass bottles', 'plastic bottles', 'closures'],
  },
  dressing: {
    categories: ['glass-bottles', 'plastic-bottles'],
    terms: ['glass bottles', 'plastic bottles'],
  },
  oil: {
    categories: ['glass-bottles', 'metal-cans'],
    terms: ['glass bottles', 'metal cans'],
  },
  spices: {
    categories: ['glass-jars', 'plastic-jars', 'sachets-stick-packs'],
    terms: ['glass jars', 'plastic jars', 'sachets & stick packs'],
  },
  spice: {
    categories: ['glass-jars', 'plastic-jars', 'sachets-stick-packs'],
    terms: ['glass jars', 'plastic jars', 'sachets & stick packs'],
  },
  candles: {
    categories: ['glass-jars', 'metal-tins'],
    terms: ['glass jars', 'tins'],
  },
  candle: {
    categories: ['glass-jars', 'metal-tins'],
    terms: ['glass jars', 'tins'],
  },
  soap: {
    categories: ['plastic-bottles', 'folding-cartons'],
    terms: ['plastic bottles', 'folding cartons'],
  },
  'pet food': {
    categories: ['pouches-bags', 'metal-cans'],
    terms: ['pouches', 'metal cans'],
  },
  'dog treats': {
    categories: ['pouches-bags'],
    terms: ['pouches'],
  },
  cookies: {
    categories: ['single-serve-pouches'],
    terms: ['cookie bags', 'cello bags'],
  },
  cookie: {
    categories: ['single-serve-pouches'],
    terms: ['cookie bags', 'cello bags'],
  },
  bakery: {
    categories: ['single-serve-pouches'],
    terms: ['cookie bags', 'bakery bags'],
  },
  'single-serve': {
    categories: ['single-serve-pouches'],
    terms: ['single-serve pouches', 'cookie pouches'],
  },
  // Multi-word cookie phrases resolve as whole-phrase aliases (priority 1 in
  // resolveSearchQuery) so they return ONLY the single-serve category — the
  // bare "pouches" token still falls through to pouches-bags below.
  'pouches for cookies': {
    categories: ['single-serve-pouches'],
    terms: ['cookie pouches', 'cookie bags'],
  },
  'pouch for cookies': {
    categories: ['single-serve-pouches'],
    terms: ['cookie pouches', 'cookie bags'],
  },
  'cookie pouches': {
    categories: ['single-serve-pouches'],
    terms: ['cookie bags', 'cello bags'],
  },
  'cookies pouches': {
    categories: ['single-serve-pouches'],
    terms: ['cookie pouches', 'cookie bags'],
  },
}

/** A guard against runaway unions when many tokens match. */
const MAX_MATCHED_CATEGORIES = 8

/** Mirrors the seeded taxonomy's 25 top-level slugs and their common names. */
const CATEGORY_INDEX = [
  { slug: 'pouches-bags', name: 'Flexible Pouches & Bags', matchKeys: ['pouch', 'pouches', 'bag', 'bags', 'pouches-bags'] },
  { slug: 'plastic-bottles', name: 'Plastic Bottles', matchKeys: ['plastic bottle', 'plastic bottles', 'plastic-bottles'] },
  { slug: 'plastic-jars', name: 'Plastic Jars & Canisters', matchKeys: ['plastic jar', 'plastic jars', 'canister', 'canisters', 'plastic-jars'] },
  { slug: 'tubs-pails', name: 'Tubs, Cups & Pails', matchKeys: ['tub', 'tubs', 'cup', 'cups', 'pail', 'pails', 'bucket', 'buckets', 'tubs-pails'] },
  { slug: 'folding-cartons', name: 'Folding Cartons', matchKeys: ['carton', 'cartons', 'box', 'boxes', 'folding cartons', 'folding-cartons'] },
  { slug: 'labels', name: 'Labels', matchKeys: ['label', 'labels', 'sticker', 'stickers', 'labels'] },
  { slug: 'closures', name: 'Closures', matchKeys: ['closure', 'closures', 'cap', 'caps', 'lid', 'lids', 'closures'] },
  { slug: 'pumps-sprayers', name: 'Pumps, Sprayers & Airless Dispensers', matchKeys: ['pump', 'pumps', 'sprayer', 'sprayers', 'pumps-sprayers'] },
  { slug: 'corrugated', name: 'Corrugated Shippers & Secondary Packaging', matchKeys: ['corrugated', 'shipping', 'shipper', 'shippers'] },
  { slug: 'glass-bottles', name: 'Glass Bottles', matchKeys: ['glass bottle', 'glass bottles', 'woozy', 'woozies', 'glass-bottles'] },
  { slug: 'glass-jars', name: 'Glass Jars', matchKeys: ['glass jar', 'glass jars', 'glass-jars'] },
  { slug: 'collapsible-tubes', name: 'Collapsible Tubes', matchKeys: ['tube', 'tubes', 'collapsible tubes', 'collapsible-tubes'] },
  { slug: 'metal-cans', name: 'Metal Cans — Beverage & Food', matchKeys: ['can', 'cans', 'metal cans', 'metal-cans'] },
  { slug: 'metal-tins', name: 'Metal Tins', matchKeys: ['tin', 'tins', 'metal tins', 'metal-tins'] },
  { slug: 'sachets-stick-packs', name: 'Sachets & Stick Packs', matchKeys: ['sachet', 'sachets', 'stick pack', 'stick packs', 'sachets-stick-packs'] },
  { slug: 'rollstock', name: 'Flexible Film Rollstock & Flow Wrap', matchKeys: ['rollstock', 'film', 'roll stock'] },
  { slug: 'shrink-sleeves', name: 'Shrink Sleeves', matchKeys: ['sleeve', 'sleeves', 'shrink sleeve', 'shrink sleeves', 'shrink-sleeves'] },
  { slug: 'thermoforms', name: 'Blister Packs, Clamshells & Thermoform Trays', matchKeys: ['thermoform', 'thermoforms', 'tray', 'trays', 'clamshell', 'clamshells'] },
  { slug: 'setup-boxes', name: 'Rigid Setup Boxes', matchKeys: ['rigid box', 'rigid boxes', 'setup box', 'setup boxes'] },
  { slug: 'droppers-vials', name: 'Dropper Assemblies, Vials & Roll-Ons', matchKeys: ['dropper', 'droppers', 'vial', 'vials', 'droppers-vials'] },
  { slug: 'aerosols', name: 'Aerosol Cans', matchKeys: ['aerosol', 'aerosols'] },
  { slug: 'mailers', name: 'Mailers & E-Commerce Shipping', matchKeys: ['mailer', 'mailers', 'envelope', 'envelopes', 'mailers'] },
  { slug: 'cr-cannabis', name: 'Child-Resistant & Cannabis Specialty Packaging', matchKeys: ['cannabis', 'cr-cannabis', 'dispensary'] },
  { slug: 'compostables', name: 'Compostables & Sustainable Structures', matchKeys: ['compostable', 'compostables', 'eco'] },
  {
    slug: 'brand-accessories',
    name: 'Branding Accessories: Hang Tags, Stickers, Tissue & Tape',
    matchKeys: ['accessory', 'accessories', 'tissue', 'tape', 'ribbon', 'hang tag', 'hang tags', 'brand-accessories'],
  },
]

/** Normalize free text: lowercase, collapse whitespace, drop stray punctuation. */
export function normalizeQuery(raw) {
  return raw
    .toLowerCase()
    .replace(/[^\p{L}\p{N}&\s-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Naive English de-pluralization for token matching ("coffees" → "coffee"). */
function singularize(token) {
  if (token.length > 3 && token.endsWith('ies')) return `${token.slice(0, -3)}y`
  if (token.length > 3 && token.endsWith('es') && !token.endsWith('ses')) return token.slice(0, -2)
  if (token.length > 2 && token.endsWith('s') && !token.endsWith('ss')) return token.slice(0, -1)
  return token
}

/**
 * Resolve free text to taxonomy categories.
 *
 * Priority: whole-phrase alias → longest n-gram alias → category name/slug
 * match. Returns null when nothing matches — the caller then shows the
 * honest fallback ("no taxonomy match") rather than a guess.
 */
export function resolveSearchQuery(raw) {
  const normalized = normalizeQuery(raw ?? '')
  if (!normalized) return null

  const categorySlugs = []
  const matchedTerms = []

  const addMatch = (entry) => {
    for (const slug of entry.categories) {
      if (!categorySlugs.includes(slug) && categorySlugs.length < MAX_MATCHED_CATEGORIES) {
        categorySlugs.push(slug)
      }
    }
    for (const term of entry.terms) {
      if (!matchedTerms.includes(term)) matchedTerms.push(term)
    }
  }

  const aliasFor = (phrase) => ALIAS_TABLE[phrase]

  // 1. Whole phrase as typed ("hot sauce" must win over its tokens).
  const whole = aliasFor(normalized)
  if (whole) {
    addMatch(whole)
    return { query: normalized, categorySlugs, matchedTerms }
  }

  // 2. N-grams of the tokens, longest first; singularized variants match too.
  const tokens = normalized.split(' ').filter(Boolean)
  const gramVariants = (phrase) => {
    const singular = singularize(phrase)
    return phrase === singular ? [phrase] : [phrase, singular]
  }
  for (let size = tokens.length - 1; size >= 1; size -= 1) {
    for (let start = 0; start + size <= tokens.length; start += 1) {
      const phrase = tokens.slice(start, start + size).join(' ')
      for (const variant of gramVariants(phrase)) {
        const entry = aliasFor(variant)
        if (entry) addMatch(entry)
      }
    }
  }
  if (categorySlugs.length > 0) {
    return { query: normalized, categorySlugs, matchedTerms }
  }

  // 3. Category name/slug match ("labels", "pouches", "glass jars").
  for (const category of CATEGORY_INDEX) {
    for (const variant of gramVariants(normalized)) {
      if (category.matchKeys.includes(variant)) {
        addMatch({ categories: [category.slug], terms: [category.name] })
      }
    }
  }
  if (categorySlugs.length > 0) {
    return { query: normalized, categorySlugs, matchedTerms }
  }

  return null
}
