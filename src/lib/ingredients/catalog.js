/**
 * Catalog data layer for the Ingredients prototype.
 *
 * Faithful port of the marketplace's build-time merge (src/lib/catalog/merge.ts):
 * the six regional JSON documents are imported directly — dataset truth lives
 * in src/data/suppliers/ (ported 1:1 from the marketplace repo) — quarantined
 * rows are excluded from the exported catalog, and
 * regionCounts stay dataset-level so region facets report catalog truth
 * (the merge-module contract) rather than the searchable subset.
 */

import southeastAsiaJson from "../../data/suppliers/southeast-asia.json";
import europeTurkeyAfricaJson from "../../data/suppliers/europe-turkey-africa.json";
import chinaJson from "../../data/suppliers/china.json";
import indiaSriLankaJson from "../../data/suppliers/india-sri-lanka.json";
import latinAmericaJson from "../../data/suppliers/latin-america.json";
import usCanadaJson from "../../data/suppliers/us-canada.json";

/** All regional datasets in release order — new regions append here. */
const regionalDatasets = [
  southeastAsiaJson,
  europeTurkeyAfricaJson,
  chinaJson,
  indiaSriLankaJson,
  latinAmericaJson,
  usCanadaJson,
];

/**
 * Public catalog export: quarantined rows (marketplace-tier listings,
 * directory-only profiles) stay out of every export — reason-bearing
 * withholding, never a silent drop (the row keeps its quarantine reason).
 */
export const catalogSuppliers = regionalDatasets.flatMap((dataset) =>
  dataset.suppliers.filter((supplier) => !supplier.quarantined),
);

/** Dataset-level counts per region, including withheld rows. */
export const regionCounts = regionalDatasets.map((dataset) => ({
  regionId: dataset.regionId,
  region: dataset.region,
  supplierCount: dataset.suppliers.length,
}));

/** Rows the catalog is withholding, with the reasons (disclosed, not hidden). */
export const withheldRows = regionalDatasets.flatMap((dataset) =>
  dataset.suppliers
    .filter((supplier) => supplier.quarantined)
    .map((supplier) => ({
      id: supplier.id,
      region: dataset.region,
      quarantined: supplier.quarantined,
    })),
);

export const datasetTotal = regionCounts.reduce(
  (sum, rc) => sum + rc.supplierCount,
  0,
);
export const listedCount = catalogSuppliers.length;
export const withheldCount = datasetTotal - listedCount;

/** Region retrieval dates, for "dated snapshot" framing on the shell. */
export const regionMeta = regionalDatasets.map((dataset) => ({
  regionId: dataset.regionId,
  region: dataset.region,
  retrieved: dataset.retrieved,
  suppliers: dataset.suppliers.length,
}));

/** Distinct countries in the visible catalog, with row counts (descending). */
export const countryCounts = (() => {
  const counts = new Map();
  for (const supplier of catalogSuppliers) {
    const country = supplier.country?.value;
    if (!country) continue;
    counts.set(country, (counts.get(country) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
})();

/** Suggestion chips for the finder — real ingredient terms from the catalog. */
export const ingredientSuggestions = (() => {
  const counts = new Map();
  for (const supplier of catalogSuppliers) {
    for (const item of supplier.ingredients.value) {
      const key = item.toLowerCase();
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  const wants = [
    "coconut",
    "citric acid",
    "xanthan gum",
    "vitamin c",
    "cinnamon",
    "turmeric",
  ];
  const found = [];
  for (const term of wants) {
    const exact = [...counts.entries()].find(([value]) => value.includes(term));
    if (exact && exact[1] > 0) found.push(exact[0]);
  }
  return found.slice(0, 6);
})();

export const suppliersById = new Map(catalogSuppliers.map((s) => [s.id, s]));
