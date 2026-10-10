/**
 * Deterministic product → representative-image mapping.
 *
 * Ported from aekobaba_new data/image-mapping.ts (assignment is data, not
 * code): a category-specific signal picks the closest variant where one
 * matches, otherwise a multi-variant category rotates through its variant
 * pool by the product's stable per-category index, so grids get variety
 * without ever being non-deterministic.
 *
 * Honesty rule (kept verbatim): these are generated, representative images —
 * never photos of the actual supplier's stock. Every alt text says
 * "representative". Assets were converted to WebP at build hand-off
 * (public/packaging-marketplace/products/).
 */

const IMAGE_URL_PREFIX = '/packaging-marketplace/products'

/** Asset file names under public/packaging-marketplace/products/, no extension. */
const CATEGORY_VARIANTS = {
  'pouches-bags': ['stand-up-pouch', 'kraft-pouch', 'coffee-valve-pouch'],
  'plastic-bottles': ['plastic-bottle'],
  'plastic-jars': ['plastic-jar'],
  'tubs-pails': ['tub-cup'],
  'folding-cartons': ['folding-carton'],
  labels: ['label-roll'],
  closures: ['closure-caps'],
  'pumps-sprayers': ['airless-pump'],
  corrugated: ['corrugated-box'],
  'glass-bottles': ['glass-bottle', 'glass-bottle-amber'],
  'glass-jars': ['glass-jar'],
  'collapsible-tubes': ['laminate-tube'],
  'metal-cans': ['metal-can'],
  'metal-tins': ['metal-tin'],
  'sachets-stick-packs': ['sachet-stick'],
  rollstock: ['film-roll'],
  'shrink-sleeves': ['shrink-sleeve'],
  thermoforms: ['blister-clamshell'],
  'setup-boxes': ['rigid-box'],
  'droppers-vials': ['dropper-vial'],
  aerosols: ['aerosol-can'],
  mailers: ['mailer-bag', 'mailer-kraft'],
  'cr-cannabis': ['child-resistant-jar'],
  compostables: ['compostable-pouch'],
  'brand-accessories': ['hang-tag-sticker'],
}

/**
 * Ordered signal rules per multi-variant category, matched case-insensitively
 * against "<subcategory> <title> <material>". First match wins — e.g. a
 * kraft-and-coffee pouch is a kraft pouch.
 */
const CATEGORY_SIGNALS = {
  'pouches-bags': [
    { pattern: /\bkraft\b/, asset: 'kraft-pouch' },
    { pattern: /\bcoffee\b|\bvalve\b/, asset: 'coffee-valve-pouch' },
  ],
  'glass-bottles': [
    { pattern: /\bamber\b/, asset: 'glass-bottle-amber' },
    { pattern: /\bflint\b|\bclear\b/, asset: 'glass-bottle' },
  ],
  mailers: [
    {
      pattern: /cardboard|corrugated|kraft|\bbox(es)?\b|postal tube|bo[îi]te/,
      asset: 'mailer-kraft',
    },
  ],
}

/**
 * The representative asset for one product, given its stable per-category
 * index (walk the seed in order). Throws on an unknown category so a taxonomy
 * rename fails loudly instead of rendering an empty box.
 */
export function productImageAsset(product, indexInCategory) {
  const variants = CATEGORY_VARIANTS[product.categorySlug]
  if (!variants) {
    throw new Error(
      `No representative image mapping for category "${product.categorySlug}" (product "${product.title}")`,
    )
  }
  const haystack = `${product.subcategory ?? ''} ${product.title} ${product.material}`.toLowerCase()
  const signal = CATEGORY_SIGNALS[product.categorySlug]?.find(({ pattern }) => pattern.test(haystack))
  if (signal) return signal.asset
  return variants[indexInCategory % variants.length]
}

/** The exactly-one primary image descriptor the catalog layer attaches. */
export function productImage(product, indexInCategory) {
  const asset = productImageAsset(product, indexInCategory)
  return {
    url: `${IMAGE_URL_PREFIX}/${asset}.webp`,
    alt: `${product.title} — representative packaging image`,
  }
}

/** Category-level representative asset for tiles and directory rows. */
export function categoryImageUrl(categorySlug) {
  const variants = CATEGORY_VARIANTS[categorySlug]
  return variants ? `${IMAGE_URL_PREFIX}/${variants[0]}.webp` : null
}

/** The landing hero composition (packaging lineup). */
export const HERO_IMAGE_URL = `${IMAGE_URL_PREFIX}/hero-lineup.webp`
