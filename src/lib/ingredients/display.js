/**
 * Pure display helpers — trust invariants live here so every list, grid, and
 * chip renders through the same gate. Ported from the marketplace's
 * src/lib/catalog/display.ts plus the price-signal flag classifier.
 *
 * Flag badges come from the verbatim staleness qualifier a source carries
 * (Provenance Rulebook B8): the four published flag kinds are detected from
 * the qualifier text itself — nothing is inferred, and every qualifier is
 * still shown verbatim beside the badge.
 */

/** The one honest label for a field with no fetched source (Rulebook D4). */
export const UNKNOWN_LABEL = "Unknown — pending verification";

/** Price tiers are labeled by their evidence source (Rulebook B1). */
const PRICE_TIER_LABELS = {
  "supplier-published": "Supplier-published",
  "marketplace-listed": "Marketplace-listed",
  "quote-only": "Quote-only",
};

export function priceTierLabel(tier) {
  return PRICE_TIER_LABELS[tier];
}

/**
 * v1 records every certification as it appears on the fetched page — never
 * registry-verified (Rulebook C10/C11).
 */
export function certificationChipLabel(status) {
  if (status !== "company-stated") {
    throw new Error(`Unknown certification status: ${status}`);
  }
  return "Company-stated";
}

/**
 * Classify a price signal's verbatim staleness qualifier into the published
 * flag kinds. Detection is text-based on the qualifier the source carries;
 * the returned label is a rendering badge only — the qualifier itself is
 * always displayed verbatim next to it.
 */
export function priceFlag(signal) {
  const text = signal?.staleness ?? "";
  if (/ANOMALY/i.test(text)) return { label: "Anomaly", kind: "anomaly" };
  if (/HISTORICAL/i.test(text)) return { label: "Historical", kind: "historical" };
  if (/verify-against-refresh|verify against refresh|recheck in progress/i.test(text)) {
    return { label: "Verify-against-refresh", kind: "verify" };
  }
  if (/beyond the 90-day window|undated ranges|no on-page timestamp/i.test(text)) {
    return { label: "Stale", kind: "stale" };
  }
  return null;
}

/** True when the signal carries a published figure (vs quote-only). */
export function hasPublishedValue(signal) {
  return typeof signal.value === "string" && signal.value.length > 0;
}

/** Result cap: browse stays renderable; the note states the total honestly. */
export const RESULTS_CAP = 48;
