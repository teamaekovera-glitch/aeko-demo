/**
 * Catalog data layer for the Aekobaba packaging marketplace.
 *
 * Ported from aekobaba_new src/lib/catalog/{queries,view-models}.ts. The
 * Next.js app joined Prisma rows at request time; the demo is keyless and
 * static, so the same view models are joined once at build time from the
 * verbatim seed (src/data/packaging-marketplace/aekobaba-seed.json).
 *
 * Data-genuineness semantics are preserved exactly: every commercial fact in
 * the seed carries a sourceUrl + sourceCapturedAt dated snapshot; null stays
 * null so the UI can render "Ask the supplier" honestly. No value here is
 * estimated, defaulted, or invented.
 */

import seed from '../../data/packaging-marketplace/aekobaba-seed.json'
import { productImage } from './images'

/**
 * Coarse material family for the material facet. Display grouping only —
 * the exact material string the supplier publishes renders unchanged.
 * Ported verbatim from view-models.ts materialFamily().
 */
export function materialFamily(material) {
  const m = material.toLowerCase()
  if (m.includes('not specified')) return 'Not specified'
  if (m.includes('glass')) return 'Glass'
  if (m.includes('corrugat')) return 'Corrugated'
  if (
    m.includes('plastic') ||
    m.includes('polythene') ||
    m.includes('polyethylene') ||
    m.includes('ldpe') ||
    m.includes('vinyl') ||
    m.includes('cellophane') ||
    m.includes('nylon') ||
    m.includes('laminate') ||
    m.includes('foil')
  ) {
    return 'Plastic & Film'
  }
  if (
    m.includes('kraft') ||
    m.includes('paper') ||
    m.includes('cardboard') ||
    m.includes('glassine') ||
    m.includes('tissue')
  ) {
    return 'Paper & Board'
  }
  if (m.includes('aluminum') || m.includes('aluminium') || m.includes('tin') || m.includes('steel') || m.includes('metal')) {
    return 'Metal'
  }
  if (m.includes('compostable') || m.includes('biodegradable') || m.includes('bagasse') || m.includes('pla')) {
    return 'Compostable'
  }
  // Unrecognized: the first word before any parenthetical, as published.
  const firstWord = material.split(/[\s(/]/)[0].trim()
  return firstWord.length > 0 ? firstWord : 'Other'
}

/** URL-safe product id from the title; seed titles are unique across suppliers. */
function slugifyTitle(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** The dataset's own capture metadata (rendered on packaging pages). */
export const datasetMeta = seed.meta

/** Category rows joined with live product counts, name-ordered (getCategories). */
export const categories = seed.categories
  .map(({ slug, name, description }) => ({ slug, name, description, productCount: 0 }))
  .sort((a, b) => a.name.localeCompare(b.name))

const categoryBySlug = new Map(categories.map((c) => [c.slug, c]))

/**
 * One pass over the seed in file order — the same order Prisma's createdAt
 * walk produced — assigning stable per-category image indices and ids.
 */
const perCategoryIndex = new Map()
const products = []
const suppliers = []

for (const supplier of seed.suppliers) {
  const review = supplier.review
  const supplierVM = {
    slug: supplier.slug,
    name: supplier.name,
    website: supplier.website,
    location: supplier.location,
    legalIdentity: supplier.legalIdentity,
    status: supplier.status,
    isPartner: supplier.isPartner,
    // Provenance for the supplier's own facts (name, location, identity).
    sourceUrl: supplier.sourceUrl,
    sourceCapturedAt: supplier.sourceCapturedAt,
    reviewScore: review ? review.score : null,
    reviewCount: review ? review.count : 0,
    reviewPlatform: review ? review.platform : null,
    reviewSource: review
      ? { sourceUrl: review.sourceUrl, sourceCapturedAt: review.sourceCapturedAt }
      : null,
    // lastVerifiedAt is not carried in the seed — the profile renders the
    // per-fact capture dates only. Never synthesized.
    lastVerifiedAt: null,
    certifications: supplier.certifications.map((c) => ({
      name: c.name,
      sourceUrl: c.sourceUrl,
      sourceCapturedAt: c.sourceCapturedAt,
    })),
    products: [],
  }

  for (const p of supplier.products) {
    const category = categoryBySlug.get(p.categorySlug)
    if (!category) {
      throw new Error(`Seed product "${p.title}" references unknown category "${p.categorySlug}"`)
    }
    category.productCount += 1

    const indexInCategory = perCategoryIndex.get(p.categorySlug) ?? 0
    perCategoryIndex.set(p.categorySlug, indexInCategory + 1)

    const productVM = {
      id: slugifyTitle(p.title),
      title: p.title,
      description: p.description ?? null,
      material: p.material,
      materialFamily: materialFamily(p.material),
      categorySlug: p.categorySlug,
      categoryName: category.name,
      subcategory: p.subcategory ?? null,
      priceType: p.priceType,
      basePrice: p.basePrice ?? null,
      priceBasis: p.priceBasis ?? null,
      priceUnit: p.priceUnit ?? null,
      moq: p.moq ?? null,
      moqUnit: p.moqUnit ?? null,
      leadTimeDays: p.leadTimeDays ?? null,
      stockOrCustom: p.stockOrCustom,
      samplePolicyVerified: p.samplePolicyVerified,
      sourceUrl: p.sourceUrl,
      sourceCapturedAt: p.sourceCapturedAt,
      quantityBreaks: p.quantityBreaks.map((b) => ({
        minQty: b.minQty,
        maxQty: b.maxQty,
        unitPrice: b.unitPrice,
      })),
      // The seed writes exactly one primary image per product.
      images: [productImage(p, indexInCategory)],
      primaryImage: productImage(p, indexInCategory),
      supplier: supplierVM,
      certificationNames: supplier.certifications.map((c) => c.name),
    }
    products.push(productVM)
    supplierVM.products.push(productVM)
  }

  suppliers.push(supplierVM)
}

/** All product view models, seed order (createdAt-equivalent). */
export const allProducts = products

/** Supplier profiles with their full catalogs attached (getSupplier). */
export const allSuppliers = suppliers

export const suppliersBySlug = new Map(suppliers.map((s) => [s.slug, s]))

export const productsById = new Map(products.map((p) => [p.id, p]))

/** Detail-page lookups. Null when the id/slug isn't in the snapshot. */
export function findProduct(id) {
  return productsById.get(id) ?? null
}

export function findSupplier(slug) {
  return suppliersBySlug.get(slug) ?? null
}
