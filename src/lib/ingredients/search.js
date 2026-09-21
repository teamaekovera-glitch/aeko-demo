/**
 * Deterministic local search over the visible catalog — a 1:1 port of the
 * marketplace's src/lib/search/catalog-index.ts (same weights, same tokenizing,
 * same facet and ranking semantics), rendered in JSX instead of Next.js.
 *
 * Pure functions, zero network calls, zero API keys: the same dataset always
 * produces the same index and the same result ordering. Ranking is a
 * transparent TF-free weighted-coverage model — per matched token, the best
 * field weight the token appears in under that record, scaled by idf — with
 * ties broken on matched-token count and then on document order, so ordering
 * is total and reproducible.
 */

/** Field importance: what the row IS outweighs where it is. */
const FIELD_WEIGHTS = {
  name: 3,
  ingredients: 2.5,
  categories: 2,
  certifications: 1.5,
  country: 1,
  region: 0.5,
};

/** Taxonomy facet-schema form vocabulary (facet schema table, taxonomy v1). */
const FORM_PATTERNS = [
  [/\bpowder/, "powder"],
  [/\bgranulat|\bgranular|\bgranules?\b/, "granulate"],
  [/\bliquid/, "liquid"],
  [/\bsyrup/, "syrup"],
  [/\boil/, "oil"],
  [/\bbeadlet/, "beadlet"],
  [/\bcapsule/, "capsule"],
  [/\bfrozen culture/, "frozen culture"],
];

const MOQ_RE = /(\d+(?:\.\d+)?)\s*(kg|kgs|kilograms?|mt|metric\s+tons?|tonnes?)\b/gi;

/**
 * Lowercase alphanumerics: separators split tokens; commas inside numbers
 * disappear ("100,000" → "100000") so spec quantities tokenize intact.
 */
export function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/(\d),(?=\d{3}\b)/g, "$1")
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 0);
}

/** Form values sourced from ingredient text — empty where nothing is named. */
export function extractForms(ingredients) {
  const forms = new Set();
  for (const item of ingredients) {
    const text = item.toLowerCase();
    for (const [pattern, form] of FORM_PATTERNS) {
      if (pattern.test(text)) forms.add(form);
    }
  }
  return [...forms].sort();
}

/**
 * Band a verbatim MOQ string by its smallest stated quantity (the smallest
 * actionable commitment). Bare "ton" is ambiguous (short vs metric) and is
 * never converted — the band falls back to "unspecified" instead.
 */
export function bandMoq(moq) {
  if (!moq) return "unspecified";
  let minKg = Number.POSITIVE_INFINITY;
  let sawQuantity = false;
  for (const match of moq.matchAll(MOQ_RE)) {
    const qty = Number.parseFloat(match[1] ?? "");
    const unit = (match[2] ?? "").toLowerCase();
    if (Number.isNaN(qty)) continue;
    sawQuantity = true;
    const kg = unit === "kg" || unit === "kgs" || unit.startsWith("kilo") ? qty : qty * 1000;
    minKg = Math.min(minKg, kg);
  }
  if (!sawQuantity) return "unspecified";
  if (minKg <= 25) return "<=25 kg";
  if (minKg <= 100) return "26-100 kg";
  if (minKg <= 1000) return "101-1,000 kg";
  return ">1,000 kg";
}

/** Flatten the merged dataset into search records (region names from its counts). */
export function buildCatalogRecords(dataset) {
  const regionNames = new Map(
    dataset.regionCounts.map((r) => [r.regionId, r.region]),
  );
  return dataset.suppliers.map((supplier) => ({
    objectID: supplier.id,
    supplierId: supplier.id,
    name: supplier.name.value,
    region: regionNames.get(supplier.regionId) ?? supplier.regionId,
    country: supplier.country.value,
    categories: [...supplier.categories.value],
    ingredients: [...supplier.ingredients.value],
    certifications: supplier.certifications.value.map((cert) => cert.name),
    forms: extractForms(supplier.ingredients.value),
    moq: supplier.moq?.value ?? null,
    moqBand: bandMoq(supplier.moq?.value ?? null),
    priceTiers: [...new Set(supplier.priceSignals.map((signal) => signal.tier))],
    website: supplier.website.value,
    type: supplier.type?.value ?? null,
    verificationLevel: supplier.verificationLevel,
    confidence: supplier.confidence,
  }));
}

/**
 * token → postings in doc order; weight = best field weight in that doc.
 * regionCounts stays dataset-level: quarantined rows are excluded from
 * searchable records but still counted per region, so the region facet
 * reports catalog truth rather than the searchable subset.
 */
