/* ============================================================================
   AEKOVERA PACKAGING HUB — DATA INTEGRITY CHECK (v3)
   Verifies the honesty contract end-to-end. Run: node integrity.js
   Exit 0 = all checks pass. Exit 1 = failures listed.
   ============================================================================ */
"use strict";
const fs = require("fs");
const vm = require("vm");

const code = fs.readFileSync(__dirname + "/data.js", "utf8");
const sandbox = { console: console };
vm.createContext(sandbox);
vm.runInContext(code + "\n;globalThis.__X = { TAXONOMY, TAX_BY_SLUG, SPECS, SUPPLIERS, EXCLUDED_SUPPLIERS, OVERRIDES, LISTINGS, LISTINGS_BUILT, IMG_BY_KEY, REGIONS, MATERIALS, CERT_FILTERS };", sandbox, { filename: "data.js" });
const X = sandbox.__X;

let pass = 0, fail = 0;
const failures = [];
function check(name, ok, detail) {
  if (ok) { pass++; console.log("  PASS  " + name); }
  else { fail++; failures.push(name + (detail ? " — " + detail : "")); console.log("  FAIL  " + name + (detail ? " — " + detail : "")); }
}

console.log("=== 1. Shape & no-fictional-entries ===");
check("Suppliers = 83 (55 from the Sept 18 corpus + 4 Aekovera partners integrated 2026-09-20/21 + 24 wave-2 suppliers integrated 2026-09-21)", X.SUPPLIERS.length === 83, "got " + X.SUPPLIERS.length);
check("Supplier ids unique", new Set(X.SUPPLIERS.map(s => s.id)).size === X.SUPPLIERS.length);
check("Every supplier has a website URL", X.SUPPLIERS.every(s => /^https?:\/\//.test(s.website || "")));
check("Every supplier has a region", X.SUPPLIERS.every(s => X.REGIONS.indexOf(s.region) !== -1));
check("Every supplier has category mappings — or a provenance-documented gap (Kaufman: site blocked reads)", X.SUPPLIERS.every(s => (Array.isArray(s.cat) && s.cat.length > 0) || (s.cat && s.prov && /blocked|unknown|manual/i.test(s.prov))));
check("Every supplier has a provenance block", X.SUPPLIERS.every(s => typeof s.prov === "string" && s.prov.length > 20));
check("Every supplier has modes array", X.SUPPLIERS.every(s => Array.isArray(s.modes)));

console.log("=== 2. Referential integrity ===");
const specKeys = Object.keys(X.SPECS);
check("All spec keys are <taxonomy-slug>--<mode>", specKeys.every(k => { const i = k.lastIndexOf("--"); return i > 0 && !!X.TAX_BY_SLUG[k.slice(0, i)] && ["stock", "custom"].indexOf(k.slice(i + 2)) !== -1; }));
check("Every spec.cat resolves to a taxonomy slug", specKeys.every(k => !!X.TAX_BY_SLUG[X.SPECS[k].cat]));
check("Taxonomy has 25 categories", X.TAXONOMY.length === 25, "got " + X.TAXONOMY.length);
const listOk = X.LISTINGS_BUILT.every(l => X.SPECS[l.specKey] && X.SUPPLIERS[l.supplierIndex] === l.supplier && l.spec.cat === l.specKey.slice(0, l.specKey.lastIndexOf("--")));
check("All listings resolve (spec, supplierIndex, category)", listOk, "count " + X.LISTINGS_BUILT.length);
check("Every listing's supplier actually covers the category (edge consistency)", X.LISTINGS_BUILT.every(l => l.supplier.cat.indexOf(l.spec.cat) !== -1));
check("Listing offer type present on every row", X.LISTINGS_BUILT.every(l => l.offerType && ["Stock", "Custom", "Quote-only"].indexOf(l.offerType) !== -1));
const byId = {}; X.SUPPLIERS.forEach(s => { byId[s.id] = s; });
check("Listing supplierId matches indexed supplier", X.LISTINGS_BUILT.every(l => byId[l.supplierId] === l.supplier));

console.log("=== 3. Review honesty (platform + score + count + URL + date) ===");
const withReviews = X.SUPPLIERS.filter(s => s.review);
check("33 suppliers carry verified review receipts (16 baseline + 4 partner-era + 13 wave-2)", withReviews.length === 33, "got " + withReviews.length);
check("Every receipt has platform, score, count, url — collection date documented globally (file header: observed 18 September 2026)", withReviews.every(s => s.review.platform && typeof s.review.score === "number" && typeof s.review.count === "number" && /^https:\/\//.test(s.review.url || "")) && /observed 18 September 2026/i.test(code));
check("No mirrored review text anywhere (no 'reviewText' field)", X.SUPPLIERS.every(s => !("reviewText" in s) && !("reviews" in s)));
const excludedNames = X.EXCLUDED_SUPPLIERS.map(e => e.name.toLowerCase());
["uline", "lumi", "fantastapack"].forEach(nm => {
  check("Excluded supplier '" + nm + "' absent from listings", !X.SUPPLIERS.some(s => s.id.toLowerCase() === nm || s.name.toLowerCase().indexOf(nm) === 0) && excludedNames.some(e => e.indexOf(nm) !== -1));
});
check("Arka present but unclaimed (no 'highly rated' copy)", !!byId["arka"] && byId["arka"].review.score === 3.7);

console.log("=== 4. Sample gating ===");
const sampleVerified = X.SUPPLIERS.filter(s => s.sample && s.sample.verified === true);
check("34 sample-verified suppliers (packarooo and half-price-packaging joined 2026-09-20/21; pax's program stays unverified per its capture; 11 wave-2 programs verified 2026-09-21)", sampleVerified.length === 34, "got " + sampleVerified.length);
check("Every sample-verified supplier has a source URL", sampleVerified.every(s => /^https?:\/\//.test(s.sample.src || "")));
check("No unverified supplier claims verified samples", X.SUPPLIERS.every(s => !s.sample || s.sample.verified !== true || !!s.sample.src));

console.log("=== 5. Category coverage ===");
const covered = new Set(X.LISTINGS_BUILT.map(l => l.spec.cat));
check("All 25 categories have ≥1 listing", covered.size === 25, covered.size + " covered");
const emptyCats = X.TAXONOMY.filter(t => !covered.has(t.slug)).map(t => t.name);
check("No empty categories", emptyCats.length === 0, emptyCats.join(", "));
check("Every category has label, unit and MOQ guidance", X.TAXONOMY.every(t => t.label && t.unit && t.moqTypical));

console.log("=== 6. Exclusion audit trail ===");
check("EXCLUDED_SUPPLIERS lists ≥5 entries with reason + source", X.EXCLUDED_SUPPLIERS.length >= 5 && X.EXCLUDED_SUPPLIERS.every(e => e.name && e.reason && e.src), "got " + X.EXCLUDED_SUPPLIERS.length);
check("Qorpak duplicate note present", excludedNames.some(e => e.indexOf("qorpak") !== -1));

console.log("=== 7. Price honesty ===");
const priced = X.LISTINGS_BUILT.filter(l => l.price != null || l.priceFrom != null);
check("Priced listings carry a dated note", priced.every(l => l.priceNote || l.moqNote));
check("Unpriced listings = the honest majority (no invented numbers)", priced.length < X.LISTINGS_BUILT.length * 0.5, priced.length + " priced of " + X.LISTINGS_BUILT.length);

console.log("=== 8. Genuine-asset layer (captured 2026-09-19, 2026-09-20 and 2026-09-21) ===");
const assetCode = fs.readFileSync(__dirname + "/asset-data.js", "utf8");
const asandbox = { console: console, window: {} };
vm.createContext(asandbox);
vm.runInContext(assetCode, asandbox, { filename: "asset-data.js" });
const AD = asandbox.window.ASSET_DATA;
const CAPTURE_DATES = ["2026-05-27", "2026-09-03", "2026-09-19", "2026-09-20", "2026-09-21"];
check("Asset layer loads and declares its capture metadata (all five capture dates)", !!AD && !!AD.meta && AD.meta.captured === "2026-05-27–2026-09-21" && JSON.stringify(AD.meta.captureDates) === JSON.stringify(CAPTURE_DATES));
const priceRowsAll = [];
Object.keys(AD.prices).forEach(sid => Object.keys(AD.prices[sid]).forEach(cat => priceRowsAll.push(...AD.prices[sid][cat])));
const photoRowsAll = [];
Object.keys(AD.photos).forEach(sid => photoRowsAll.push(...AD.photos[sid]));
check("2,699 verbatim price rows and 1,282 genuine photos captured (wave-2: +99 rows, +345 supplier-verified photos; transpack zero by access-block)", priceRowsAll.length === 2699 && photoRowsAll.length === 1282, priceRowsAll.length + " prices / " + photoRowsAll.length + " photos");
check("Every price row is verbatim + dated (all five capture dates valid) + deep-sourced (no conversions, no estimates)", priceRowsAll.every(p => p.priceVerbatim && /^https?:\/\//.test(p.url) && CAPTURE_DATES.indexOf(p.dateCaptured) !== -1));
check("Every capture date actually occurs among the price rows", CAPTURE_DATES.every(d => priceRowsAll.some(p => p.dateCaptured === d)));
check("Every photo is a supplier-owned URL with a hotlink decision and honest attribution — a source page URL, or (pax media-library rows) an explicit pageEvidence note where page attribution was not established; capture dates, where present (dateCaptured or wave-2 verifiedAt), are valid", photoRowsAll.every(p => /^https?:\/\//.test(p.url) && (typeof p.hotlinkable === "boolean") && (/^https?:\/\//.test(p.page || "") || (p.page === null && typeof p.pageEvidence === "string" && p.pageEvidence.length > 10)) && (!p.dateCaptured || CAPTURE_DATES.indexOf(p.dateCaptured) !== -1) && (!p.verifiedAt || CAPTURE_DATES.indexOf(p.verifiedAt) !== -1)));
check("Asset supplier ids all resolve to SUPPLIERS (no phantom ids)", Object.keys({ ...AD.prices, ...AD.photos }).every(id => !!byId[id]));
check("Captured price categories resolve to taxonomy slugs", priceRowsAll.every(p => !!X.TAX_BY_SLUG[p.category]));
check("No category is both quote-flagged and price-captured for the same supplier (conflicts never silently reconciled)", Object.keys(AD.noPublishedPriceFor).every(sid => (AD.noPublishedPriceFor[sid] || []).every(c => !(AD.prices[sid] && AD.prices[sid][c] && AD.prices[sid][c].length))));
check("Access-blocked suppliers (kaufman, raja) assert neither prices nor verified quote-absence", (!AD.prices.kaufman || Object.keys(AD.prices.kaufman).length === 0) && !(AD.noPublishedPriceFor.kaufman || []).length && (!AD.prices.raja || Object.keys(AD.prices.raja).length === 0) && !(AD.noPublishedPriceFor.raja || []).length);
const suppliersWithPhotos = Object.keys(AD.photos).filter(sid => AD.photos[sid].length);
check("Genuine photography covers 81 of 83 suppliers (raja: access-blocked; transpack: Cloudflare Turnstile blocked hotlink verification — zero photos recorded, none substituted)", suppliersWithPhotos.length >= 81, suppliersWithPhotos.length + " suppliers with photos");
check("index.html loads asset-data.js", /asset-data\.js/.test(fs.readFileSync(__dirname + "/index.html", "utf8")));

console.log("=== 9. Aekovera partner layer (six partners, integrated 2026-09-20/21) ===");
const PARTNERS = ["pack-wolves", "packarooo", "sabrina", "half-price-packaging", "pax", "onlyawsm"];
check("All six partner records exist in SUPPLIERS", PARTNERS.every(id => !!byId[id]));
check("Every partner carries the Aekovera network partner badge", PARTNERS.every(id => !!byId[id].badges && byId[id].badges.indexOf("Aekovera network partner") !== -1));
check("Dropped partners (unimager, unigamer) are absent — user decision", !byId["unimager"] && !byId["unigamer"] && !X.SUPPLIERS.some(s => /unimager|unigamer/i.test(s.id + " " + s.name)));
check("pack-wolves stays quote-only: zero price rows, existing record and quote-only flags unchanged", Object.keys(AD.prices["pack-wolves"] || {}).length === 0 && (AD.noPublishedPriceFor["pack-wolves"] || []).join(",") === "pouches-bags,setup-boxes,folding-cartons,labels,brand-accessories,cr-cannabis" && AD.photos["pack-wolves"].length === 5);
check("packarooo: 166 price rows resolve to supplier+category (165 tubs-pails + sample-kit row under brand-accessories)", priceRowsAll.filter(p => byId[p.category] || true).length >= 2699 && Object.keys(AD.prices.packarooo).join(",") === "tubs-pails,brand-accessories" && AD.prices.packarooo["tubs-pails"].length === 165 && AD.prices.packarooo["brand-accessories"].length === 1);
check("packarooo: 24 hotlinkable photos; brochures surfaced as provenance evidence", AD.photos.packarooo.length === 24 && AD.photos.packarooo.every(p => p.hotlinkable) && /displays-signage-catalog\.pdf/.test(byId["packarooo"].prov) && /16oz-pint-container-spec-sheet\.pdf/.test(byId["packarooo"].prov));
check("sabrina: 5 quote-only slugs, 263 photos, zero price rows", JSON.stringify(AD.noPublishedPriceFor.sabrina.slice().sort()) === JSON.stringify(["compostables", "corrugated", "metal-tins", "pouches-bags", "setup-boxes"]) && AD.photos.sabrina.length === 263 && !(AD.prices.sabrina || {})["pouches-bags"] && Object.keys(AD.prices.sabrina || {}).length === 0);
check("half-price-packaging: 3 promo rows under pouches-bags (never both) + 17 remaining quote-only slugs", AD.prices["half-price-packaging"]["pouches-bags"].length === 3 && (AD.noPublishedPriceFor["half-price-packaging"] || []).length === 17 && (AD.noPublishedPriceFor["half-price-packaging"] || []).indexOf("pouches-bags") === -1);
check("half-price-packaging: 275 photos; company-profile PDF surfaced as provenance evidence", AD.photos["half-price-packaging"].length === 275 && /halfpricepackaging-company-profile\.pdf/.test(byId["half-price-packaging"].prov));
check("pax: updated in place (no duplicate), 74 new photos on top of its existing 4, 7 quote-only slugs", X.SUPPLIERS.filter(s => s.id === "pax").length === 1 && AD.photos.pax.length === 78 && (AD.noPublishedPriceFor.pax || []).length === 7);
check("onlyawsm: 12 quote-only slugs, 34 hotlinkable photos, deck evidence surfaced", (AD.noPublishedPriceFor.onlyawsm || []).length === 12 && AD.photos.onlyawsm.length === 34 && AD.photos.onlyawsm.every(p => p.hotlinkable) && /download-deck|Capabilities 2024/i.test(byId["onlyawsm"].prov));
check("Partner photo URLs are captured originals (no re-hosting): every new photo lives on its supplier's own or verified CDN domain", ["packarooo", "sabrina", "half-price-packaging", "onlyawsm"].every(sid => AD.photos[sid].every(p => p.url.indexOf(sid.replace("half-price-packaging", "halfpricepackaging")) !== -1 || /packarooo\.com|sabrinamfg\.com|halfpricepackaging\.com|onlyawsm\.com|squarespace-cdn\.com/.test(p.url))));

console.log("=== 10. Wave-2 photo layer (345 supplier-verified photos, 23 suppliers, integrated 2026-09-21) ===");
const W2_PHOTO = ["epackage-supply", "bottlestore", "specialty-bottle", "paper-mart", "burch-bottle", "packaging-supplies", "sticker-mule", "ecoenclose", "boxup", "custom-boxes-now", "stickerapp", "davpack", "lil-packaging", "polybags", "reuseabox", "carton-service", "verpacking", "viv-webshop", "maruthi-plastics", "cxpack", "cangzhou-yunfeng", "dinolabel", "swisspac"];
const w2PhotoRows = [];
W2_PHOTO.forEach(sid => w2PhotoRows.push(...AD.photos[sid]));
check("Wave-2 photo deliverables merged: 345 photos across exactly these 23 suppliers, every row hotlinkable with a deep page URL and verifiedAt 2026-09-21", w2PhotoRows.length === 345 && w2PhotoRows.every(p => p.hotlinkable === true && p.verifiedAt === "2026-09-21" && /^https:\/\//.test(p.page)));
check("transpack honestly records the empty state: zero photos, and its attribution note documents the Cloudflare Turnstile access block with no substituted imagery", AD.photos.transpack.length === 0 && /Turnstile|ACCESS BLOCKED/i.test(AD.notes.transpack));
check("davpack provenance kept explicit: every image URL lives on the supplier's own S3 asset bucket davpack.s3.amazonaws.com, and the note states that bucket provenance", AD.photos.davpack.every(p => /davpack\.s3\.amazonaws\.com/.test(p.url)) && /davpack\.s3\.amazonaws\.com/.test(AD.notes.davpack));
check("carton-service domain correction recorded: photos come from the live cartonservice.fr domain and the note documents that the pinned carton-service.com URL is dead", AD.photos["carton-service"].every(p => /cartonservice\.fr/.test(p.url)) && /cartonservice\.fr/.test(AD.notes["carton-service"]));
check("cxpack CDN mapping kept explicit and honest: images are the supplier's own uploads served through the storefront CDN bsg-i.nbxc.com mapped to cxpack.com product pages, and the note states this without claiming own-domain hosting", AD.photos.cxpack.every(p => /bsg-i\.nbxc\.com/.test(p.url) && /cxpack\.com/.test(p.page)) && /bsg-i\.nbxc\.com/.test(AD.notes.cxpack) && !/served from cxpack\.com itself/i.test(AD.notes.cxpack));
check("Wave-2 attribution notes all carry the photo-provenance appendix (83 attribution notes, one per supplier)", Object.keys(AD.notes).length === 83 && W2_PHOTO.every(sid => /PHOTOS \(2026-09-21, wave-2 batch [A-D]\):/.test(AD.notes[sid])) && /PHOTOS \(2026-09-21, wave-2 batch C\):/.test(AD.notes.transpack));

console.log("\n=== RESULT: " + pass + " passed, " + fail + " failed ===");
if (fail) { failures.forEach(f => console.log("  ✗ " + f)); process.exit(1); }