export function buildCatalogIndex(records, regionCounts) {
  const index = {
    records: [...records],
    postings: new Map(),
    docFrequencies: new Map(),
    totalDocs: records.length,
    regionCounts: regionCounts ? [...regionCounts] : undefined,
  };
  index.records.forEach((record, doc) => {
    indexField(index, doc, FIELD_WEIGHTS.name, record.name);
    indexField(index, doc, FIELD_WEIGHTS.ingredients, record.ingredients.join(" "));
    indexField(index, doc, FIELD_WEIGHTS.categories, record.categories.join(" "));
    indexField(index, doc, FIELD_WEIGHTS.certifications, record.certifications.join(" "));
    if (record.country) indexField(index, doc, FIELD_WEIGHTS.country, record.country);
    indexField(index, doc, FIELD_WEIGHTS.region, record.region);
  });
  for (const [token, list] of index.postings) {
    index.docFrequencies.set(token, list.length);
  }
  return index;
}

function indexField(index, doc, weight, text) {
  const seen = new Set();
  for (const token of tokenize(text)) {
    if (seen.has(token)) continue;
    seen.add(token);
    let list = index.postings.get(token);
    if (!list) {
      list = [];
      index.postings.set(token, list);
    }
    list.push({ doc, weight });
  }
}

function idf(index, token) {
  const df = index.docFrequencies.get(token) ?? 0;
  return Math.log(1 + index.totalDocs / df);
}

/**
 * Facet filters follow the F-07 scaffold semantics: OR within a filter
 * group, AND across groups. Values are verbatim (certification names are
 * company-stated strings and are never normalized).
 */
export function passesFilters(filters, record) {
  const intersects = (wanted, have) =>
    !wanted?.length || wanted.some((w) => have.includes(w));
  return (
    intersects(filters.regions, [record.region]) &&
    intersects(filters.countries, record.country ? [record.country] : []) &&
    intersects(filters.categories, record.categories) &&
    intersects(filters.subtypes, record.ingredients) &&
    intersects(filters.forms, record.forms) &&
    intersects(filters.certifications, record.certifications) &&
    intersects(filters.moqBands, [record.moqBand]) &&
    intersects(filters.priceTiers, record.priceTiers)
  );
}

function bump(counts, value) {
  counts.set(value, (counts.get(value) ?? 0) + 1);
}

function toCounts(counts) {
  return [...counts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) =>
      b.count !== a.count ? b.count - a.count : a.value < b.value ? -1 : a.value > b.value ? 1 : 0,
    );
}

/**
 * Aggregate facet counts over the given records (sorted deterministically).
 * When dataset-level region counts are supplied, the region facet reports
 * catalog truth — quarantined rows are not searchable but still count toward
 * their region — while every other facet covers the given (matched) records.
 */
export function aggregateFacets(records, datasetRegionCounts) {
  const region = new Map();
  if (datasetRegionCounts) {
    for (const rc of datasetRegionCounts) region.set(rc.region, rc.supplierCount);
  }
  const category = new Map();
  const subtype = new Map();
  const form = new Map();
  const certification = new Map();
  const moqBand = new Map();
  const priceTiers = new Map();
  for (const record of records) {
    if (!datasetRegionCounts) bump(region, record.region);
    for (const value of record.categories) bump(category, value);
    for (const value of record.ingredients) bump(subtype, value);
    for (const value of record.forms) bump(form, value);
    for (const value of record.certifications) bump(certification, value);
    bump(moqBand, record.moqBand);
    for (const value of record.priceTiers) bump(priceTiers, value);
  }
  return {
    region: toCounts(region),
    category: toCounts(category),
    subtype: toCounts(subtype),
    form: toCounts(form),
    certification: toCounts(certification),
    moqBand: toCounts(moqBand),
    priceTiers: toCounts(priceTiers),
  };
}

/**
 * Search the index. Facet counts cover the query-matched set before facet
 * filtering. An empty query is browse mode: every record passes the query,
 * ordered by document order (objectID order). Queries with tokens require at
 * least one token match (OR semantics; coverage ranking promotes records
 * matching more of the query).
 */
export function searchCatalogIndex(index, query, filters = {}) {
  const queryTokens = [...new Set(tokenize(query))];
  const matched = [];
  for (let doc = 0; doc < index.totalDocs; doc++) {
    const record = index.records[doc];
    if (!record) continue;
    if (queryTokens.length === 0) {
      matched.push({ doc, score: 0, terms: [] });
      continue;
    }
    let score = 0;
    const terms = [];
    for (const token of queryTokens) {
      const posting = index.postings.get(token)?.find((p) => p.doc === doc);
      if (posting) {
        score += posting.weight * idf(index, token);
        terms.push(token);
      }
    }
    if (terms.length > 0) matched.push({ doc, score, terms });
  }

  const facetCounts = aggregateFacets(
    matched.map((m) => index.records[m.doc]),
    index.regionCounts,
  );

  const hits = matched
    .filter((m) => passesFilters(filters, index.records[m.doc]))
    .sort((a, b) =>
      b.score !== a.score
        ? b.score - a.score
        : b.terms.length !== a.terms.length
          ? b.terms.length - a.terms.length
          : a.doc - b.doc,
    )
    .map((m, position) => ({
      record: index.records[m.doc],
      position,
      score: m.score,
      matchedTerms: [...m.terms].sort(),
    }));

  return { query, hits, facetCounts, totalHits: hits.length };
}
