/* ============================================================================
   AEKOVERA PACKAGING HUB — DATA LAYER v3 (REAL, PROVENANCE-BACKED)
   ----------------------------------------------------------------------------
   Every supplier, rating, sample policy and price fact below comes from the
   Aekovera research corpus, all observed 18 September 2026:
     - art_F5ybF01Q  CPG Packaging Taxonomy (25 categories)
     - art_h4fHBK9S  US & EU Supplier Candidates (31)
     - art_6XTcxoI0  India & China Supplier Candidates (30)
     - art_K7D7LV5Z  Data Permissions & Review Sources (compliance rules)
     - art_REQitXLH  Trust Color Psychology (palette tokens)
     - art_t4nB2vD3  Customer-Friendly UX Patterns
   61 candidate records → 60 unique suppliers (BowePack appears in both
   supplier docs) → 55 listed suppliers + 5 exclusions, all auditable in
   EXCLUDED_SUPPLIERS below.

   2026-09-20/21 partner integration: +4 Aekovera partners (packarooo,
   sabrina, half-price-packaging, onlyawsm) → 59 listed suppliers; pack-wolves
   and pax re-verified in place from new first-party captures. pack-wolves
   stays quote-only with its existing record and quote-only flags unchanged
   (its site currently serves an unmodified Webflow therapy template).

   2026-09-21 wave-2 integration: +24 approved published-price suppliers
   (verify/pricing-candidates-A-us-stock.json, -B-us-digital.json,
   -C-eu-uk.json, -D-asia-global.json; rejected[] candidates NOT integrated)
   → 83 listed suppliers. Their 99 verbatim price rows live in asset-data.js:
   92 captured 2026-09-21 from first-party pages, plus Exa-indexed first-party
   rows for CloudFront-gated stickerapp (2026-09-03) and one custom-boxes-now
   configurator snapshot (2026-05-27) — every row dated as captured, no
   conversions. Wave-2 Trustpilot (and Avis Vérifiés/Kiyoh/Reviews.io)
   receipts were observed 21 September 2026. NO PHOTOS this pass — photo
   capture workers run separately; wave-2 suppliers have zero photos by
   design, and renderers handle that (empty photo section). Six stock offer
   definitions were added to SPECS (pouches-bags, folding-cartons,
   setup-boxes, brand-accessories, compostables, labels — stock mode) so
   wave-2 stock sellers resolve; seven existing suppliers (pax, kite,
   macfarlane, colour-impressions, cambay, darui-glass, linghai) thereby
   gain the stock listings their existing cat+modes edges already claimed.

   HONESTY RULES ENCODED HERE:
   - Ratings are stored as {platform, score, count, url, date} receipts —
     never mirrored review text. No receipt → null → UI shows
     "No verified reviews yet".
   - "Order sample" is only possible when supplier.sample.verified === true
     AND a source URL is present. Everything else is "Request quote".
   - Fields the research did not observe stay null/unknown. The UI renders
     "Ask the supplier" / "Not published" — it never infers.
   - Prices are dated facts from the research docs ("price on Sept 2026"),
     never live quotes.
   ========================================================================== */

/* ------------------------------------------------------------------ */
/* TAXONOMY — 25 categories from the CPG Packaging Taxonomy document  */
/* ------------------------------------------------------------------ */
const TAXONOMY = [
  { slug:"pouches-bags", n:1, label:"Flexible Pouches & Bags", short:"Pouches & Bags", blurb:"Stand-up, flat, spouted, retort and Mylar — the highest-frequency food pack", img:"pouches",
    unit:"pieces", moqTypical:"Digital print 100–500 pcs · flexo 5,000+ · gravure 10,000+",
    why:"Pouches are printed packaging: cost per unit drops sharply once a print plate is amortized, so digital runs start in the hundreds while gravure needs ten thousand-plus." },
  { slug:"plastic-bottles", n:2, label:"Plastic Bottles", short:"Plastic Bottles", blurb:"PET, HDPE and PCR rounds, squeezes and jugs for every aisle", img:"pump",
    unit:"pieces", moqTypical:"Case quantities from stock (12–48/case) · custom colors from ~10,000 pcs",
    why:"Stock bottles ship in wholesale cases anyone can buy; custom colors or frosting need a production run, which is where the 10,000-piece floor comes from." },
  { slug:"plastic-jars", n:3, label:"Plastic Jars & Canisters", short:"Plastic Jars", blurb:"Straight-sided jars, canisters and spice jars in PP and PET", img:null,
    unit:"pieces", moqTypical:"Case packs (e.g. 24/case) · custom colors ~10,000+ pcs",
    why:"Jars are stock items sold by the case. Only a custom color or mold pushes you into thousands." },
  { slug:"tubs-pails", n:4, label:"Tubs, Cups & Pails", short:"Tubs & Pails", blurb:"Dairy cups, deli tubs, ice-cream pails and 1–6 gallon pails", img:"tubs",
    unit:"pieces", moqTypical:"Stock programs ~5,000–10,000 units · custom IML quoted case-by-case",
    why:"Tub and cup lines run on high-speed filling equipment, so suppliers set launch minimums in the thousands to keep lines efficient." },
  { slug:"folding-cartons", n:5, label:"Folding Cartons", short:"Folding Cartons", blurb:"Tuck-end, auto-bottom and sleeve cartons in SBS and kraft board", img:null,
    unit:"pieces", moqTypical:"From 25 units (standard-size) · 250+ (custom-size)",
    why:"Digital carton printing changed the economics — 25-unit custom runs are normal. Heavier auto-bottom structures need ~500." },
  { slug:"labels", n:6, label:"Labels", short:"Labels", blurb:"Roll labels, cut & stack, IML and wet-strength beverage labels", img:"labels",
    unit:"pieces", moqTypical:"Exact-quantity digital with no plate charges · short-run digital labels from 100–500 · flexo rolls 3,000+",
    why:"Digital label presses print exactly the quantity you order — short-run digital labels start around 100–500 pieces (Consolidated Label: 100); traditional flexo runs above roughly 3,000 rolls." },
  { slug:"closures", n:7, label:"Closures", short:"Closures", blurb:"Screw caps, child-resistant caps, flip-tops and specialty lids", img:"closures",
    unit:"pieces", moqTypical:"Case-level (e.g. 216/case) · pallet programs 75,000 pcs",
    why:"Caps are tiny, molded parts — they only make sense by the case or pallet. Custom colors require a dedicated mold run." },
  { slug:"pumps-dispensers", n:8, label:"Pumps, Sprayers & Airless", short:"Pumps & Sprayers", blurb:"Lotion pumps, mist sprayers, trigger sprayers and airless systems", img:"pump",
    unit:"pieces", moqTypical:"Case-level stock · decorating from ~5,000–10,000 pcs",
    why:"Dispensers are precision assemblies stocked by the case; printing your logo on them starts a 5,000–10,000-piece decorating run." },
  { slug:"corrugated", n:9, label:"Corrugated Shippers & Retail-Ready", short:"Corrugated", blurb:"RSC cases, die-cut cases, retail-ready trays and stretch wrap", img:null,
    unit:"pieces", moqTypical:"Stock case packs (12–25/case) · retail-ready engineered and quoted",
    why:"Plain stock cases sell by the bundled case; retail-ready displays are engineered structures quoted per design." },
  { slug:"glass-bottles", n:10, label:"Glass Bottles", short:"Glass Bottles", blurb:"Boston rounds, beverage, sauce and amber glass in flint to cobalt", img:"amber",
    unit:"pieces", moqTypical:"No MOQ from US distributors · import 5,000–10,000 · custom molds 5,000–50,000 + tooling",
    why:"US distributors will ship one case; imported or custom-molded glass needs thousands to justify the freight and the mold." },
  { slug:"glass-jars", n:11, label:"Glass Jars", short:"Glass Jars", blurb:"Mason, food, cosmetic and candle jars", img:"jars",
    unit:"pieces", moqTypical:"No MOQ from US distributors · custom colors ~10,000+ pcs",
    why:"Mason and food jars are catalog items — buy a case today. A custom color is a new production run." },
  { slug:"tubes", n:12, label:"Collapsible Tubes", short:"Tubes", blurb:"ABL, PBL, aluminum and sugarcane tubes for paste products", img:"tubes",
    unit:"pieces", moqTypical:"~10,000–50,000 pcs by structure",
    why:"Tube making is an extrusion-and-print line process — minimums start where the line stops losing money on changeovers." },
  { slug:"metal-cans", n:13, label:"Metal Cans — Beverage & Food", short:"Metal Cans", blurb:"Beverage cans, sleek cans, bottle cans and food cans", img:"alcans",
    unit:"pieces", moqTypical:"Digital print from ~1,000–5,000 cans (one pallet ≈ 5,400–7,000) · litho 50,000+",
    why:"Digital can printing accepts one-pallet programs (~5,400–7,000 cans per pallet); traditional litho lines are built for national-brand volumes of 50,000+." },
  { slug:"metal-tins", n:14, label:"Metal Tins", short:"Metal Tins", blurb:"Slip-lid, screw-top, printed litho and child-resistant tins", img:"cans",
    unit:"pieces", moqTypical:"Case-level stock (300–400 pcs) · thousands for printed tins",
    why:"Plain tins ship by the case; litho-printed tins are a metal-decorating production run." },
  { slug:"sachets", n:15, label:"Sachets & Stick Packs", short:"Sachets & Stick Packs", blurb:"3/4-side-seal sachets and stick packs, usually as rollstock", img:null,
    unit:"pieces", moqTypical:"~25,000 units per SKU · film by the 200–300 kg web",
    why:"Sachets are made at machine speed — one filling line shift produces more than most launches need, hence the five-figure minimums." },
  { slug:"rollstock", n:16, label:"Film Rollstock & Flow Wrap", short:"Rollstock & Flow Wrap", blurb:"Printed rollstock, flow-wrap and lidding films for FFS lines", img:null,
    unit:"kg", moqTypical:"200–300 kg per design (gravure) · digital from 1 kg / 100 m",
    why:"Film is ordered in kilograms, not pieces — a web that runs a form-fill-seal machine for hours. Digital printing drops the floor to a single kilo." },
  { slug:"shrink-sleeves", n:17, label:"Shrink Sleeves", short:"Shrink Sleeves", blurb:"Full-body and band sleeves in PETG, PVC and OPS", img:null,
    unit:"pieces", moqTypical:"Digital from ~500 sleeves · flexo 5,000+ · gravure 10,000–25,000",
    why:"Digital sleeve printing starts around 500 pieces; the classic print methods need thousands." },
  { slug:"thermoforms", n:18, label:"Blister, Clamshell & Trays", short:"Blister & Trays", blurb:"Pharma blisters, retail clamshells, insert and portion trays", img:"thermoform",
    unit:"pieces", moqTypical:"Simple custom 1,000–5,000 · multi-cavity 10,000–25,000 · stock via distributors with no MOQ",
    why:"Custom blisters and trays need a mold ($800–$3,500 prototype) — after tooling, per-unit cost falls as volume rises." },
  { slug:"setup-boxes", n:19, label:"Rigid Setup Boxes", short:"Rigid Setup Boxes", blurb:"Two-piece rigid, magnetic-folio and rigid tubes", img:"rigid",
    unit:"pieces", moqTypical:"~100+ units at specialty houses",
    why:"Rigid boxes are hand-wrapped board — labor sets the floor, so minimums hover around one hundred." },
  { slug:"droppers-vials", n:20, label:"Droppers, Vials & Roll-Ons", short:"Droppers & Vials", blurb:"Euro droppers, glass droppers, crimp vials and roll-ons", img:"droppers",
    unit:"pieces", moqTypical:"Case-level stock (48–168/case)",
    why:"A wellness-launch workhorse: buy stock dropper bottles by the case with no custom tooling at all." },
  { slug:"aerosols", n:21, label:"Aerosol Cans", short:"Aerosols", blurb:"Aluminum and steel aerosol cans with valve systems", img:null,
    unit:"pieces", moqTypical:"Volume programs · quote-based",
    why:"Valve compatibility and pressure regulations make aerosols a quote-only, volume-program category." },
  { slug:"mailers", n:22, label:"Mailers & E-Commerce Shipping", short:"Mailers & Shipping", blurb:"Poly, bubble, rigid and corrugated mailers — stock to branded", img:"boxes",
    unit:"pieces", moqTypical:"Ready-to-ship stock from 50 · branded boxes from 1–25 · custom poly 500–10,000",
    why:"Stock mailers are shelf items. Branded boxes can start at a single unit; printed poly film needs a production run." },
  { slug:"cr-cannabis", n:23, label:"Child-Resistant & Cannabis", short:"CR & Cannabis", blurb:"CR pre-roll tubes, CR glass jars, concentrate containers", img:"cr",
    unit:"pieces", moqTypical:"Stock 1,000-count cases · custom print ~500–1,000 · full custom ~5,000 with tooling",
    why:"CR certification and state compliance rules mean stock SKUs in case quantities; custom structures add tooling and certification time." },
  { slug:"compostables", n:24, label:"Compostables & Sustainable", short:"Compostables", blurb:"Compostable pouches and mailers, bagasse, PCR content", img:"sustainable",
    unit:"pieces", moqTypical:"Custom compostable runs from ~500–10,000 pcs · certified film costs ~20–30% more",
    why:"Certified-compostable structures cost ~20–30% more than standard film; custom pouch MOQs run roughly 500–10,000 pcs across public suppliers." },
  { slug:"brand-accessories", n:25, label:"Tags, Stickers, Tissue & Tape", short:"Brand Accessories", blurb:"Hang tags, die-cut stickers, printed tissue and branded tape", img:null,
    unit:"pieces", moqTypical:"Stickers from 100 · tissue 250 sheets · tape from 24 rolls",
    why:"The cheapest brand layer in packaging — digital print keeps every one of these under a few hundred units." },
];
const TAX_BY_SLUG = {};
TAXONOMY.forEach(function(t){ TAX_BY_SLUG[t.slug] = t; });

/* ------------------------------------------------------------------ */
/* SPECS — supplier-agnostic offer definitions mapped to taxonomy.     */
/* Key format: "<category>--<mode>" where mode is stock | custom.      */
/* type: "Stock" | "Custom" | "Quote-only"  (offer-type honesty field) */
/* ------------------------------------------------------------------ */
const SPECS = {
  /* ---- 1 Flexible Pouches & Bags ---- */
  "pouches-bags--custom": { cat:"pouches-bags", type:"Custom", name:"Custom stand-up & flat pouches", mat:"Film",
    materials:"PET/ALU/PE laminates, kraft outer, foil barriers", sizes:"1 oz – 32 oz retail formats",
    moq:"Digital print 100–500 pcs · flexo 5,000+ · gravure 10,000+", unit:"pieces",
    use:"Snacks, coffee, supplements, granola, pet treats",
    bullets:["Stand-up and flat pouches printed to your artwork — digital runs start at 100–500 pieces","Barrier laminates protect coffee, snacks and supplements from oxygen and light","One-way degassing valves and resealable zips available as stock hardware"] },

  /* ---- 2 Plastic Bottles ---- */
  "plastic-bottles--stock": { cat:"plastic-bottles", type:"Stock", name:"Stock plastic bottles & jugs", mat:"Plastic",
    materials:"PET, HDPE, PCR-PET, LDPE", sizes:"1 oz – 1 gallon, neck finishes 20-400 to 89-400",
    moq:"Case quantities from stock (e.g. 12–48/case)", unit:"pieces",
    use:"Shampoo, condiments, juice, cleaning refills, tinctures",
    bullets:["Warehouse stock in every common neck finish — buy a case, no tooling","PCR (recycled) PET and HDPE options for circularity targets","Pairs with stock closures, sprayers and pumps from the same distributor"] },
  "plastic-bottles--custom": { cat:"plastic-bottles", type:"Custom", name:"Custom plastic bottles", mat:"Plastic",
    materials:"PET, HDPE, PCR resins", sizes:"Custom molds and decoration",
    moq:"Custom quotes from ~10,000 pcs", unit:"pieces",
    use:"Brand-colored shampoos, frosted serums, shaped beverage bottles",
    bullets:["Custom colors, frosting and silkscreen decoration on stock silhouettes","Custom mold programs for proprietary shapes","Verify color, odor and barrier fit for PCR resins per end use"] },

  /* ---- 3 Plastic Jars ---- */
  "plastic-jars--stock": { cat:"plastic-jars", type:"Stock", name:"Stock plastic jars & canisters", mat:"Plastic",
    materials:"PP, PET, PS", sizes:"0.125 oz – gallon range, finishes 33-400 to 89-400",
    moq:"Case packs (e.g. 24/case)", unit:"pieces",
    use:"Creams, balms, scrubs, protein powder, spices",
    bullets:["Straight-sided and wide-mouth jars with matched lids in stock","Clear PET shows the product; PP suits hot-fill","Ships by the case — the fastest way to launch a cream or scrub"] },
  "plastic-jars--custom": { cat:"plastic-jars", type:"Custom", name:"Custom plastic jars", mat:"Plastic",
    materials:"PP, PET", sizes:"Custom colors and molds",
    moq:"Custom colors ~10,000+ pcs", unit:"pieces",
    use:"Brand-color cosmetic lines, proprietary canisters",
    bullets:["Custom color matching to your brand palette","Custom mold programs for signature jar silhouettes","Quote-based — lead time set after mold approval"] },

  /* ---- 4 Tubs, Cups & Pails ---- */
  "tubs-pails--stock": { cat:"tubs-pails", type:"Stock", name:"Stock tubs, cups & pails", mat:"Plastic",
    materials:"PP, PET, RPET, HDPE", sizes:"4 oz – 6 gallon",
    moq:"Stock programs ~5,000–10,000 units", unit:"pieces",
    use:"Yogurt, deli salads, ice cream, protein powder, foodservice",
    bullets:["Dairy cups, deli tubs, ice-cream pails and 1–6 gallon pails","Tamper-evident and peel/foil lidding options","Stock for launch; IML decoration available at volume"] },
  "tubs-pails--custom": { cat:"tubs-pails", type:"Custom", name:"Custom tubs & IML programs", mat:"Plastic",
    materials:"PP, IML-decorated", sizes:"Custom print and structures",
    moq:"Volume programs, quoted case-by-case", unit:"pieces",
    use:"Branded yogurt lines, painted pails, private-label foodservice",
    bullets:["In-mold labeling fuses graphics into the wall during molding","Custom structures engineered to your filling line","Quoted per program — lead time after design approval"] },

  /* ---- 5 Folding Cartons ---- */
  "folding-cartons--custom": { cat:"folding-cartons", type:"Custom", name:"Custom folding cartons", mat:"Paper",
    materials:"SBS, C1S, kraft and recycled paperboard", sizes:"Custom dielines to product",
    moq:"From 25 units (standard-size) · 250+ (custom-size)", unit:"pieces",
    use:"Cosmetics, tea, supplements, cereal, gift sets",
    bullets:["Custom printed to your dieline — tuck-end, auto-bottom and sleeve styles","Digital proof before print on every run","Low 25-unit minimums made custom cartons a launch default"] },

  /* ---- 6 Labels ---- */
  "labels--custom": { cat:"labels", type:"Custom", name:"Custom labels", mat:"Paper",
    materials:"Paper, BOPP, vinyl, clear-on-clear", sizes:"Any die size, spec'd by core and unwind",
    moq:"Exact-quantity digital, no plate charges · custom-size rolls from 20,000", unit:"pieces",
    use:"Sauces, supplement bottles, cosmetic jars, craft beverages",
    bullets:["Digital roll labels with no plate charges — order exactly what you need","Waterproof BOPP for bath, beverage and cold-chain goods","Foil, matte, gloss and uncoated finishes"] },

  /* ---- 7 Closures ---- */
  "closures--stock": { cat:"closures", type:"Stock", name:"Stock caps & closures", mat:"Plastic",
    materials:"PP, PE (lined/unlined), phenolic, tinplate", sizes:"15-400 through 110/400+ finishes",
    moq:"Case-level (e.g. 216/case) · pallet programs 75,000 pcs", unit:"pieces",
    use:"Jars, bottles, food containers, mason jars, pouches",
    bullets:["Screw, child-resistant, flip-top and specialty lids in stock","CR-certified push-and-turn caps for regulated products","Liner options: PE, plastisol, induction seal"] },
  "closures--custom": { cat:"closures", type:"Custom", name:"Custom closures", mat:"Plastic",
    materials:"PP with custom colors and molds", sizes:"Standard finishes, custom colors",
    moq:"Custom colors quote-based", unit:"pieces",
    use:"Brand-matched cap programs",
    bullets:["Custom cap colors matched to your brand palette","Custom mold programs for proprietary closures","Quote-based with tooling lead time"] },

  /* ---- 8 Pumps, Sprayers & Airless ---- */
  "pumps-dispensers--stock": { cat:"pumps-dispensers", type:"Stock", name:"Stock pumps & sprayers", mat:"Plastic",
    materials:"PP with glass/steel options", sizes:"18-410 to 28-410 finishes; airless ≤60 ml",
    moq:"Case-level stock", unit:"pieces",
    use:"Lotions, serums, facial mists, cleaning sprays",
    bullets:["Lotion pumps, treatment pumps, fine-mist and trigger sprayers","Airless systems protect air-sensitive formulas like sunscreen and natural skincare","Standard 24-410 and 28-410 finishes match stock bottles"] },
  "pumps-dispensers--custom": { cat:"pumps-dispensers", type:"Custom", name:"Custom decorating on pumps", mat:"Plastic",
    materials:"PP with silkscreen and decorating", sizes:"Standard finishes, printed",
    moq:"Decorating from 10,000 pcs", unit:"pieces",
    use:"Branded lotion pumps and serum systems",
    bullets:["Silkscreen printing on pumps and containers from 10,000-piece runs","One-time setup fee, then repeat orders at run price","Pairs with bottle custom-color programs"] },

  /* ---- 9 Corrugated ---- */
  "corrugated--stock": { cat:"corrugated", type:"Stock", name:"Stock corrugated cases", mat:"Paper",
    materials:"B/C-flute corrugated, 32 ECT / 200# standard", sizes:"Stock dimensions by inch",
    moq:"Case packs (e.g. 12–25/case)", unit:"pieces",
    use:"Warehouse distribution, e-commerce shipping, unit loads",
    bullets:["RSC shipper cases in stock dimensions, 32 ECT as standard","44 ECT above ~60 lb loads","Ships flat in banded bundles — the workhorse outer case"] },
  "corrugated--custom": { cat:"corrugated", type:"Custom", name:"Custom corrugated & retail-ready", mat:"Paper",
    materials:"Corrugated trays + hoods, wrap-around with perfs", sizes:"Custom to shelf module",
    moq:"Engineered, quote-based", unit:"pieces",
    use:"DC-to-shelf replenishment, club-store trays, tight-fit packs",
    bullets:["Retail-ready (RRP/SRP) trays and hoods engineered to the shelf module","Die-cut cases for automation-fed lines","Quote-based — designed with the supplier's engineering team"] },

  /* ---- 10 Glass Bottles ---- */
  "glass-bottles--stock": { cat:"glass-bottles", type:"Stock", name:"Stock glass bottles", mat:"Glass",
    materials:"Soda-lime glass (flint/amber/blue/green)", sizes:"0.5 oz – 1 gallon",
    moq:"No MOQ from US distributors · import 5,000–10,000", unit:"pieces",
    use:"Tinctures, hot sauce, kombucha, essential oils, bitters",
    bullets:["Boston rounds, beverage bottles and Woozy sauce styles in stock","Amber, cobalt and green glass for UV-sensitive fills","US distributors ship a single case — import programs start at 5,000–10,000"] },
  "glass-bottles--custom": { cat:"glass-bottles", type:"Custom", name:"Custom glass bottles", mat:"Glass",
    materials:"Soda-lime, custom molds and decoration", sizes:"Custom shapes and embossing",
    moq:"Custom molds 5,000–50,000 pcs + tooling fee", unit:"pieces",
    use:"Prestige spirits, branded sauces, custom cosmetic glass",
    bullets:["Custom molds from ~$3,200 to $27,000 depending on complexity and MOQ","Embossing, frosting, decal and screen-print decoration","Pilot molds typically 4–5 weeks after mold approval"] },

  /* ---- 11 Glass Jars ---- */
  "glass-jars--stock": { cat:"glass-jars", type:"Stock", name:"Stock glass jars", mat:"Glass",
    materials:"Flint soda-lime", sizes:"4 oz – 32 oz, 70-400/89-400 finishes",
    moq:"No MOQ from US distributors", unit:"pieces",
    use:"Honey, jams, salsa, creams, candles",
    bullets:["Mason, hex, ergonomic and pasta-jar profiles in stock","Two-piece and lug lids to match","Buy a case today — the zero-friction launch path"] },
  "glass-jars--custom": { cat:"glass-jars", type:"Custom", name:"Custom glass jars", mat:"Glass",
    materials:"Flint, frosted, custom colors", sizes:"Custom colors and decoration",
    moq:"Custom colors ~10,000+ pcs", unit:"pieces",
    use:"Brand-color cosmetic and food jars",
    bullets:["Custom glass colors and frosted finishes","Screen printing and decoration programs","Quote-based with mold lead time"] },

  /* ---- 12 Tubes ---- */
  "tubes--custom": { cat:"tubes", type:"Custom", name:"Custom collapsible tubes", mat:"Plastic",
    materials:"ABL, PBL laminates, 99.7% aluminum, sugarcane PE", sizes:"Ø13.5–60 mm, 3–400 ml",
    moq:"~10,000–50,000 pcs by structure", unit:"pieces",
    use:"Toothpaste, cosmetics, sunscreens, pharma pastes",
    bullets:["ABL and PBL laminate tubes for barrier-sensitive pastes","Aluminum tubes offset-printed up to 8 colors","Bio-based sugarcane tubes for eco-positioned lines"] },

  /* ---- 13 Metal Cans ---- */
  "metal-cans--custom": { cat:"metal-cans", type:"Quote-only", name:"Beverage & food cans", mat:"Metal",
    materials:"Aluminum 2-piece, steel", sizes:"8.3 oz – 16.9 oz beverage; retail food sizes",
    moq:"Quote-based · multi-pallet decorated programs", unit:"pieces",
    use:"Craft beer, soda, sparkling water, soup, pet food",
    bullets:["Decorated cans are production-line programs — quoted per design","Stock silver cans available through fillers","Sleek and bottle-can formats for premium RTDs"] },

  /* ---- 14 Metal Tins ---- */
  "metal-tins--stock": { cat:"metal-tins", type:"Stock", name:"Stock tins", mat:"Metal",
    materials:"Tinplate, aluminum", sizes:"0.25 – 8 oz",
    moq:"Case-level stock (e.g. 300–400 pcs)", unit:"pieces",
    use:"Lip balm, candles, salves, spices",
    bullets:["Slip-lid and screw-top tins in stock sizes","Label or decorate plain tins for launch","Child-resistant pre-roll tins by the 300–400 pc case"] },
  "metal-tins--custom": { cat:"metal-tins", type:"Custom", name:"Custom printed tins", mat:"Metal",
    materials:"Tinplate with CMYK & Pantone litho", sizes:"Custom shapes from existing molds or new tooling",
    moq:"Thousands of units for printed tins", unit:"pieces",
    use:"Tea, mints, candy, gift tins, cosmetics",
    bullets:["Embossing, debossing and full litho printing","Thousands of existing molds can skip new tooling entirely","Food-grade and brand-audit compliant factories available"] },

  /* ---- 15 Sachets ---- */
  "sachets--custom": { cat:"sachets", type:"Custom", name:"Custom sachets & stick packs", mat:"Film",
    materials:"PET/PE, PET/ALU/PE, BOPP/VMCPP", sizes:"1–30 g fills; 20–40 mm × 100–200 mm sticks",
    moq:"~25,000 units per SKU", unit:"pieces",
    use:"Condiments, sweeteners, collagen, electrolyte powders, creamers",
    bullets:["Single-serve sticks and sachets supplied as rollstock for FFS lines","MOQ set by web width and lane count","The format for sweeteners, collagen and instant coffee"] },

  /* ---- 16 Rollstock ---- */
  "rollstock--custom": { cat:"rollstock", type:"Custom", name:"Printed rollstock & flow wrap", mat:"Film",
    materials:"PET/PE, BOPP/VMCPP, PET/ALU/PE, paper/PE", sizes:"Web widths 100–380 mm",
    moq:"200–300 kg per design (gravure) · digital from 1 kg / 100 m", unit:"kg",
    use:"Form-fill-seal snacks, coffee, candy bars, lidding",
    why:"Film is bought in kilograms, not pieces — the number one surprise for first-time flexible buyers.",
    bullets:["Ordered by weight: a gravure design runs 200–300 kg of film","Digital printing starts at 1 kg / 100 m for test runs","Flow-wrap films for bars and confectionery from 1-roll minimums at short-run houses"] },

  /* ---- 17 Shrink Sleeves ---- */
  "shrink-sleeves--custom": { cat:"shrink-sleeves", type:"Custom", name:"Custom shrink sleeves", mat:"Film",
    materials:"PETG 30–60 micron, PVC, OPS", sizes:"Layflat 250–1300 mm, shrink 40–75%",
    moq:"Digital from 50–100 units · flexo 5,000+ · gravure 10,000–25,000", unit:"pieces",
    use:"Craft beer 360° branding, odd-shaped bottles, tamper evidence",
    bullets:["Full-body 360° decoration that conforms to any container","Digital sleeves from $0.08–$0.25/unit with zero plates","Preform bands for tamper-evident jars and closures"] },

  /* ---- 18 Thermoforms ---- */
  "thermoforms--custom": { cat:"thermoforms", type:"Custom", name:"Custom blisters, clamshells & trays", mat:"Plastic",
    materials:"PVC, PET, RPET, CPET, PP", sizes:"Custom footprints and cavity counts",
    moq:"Simple custom 1,000–5,000 · multi-cavity 10,000–25,000", unit:"pieces",
    use:"OTC medicine, razors, produce, gift-box inserts, prepared meals",
    bullets:["Prototype aluminum tooling $800–$3,500; production $2,500–$15,000+","At 1,000 units a tray runs ~$2–3/unit; at 5,000 a blister ~$1.65","Stock cavities via distributors with no MOQ also exist"] },

  /* ---- 19 Setup Boxes ---- */
  "setup-boxes--custom": { cat:"setup-boxes", type:"Custom", name:"Custom rigid setup boxes", mat:"Paper",
    materials:"Greyboard wrapped in printed paper", sizes:"Custom, 1.5–2.5 mm chipboard",
    moq:"~100+ units at specialty houses", unit:"pieces",
    use:"Luxury cosmetics, fragrance, gift sets, subscription kits",
    bullets:["Two-piece and magnetic-folio construction, wrapped and finished","Foil, deboss and soft-touch for flagship unboxing","Hand-wrapping sets the ~100-unit floor"] },

  /* ---- 20 Droppers & Vials ---- */
  "droppers-vials--stock": { cat:"droppers-vials", type:"Stock", name:"Stock droppers, vials & roll-ons", mat:"Glass",
    materials:"Flint/amber glass, borosilicate, LDPE", sizes:"3 cc – 50 ml",
    moq:"Case-level stock (48–168/case)", unit:"pieces",
    use:"Serums, tinctures, CBD, essential oils, eye drops",
    bullets:["Euro droppers with tamper-evident bulbs in 5–50 ml","Boston rounds with glass droppers for wellness oils","Roll-ons for perfume oils and topicals — all case-level stock"] },

  /* ---- 21 Aerosols ---- */
  "aerosols--custom": { cat:"aerosols", type:"Quote-only", name:"Aerosol cans", mat:"Metal",
    materials:"Aluminum and tinplate with valve systems", sizes:"Standard 150–750 ml formats",
    moq:"Volume programs · quote-based", unit:"pieces",
    use:"Cooking spray, shaving, air freshener, dry shampoo",
    bullets:["Valve compatibility and pressure regulations make this quote-only","Decorated cans run in multi-pallet volume programs","Stock cans available via distributors for filling"] },

  /* ---- 22 Mailers ---- */
  "mailers--stock": { cat:"mailers", type:"Stock", name:"Stock mailers & shipping", mat:"Paper",
    materials:"LDPE, paper bubble, paperboard, E-flute kraft", sizes:"6×9 in – 14.5×19 in; 5 stock box sizes",
    moq:"Ready-to-ship stock from 50", unit:"pieces",
    use:"Apparel, soft goods, fragile small goods, flat inserts",
    bullets:["Poly, bubble, rigid and corrugated mailers on the shelf","Stock E-flute boxes in five sizes from 50 units","Order today, ship your orders this week"] },
  "mailers--custom": { cat:"mailers", type:"Custom", name:"Custom branded mailers & boxes", mat:"Paper",
    materials:"E-flute kraft, LDPE, PBAT/PLA films", sizes:"Stock 5 sizes or custom dieline",
    moq:"Branded boxes from 1–25 units · custom poly 500–10,000", unit:"pieces",
    use:"Beauty, coffee subscriptions, unboxing experiences",
    bullets:["Branded corrugated mailers from a single unit — the DTC default","Custom poly and compostable mailers at production scale","Digital proof before every run"] },

  /* ---- 23 CR & Cannabis ---- */
  "cr-cannabis--custom": { cat:"cr-cannabis", type:"Custom", name:"Child-resistant packaging", mat:"Plastic",
    materials:"CR plastics, CR-lid glass, tinplate CR hinged tins", sizes:"84–120 mm tubes; 1–6 oz jars",
    moq:"Stock 1,000-count cases · custom print ~500–1,000 · full custom ~5,000 + tooling", unit:"pieces",
    use:"Pre-rolls, flower, edibles, concentrates",
    bullets:["Pop-top tubes and CR glass jars certified for state compliance","Custom print on stock CR structures from ~500–1,000 units","Fully custom CR structures need ~5,000 units plus 8–12 week certification"] },

  /* ---- 24 Compostables ---- */
  "compostables--custom": { cat:"compostables", type:"Custom", name:"Compostable & sustainable structures", mat:"Film",
    materials:"PLA/kraft, PBAT/PLA, bagasse, molded fiber, PCR films", sizes:"Pouch ladders, mailer sizes, trays",
    moq:"From 100 pcs (digital) · custom sizing 15,000–20,000", unit:"pieces",
    use:"Coffee, snacks, apparel DTC, meal kits, foodservice",
    bullets:["BPI (ASTM D6400/D6868) and TÜV OK compost certified options","Expect a ~20–30% price premium over standard film (~$1.10 vs ~$0.85/unit cited)","Digital printing keeps entry minimums at 100 pieces"] },

  /* ---- 25 Brand Accessories ---- */
  "brand-accessories--custom": { cat:"brand-accessories", type:"Custom", name:"Hang tags, stickers, tissue & tape", mat:"Paper",
    materials:"Cardstock, recycled kraft, BOPP, clear vinyl, tissue", sizes:"Custom die sizes",
    moq:"Stickers from 100 · tissue 250 sheets · tape from 24 rolls", unit:"pieces",
    use:"Sealing tissue, mailers, jar lids, candles, gift sets",
    bullets:["The cheapest brand layer in packaging — digital everything","Die-cut stickers from 100 units; printed tissue by the sheet block","Branded tape turns every sealed carton into a media placement"] },

  /* ---- Wave-2 stock offer definitions (added 2026-09-21): stock sellers
     joined whose categories previously only had custom-mode specs — added
     following the existing pattern so their listings resolve. ---- */
  "pouches-bags--stock": { cat:"pouches-bags", type:"Stock", name:"Stock pouches & bags", mat:"Film",
    materials:"PE, PP and laminate stock bags; kraft and polythene", sizes:"Flat, gusseted, grip-seal, carrier and stand-up formats in stock sizes",
    moq:"Pack-level buying from a single pack · per-100 / per-1,000 tiers at polythene specialists", unit:"pieces",
    use:"Small-batch CPG, market stalls, storage, shipping and retail carriers",
    bullets:["Stock poly bags, grip-seal bags, carrier bags and stand-up pouches bought at pack level with published from-prices","No print plate involved — artwork is a custom-print conversation, not a stock requirement","Quantity tiers publish per-1,000 pricing with Inc./Ex. VAT columns at polythene houses"] },

  "folding-cartons--stock": { cat:"folding-cartons", type:"Stock", name:"Stock gift & retail boxes", mat:"Paper",
    materials:"Kraft and colored paperboard", sizes:"Jewelry, gift, apparel and tuck-top retail formats",
    moq:"Pack-level buying (e.g. 24/pack)", unit:"pieces",
    use:"Jewelry, gifts, apparel, candy and retail shelf packaging",
    bullets:["Gift, apparel and jewelry boxes bought by the pack with published 'From' pricing","Tuck-top and gable formats ship flat — no tooling, no print run","Pairs with stock tissue and shopping bags for a full retail kit"] },

  "setup-boxes--stock": { cat:"setup-boxes", type:"Stock", name:"Stock gift & candy boxes", mat:"Paper",
    materials:"Paperboard gift, jewelry and candy boxes", sizes:"Small gift/jewelry through apparel formats",
    moq:"Pack-level buying", unit:"pieces",
    use:"Jewelry, candy and gift retail",
    bullets:["Stock gift/jewelry/candy boxes in shelf-ready finishes","Buy by the pack from retail packaging specialists","Custom print remains a separate custom-mode conversation"] },

  "brand-accessories--stock": { cat:"brand-accessories", type:"Stock", name:"Stock tissue, bags & trim", mat:"Paper",
    materials:"Tissue sheets, organza, kraft and stock trim", sizes:"Standard sheet reams and pack counts",
    moq:"Ream/pack-level buying", unit:"pieces",
    use:"Gift wrapping, unboxing fill, retail presentation",
    bullets:["Stock tissue by the ream, organza pouches by the pack — no print needed","Published 'From' pricing on retail collections","Pairs with stock boxes and shopping bags for full unboxing kits"] },

  "compostables--stock": { cat:"compostables", type:"Stock", name:"Stock biodegradable & compostable lines", mat:"Film",
    materials:"Biodegradable polythene and compostable stock lines", sizes:"Carrier bags, document envelopes and stock pouch formats",
    moq:"Pack-level buying · per-1,000 / per-2,000 from-prices", unit:"pieces",
    use:"Brands trading up from conventional polythene without a print run",
    bullets:["Biodegradable carrier bags and document-enclosed envelopes bought from stock","No plate or setup — the sustainability switch is at the material level, not the MOQ","Certified-compostable custom runs remain under the custom mode"] },

  "labels--stock": { cat:"labels", type:"Stock", name:"Stock label rolls", mat:"Paper",
    materials:"Direct-thermal and stock label stock", sizes:"Standard shipping/thermal formats (e.g. 4x6)",
    moq:"Roll-level buying · carton tiers at distributors", unit:"pieces",
    use:"Shipping labels, barcode/thermal printing, stock retail labels",
    bullets:["Direct-thermal label rolls bought by the carton with quantity-tier pricing","No printing needed — thermal/stock labels run as-is","Custom print work stays under the custom mode"] },
};

/* ------------------------------------------------------------------ */
/* SUPPLIERS — 83 listed entries: 55 from the Sept-18 research corpus,  */
/* 4 Aekovera partners (2026-09-20/21), 24 wave-2 published-price       */
/* suppliers (2026-09-21). Exclusions audited in EXCLUDED_SUPPLIERS.    */
/* Field notes:                                                        */
/*   modes: ["stock","custom"] observed stock-vs-custom capability     */
/*   cat: taxonomy slugs the supplier is sourced as covering           */
/*   sample: {t, verified, note, src} — a verified:true sample is the  */
/*     ONLY thing that may produce an "Order sample" affordance        */
/*   review: {platform, score, count, url} | null — receipt, not text  */
/*   certs: claimed-on-source entries only                             */
/*   priceNotes / lead: dated facts or null                            */
/* ------------------------------------------------------------------ */
const SUPPLIERS = [
  /* ---------- US large distributors ---------- */
  { id:"berlin", name:"Berlin Packaging", website:"https://www.berlinpackaging.com", hq:"Chicago, IL", region:"USA",
    serves:"100+ locations worldwide; global scope", modes:["stock","custom"],
    about:"Self-described world's largest hybrid container and packaging supplier — plastic, glass and metal containers, closures and dispensing systems across food, beverage, personal care, pharma, home care, pet care and cannabis.",
    cat:["plastic-bottles","plastic-jars","glass-bottles","glass-jars","tubs-pails","closures","pumps-dispensers","droppers-vials","metal-tins","metal-cans","aerosols","cr-cannabis"],
    sample:{ t:"stock_sample", verified:true, note:"Up to 5 items valued under $10 at no charge; flat $10 shipping in the continental US; not all items eligible; international orders not sample-eligible.", src:"https://www.berlinpackaging.com/request-a-sample/" },
    review:{ platform:"Trustpilot", score:4.5, count:4401, url:"https://www.trustpilot.com/review/berlinpackaging.com" },
    certs:[{n:"ISO 9001 (self-reported)",src:"berlinpackaging.com homepage badge, re-audit 2026-09-19"}], priceNotes:[], lead:null,
    prov:"Verified Sept 2026: HQ, categories, sample program and Trustpilot receipt from supplier site and Trustpilot. Unknown: certifications, lead times, category-level prices. Re-audit 2026-09-19: site, HQ, sample terms and Trustpilot receipt re-confirmed; ISO 9001 badge self-reported on homepage — added." },

  { id:"tricorbraun", name:"TricorBraun", website:"https://www.tricorbraun.com", hq:"St. Louis, MO", region:"USA",
    serves:"Global reach claimed", modes:["stock","custom"],
    about:"Stock, custom and wholesale rigid-packaging distributor — glass and plastic bottles, closures and sprayers for nutraceutical, personal care, food, beverage, household and spirits brands, with an in-house design and engineering team.",
    cat:["plastic-bottles","plastic-jars","glass-bottles","glass-jars","closures","pumps-dispensers","droppers-vials"],
    sample:{t:"stock_sample",verified:true,note:"Samples subject to availability; shipping charges may apply — request via online@tricorbraun.com (own knowledge base).",src:"https://www.tricorbraun.com/knowledge-base/does-tricorbraun-send-product-samples/"},
    review:{ platform:"Trustpilot", score:4.7, count:41, url:"https://www.trustpilot.com/review/tricorbraun.com" },
    certs:[], priceNotes:["No MOQ on stock orders (shop FAQ, Sept 2026)","16 oz amber Boston round example $40.09/case (shop, Sept 2026)"], lead:null,
    prov:"Verified Sept 2026: HQ, categories, stock program and Trustpilot receipt. Note: small review count (41). Unknown: sample program, certifications, lead times. Re-audit 2026-09-19: sample program confirmed via own knowledge base (samples subject to availability; shipping may apply) — sample gate opened." },

  { id:"sks", name:"SKS Bottle & Packaging", website:"https://www.sks-bottle.com", hq:"Saratoga Springs, NY + Sparks, NV", region:"USA",
    serves:"Ships US-wide from both coasts; serves global customers", modes:["stock","custom"],
    about:"6,000+ stock plastic and glass bottles, jars, metal containers and closures, plus decorating and custom mold design services.",
    cat:["plastic-bottles","plastic-jars","glass-bottles","glass-jars","closures","pumps-dispensers","droppers-vials","metal-tins"],
    sample:{ t:"stock_sample", verified:true, note:"Free product samples via online sample ordering — just pay a small shipping fee. Up to 3 unique items, one sample each; loyalty members ship free.", src:"https://www.sks-bottle.com/info/SampleOrderTerms.html" },
    review:{ platform:"Trustpilot", score:4.3, count:3933, url:"https://www.trustpilot.com/review/www.sks-bottle.com" },
    certs:[], priceNotes:["30 ml amber euro dropper $0.40/pc (168/case)","5 ml euro dropper $0.84/pc (48/case)","30 ml Boston round + TE glass dropper $1.44/pc (48/case)","3 cc LDPE dropper $0.38/pc (48/bag)","Silkscreen decorating from 10,000 pcs/run + one-time setup"], lead:null,
    prov:"Verified Sept 2026: HQ, catalog scope, sample terms, catalog prices and Trustpilot receipt. Unknown: lead times, certifications. Re-audit 2026-09-19: per-item MOQ 168 not publicly verifiable — replaced with observed case-pack range (48–298 pcs); catalog price re-confirmed." },

  { id:"qorpak", name:"Qorpak (a division of Berlin Packaging)", website:"https://www.qorpak.com", hq:"Bridgeville, PA", region:"USA",
    serves:"US; laboratory and industrial focus", modes:["stock"],
    about:"Laboratory and industrial packaging — glass and plastic bottles and jars, labware, cans, drums, pails and carboys. Operates as a division of Berlin Packaging.",
    cat:["plastic-bottles","plastic-jars","glass-bottles","glass-jars","closures","droppers-vials","metal-cans","tubs-pails"],
    sample:{ t:null, verified:false, note:"No sample page found this session.", src:null },
    review:null,
    certs:[], priceNotes:[], lead:null,
    prov:"Verified Sept 2026: HQ (directory listing), catalog scope, Berlin ownership. Unknown: sample program, reviews (no Trustpilot page found), lead times. Treat as Berlin division, not an independent network." },

  { id:"container-packaging", name:"Container & Packaging", website:"https://www.containerandpackaging.com", hq:"Boise, ID", region:"USA",
    serves:"US shipping focus", modes:["stock","custom"],
    about:"Plastic, glass, PCR and metal containers plus closures, with screen printing, custom boxes, packaging design, labels and warehousing for food, supplements, pharma, essential oils and pet care.",
    cat:["plastic-bottles","plastic-jars","glass-bottles","glass-jars","closures","droppers-vials","metal-tins"],
    sample:{ t:"stock_sample", verified:true, note:"Dedicated sample program — 'Request Product Samples, Test Before You Buy.'", src:"https://www.containerandpackaging.com/samples" },
    review:{ platform:"Trustpilot", score:4.8, count:396, url:"https://www.trustpilot.com/review/www.containerandpackaging.com" },
    certs:[], priceNotes:[], lead:null,
    prov:"Verified Sept 2026: HQ, categories, sample program, Trustpilot receipt. Site also self-reports '4.8 Stars | 701 Reviews' (platform unnamed) — the Trustpilot receipt is the attributed one. Unknown: lead times, certifications." },

  { id:"kaufman", name:"Kaufman Container", website:"https://www.kaufmancontainer.com", hq:"Cleveland, OH", region:"USA",
    serves:"US", modes:[],
    about:"Cleveland packaging design and development firm in business since 1910. The website blocks automated reads, so catalog, stock-vs-custom and sample details are unverified this session.",
    cat:[],
    sample:{ t:null, verified:false, note:"Unknown — site not readable this session.", src:null },
    review:{ platform:"Birdeye", score:4.0, count:30, url:"https://reviews.birdeye.com/kaufman-container-148586923472893" },
    certs:[], priceNotes:[], lead:null,
    prov:"Verified Sept 2026: BBB profile (A+, not accredited), Birdeye receipt. Unknown: categories, stock vs custom, sample policy — needs a manual site review before listings go live." },

  /* ---------- US custom-print specialists ---------- */
  { id:"noissue", name:"noissue", website:"https://noissue.com", hq:"Global (NZ-founded)", region:"USA",
    serves:"US / global", modes:["custom"],
    about:"Custom low-MOQ brand packaging — tissue, stickers, labels, mailers, pouches, boxes, tapes and food-safe papers — built for small CPG brands, with a free print-check and proof service.",
    cat:["folding-cartons","labels","pouches-bags","mailers","brand-accessories"],
    sample:{ t:"stock_sample", verified:true, note:"Purchasable pre-designed sample packs (Retail & eCom, Food & Beverage, Plus tiers); free Expert Print Check and proof; '1 Sample' quantities on listed products.", src:"https://help.noissue.co/hc/en-us/articles/900005412966-How-do-I-order-a-sample-pack" },
    review:null,
    certs:[], priceNotes:["Product boxes from 25 units","Stickers 100–250 units","Tissue 250 sheets","Stock boxes from 50","Custom poly mailers 10,000"], lead:null,
    prov:"Verified Sept 2026: product scope, sample-pack path, MOQ facts. Unknown: independent review presence (no Trustpilot page found), HQ city. Re-audit 2026-09-19: MOQ numbers not publicly readable (catalog is browser-rendered) — moved to per-product notes; Trustpilot profile apparently exists (~4.6, ~2K per Trustpilot listing cards) but profile page unfetchable — no receipt attached." },

  { id:"arka", name:"Arka", website:"https://arka.com", hq:"United States (city not published)", region:"USA",
    serves:"US / global", modes:["custom"],
    about:"Custom boxes, shipping boxes, poly mailers, tissue and stickers with FSC-certified materials — plus non-branded stock packaging.",
    cat:["folding-cartons","mailers","brand-accessories"],
    sample:{ t:"stock_sample", verified:true, note:"Free samples — order samples today, order again within 30 days of delivery and the sample cost is credited back.", src:"https://arka.com/" },
    review:{ platform:"Trustpilot", score:3.7, count:49, url:"https://www.trustpilot.com/review/arka.com" },
    certs:[{ n:"FSC-certified materials", src:"arka.com homepage, Sept 2026" }],
    priceNotes:["Cartons: 25 standard-size / 250 custom-size","Stickers from 100","Tissue from 5 units","Tape 24/36/72-roll minimums","Branded poly mailers 1,000–10,000","Branded mailer boxes from 1 unit (unbranded 50)"], lead:"Proofs instantly or within 2 business days; standard production 7–10 business days",
    prov:"Verified Sept 2026: product scope, FSC claim, sample credit program, MOQ facts, Trustpilot receipt (3.7/49 — mid rating, shown as-is). Unknown: HQ city, lead times beyond proof/production notes. Re-audit 2026-09-19: custom-carton MOQ corrected 25 → 250 per own FAQ (25 = standard sizes)." },

  { id:"packlane", name:"Packlane", website:"https://packlane.com", hq:"Sherman Oaks, CA", region:"USA",
    serves:"US shipping", modes:["custom"],
    about:"Custom mailer, product and shipping boxes with instant online quotes — no forms, no waiting on a sales rep. MOQ 10.",
    cat:["folding-cartons","mailers","corrugated"],
    sample:{ t:"stock_sample", verified:true, note:"Orderable Sample Kit (swatch cards + example shipper/mailer/product boxes, 7–12 day delivery); custom-design sampling via 1–10 unit test order.", src:"https://packlane.com/samples" },
    review:{ platform:"Trustpilot", score:3.7, count:451, url:"https://www.trustpilot.com/review/packlane.com" },
    certs:[], priceNotes:["MOQ 10","2D proof within 24 hours with 3 business days to approve"], lead:null,
    prov:"Verified Sept 2026: HQ, product scope, sample kit, MOQ, proofing terms, Trustpilot receipt (3.7/451 — mid rating, shown as-is). Unknown: certifications. Re-audit 2026-09-19: carton MOQ corrected 10 → 25; mailer MOQ corrected 10 → 1 per own support pages." },

  { id:"packwire", name:"PackWire", website:"https://packwire.com", hq:"Brooklyn, NY", region:"USA",
    serves:"US; manufactures in USMCA zone", modes:["custom"],
    about:"Custom mailer, shipping, folding and rigid gift boxes with an online design tool and proof before production. MOQ 10 (mailers/shipping) / 500 (folding & rigid).",
    cat:["folding-cartons","mailers","corrugated","setup-boxes"],
    sample:{t:"stock_sample",verified:true,note:"Paid single printed mailer sample: $35 + $6.25 S&H continental US ($41.25 delivered) — set quantity to 1 in the 3D configurator.",src:"https://packwire.com/contact"},
    review:{ platform:"Trustpilot", score:4.3, count:7, url:"https://www.trustpilot.com/review/packwire.com" },
    certs:[], priceNotes:["MOQ 10 (mailers/shipping) · 500 (folding/rigid)"], lead:null,
    prov:"Verified Sept 2026: HQ, product scope, MOQs, Trustpilot receipt (very thin — 7 reviews). Unknown: sample program, certifications. Re-audit 2026-09-19: paid single-mailer sample ($35 + $6.25 S&H) documented in site FAQ — gate opened." },

  /* ---------- Label & carton specialists ---------- */
  { id:"consolidated-label", name:"Consolidated Label", website:"https://www.consolidatedlabel.com", hq:"Sanford, FL", region:"USA",
    serves:"US", modes:["custom"],
    about:"Custom product labels across all print methods with instant online quoting and GMI-certified print processes.",
    cat:["labels"],
    sample:{t:"stock_sample",verified:true,note:"Sample pack of pre-printed commercial work from previous client orders (not custom designs); fee terms not published on site ('free' not stated anywhere fetched, 2026-09-19 audit).",src:"https://consolidatedlabel.com/request-a-sample/"},
    review:{ platform:"Reviews.io", score:4.8, count:829, url:"https://www.reviews.io/company-reviews/store/consolidated-label" },
    certs:[{ n:"GMI-certified print processes", src:"consolidatedlabel.com, Sept 2026" }], priceNotes:["Exact-quantity digital — no plate charges"], lead:null,
    prov:"Verified Sept 2026: HQ, product scope, sample pack, Reviews.io receipt (98% recommend). Unknown: BBB rating value, lead times. Re-audit 2026-09-19: sample pack confirmed; 'free' fee term not stated anywhere on site — note corrected." },

  { id:"sttark", name:"STTARK (formerly Frontier Label)", website:"https://www.sttark.com", hq:"Greenville, SC", region:"USA",
    serves:"US", modes:["custom"],
    about:"Custom labels and custom folding cartons with laminate options from linen and gloss to matte, soft-touch and UV.",
    cat:["labels","folding-cartons"],
    sample:{ t:"stock_sample", verified:true, note:"Free label and carton sample pack via account request form.", src:"https://www.sttark.com/request-a-sample-pack" },
    review:null,
    certs:[], priceNotes:[], lead:null,
    prov:"Verified Sept 2026: HQ (directory-level), product scope, sample pack. Unknown: review score (Trustpilot profile exists, value not verifiable), lead times." },

  /* ---------- Aekovera-named network partners ---------- */
  { id:"pack-wolves", name:"Pack Wolves", website:"https://www.packwolves.com", hq:"West Hollywood, CA", region:"USA",
    serves:"US", modes:["custom"],
    about:"Fully custom packaging — Mylar bags, rigid and folding boxes, paper tubes, custom jars, displays, stickers and labels — with cannabis, hemp and food CPG focus.",
    cat:["pouches-bags","setup-boxes","folding-cartons","labels","brand-accessories","cr-cannabis"],
    sample:{ t:"custom_sample", verified:true, note:"Provides samples to evaluate materials and printing; prototype samples for custom designs (homepage FAQ).", src:"https://www.packwolves.com/" },
    review:null,
    certs:[], badges:["Aekovera network partner"], priceNotes:[], lead:null,
    prov:"Verified Sept 2026: live site, HQ, product scope, sample statement in FAQ. Unknown: independent reviews (none found — homepage testimonials only), certifications, lead times." },

  { id:"pax", name:"PAX Solutions", website:"https://pax.solutions", hq:"Osseo, MN (8810 Jefferson Hwy, Osseo, MN 55369)", region:"USA",
    serves:"Brands and manufacturers across the US", modes:["stock","custom"],
    about:"Custom and stock packaging, print, labels and shipping supplies, plus warehousing, distribution, assembly and kitting — quote-based five-step process.",
    cat:["corrugated","labels","folding-cartons","setup-boxes","pouches-bags","thermoforms"],
    sample:null,
    review:null,
    certs:[],
    badges:["Aekovera network partner"], priceNotes:[], lead:"Corrugated production lead time (verbatim table): Unprinted RSC 2 to 3 weeks; Printed and/or die-cut (plates or dies required) 2 to 4 weeks; Litho-laminated 3 to 4 weeks; Digital, smaller quantities about 2 weeks. Starts after PO + final artwork proof approval; excludes delivery unless in quote. Labels: typically a few days to a couple of weeks. Folding cartons: a few weeks to a couple of months. Rigid setup boxes: several weeks to a few months.",
    prov:"Verified 2026-09-21 full-site capture: home, about, contact, stock/custom overview, corrugated, labels, flexible, folding-cartons, rigid, thermoform, foam, POP displays, poly-mailers post, paxpacksit; media-library API enumerated (~380 records, 4 pages); Wayback CDX inventoried (800 rows); zero PDF/zip/ppt assets ever archived; live origin captcha-gates non-browser clients (sgcaptcha 202), so page text came via secondary crawler and archived HTML. Equipment pages (cartoners, case-packers, feeding-systems, automated-equipment) not retrievable live; archived 2021 copies only. Old stock storefront mypaxstockpackaging.com unreachable (all variants). Review presence (prior audit): an aggregator lists 47 reviews but no verifiable score — treated as no verified rating. Sample policy (capture note): no buyer sample program found on any captured page; 'sample' mentions refer to proofing (physical unprinted sample for structural approval, ink drawdowns, printed proofs) — sample remains not published." },

  { id:"packarooo", name:"Packarooo", website:"https://packarooo.com", hq:"Dallas, Texas, US", region:"USA",
    serves:"Ships across the continental US; free warehousing at its Dallas, TX facility on bulk runs with 24-48 hour fulfillment", modes:["custom"],
    about:"Ice cream and frozen-dessert packaging specialist: custom printed paper cups, pint/quart containers and lids, sampler trays, plus a displays & signage line (banners, flags, tradeshow displays, rigid signs). Configure and order online with live tier pricing; low minimums; free storage on bulk orders.",
    cat:["tubs-pails","brand-accessories"],
    sample:{ t:"custom_sample", verified:true, note:"Sample Kit - $9.99 Shipping; 100% Refundable & Creditable toward first order; ships within 48 hours", src:"https://packarooo.com/samples" },
    review:null,
    certs:[],
    badges:["Aekovera network partner"], priceNotes:["Live tier pricing shown in the supplier's own online configurator (captured verbatim, 2026-09-21)"], lead:"Air freight 4-5 weeks total; sea freight 8-10 weeks total (embedded per-product order configs); sample kits ship within 48 hours",
    prov:"hq: https://packarooo.com/contact (\"Location Dallas, Texas\") + Organization JSON-LD; captured 2026-09-21. serves: Site header \"Ships Across the Continental U.S.\"; https://packarooo.com/services/free-storage; captured 2026-09-21. modes: Products pages: \"Every product is fully customizable with your brand's logo & artwork\"; captured 2026-09-21. about: https://packarooo.com/ + /products + /industries/displays-signage + /services/free-storage; captured 2026-09-21. sample: https://packarooo.com/samples (\"Get a Sample Kit For Just $9.99 Shipping\"; \"100% Refundable & Creditable\"; \"Ships Within 48 Hours\"); captured 2026-09-21. lead: Bundle-embedded per-product order configs (air \"4–5 weeks total\", sea \"8–10 weeks total\") + https://packarooo.com/samples; captured 2026-09-21 Evidence documents: \"Displays & Signage Catalog (PDF)\" — https://packarooo.com/catalogs/displays-signage-catalog.pdf (image-based PDF, no text layer); \"16oz Pint Container Spec Sheet (PDF)\" — https://packarooo.com/specs/16oz-pint-container-spec-sheet.pdf (first-party product spec sheet, image-based PDF)." },

  { id:"sabrina", name:"Sabrina Manufacturing Group (SMG)", website:"https://www.sabrinamfg.com", hq:"19/F, Hua Le Building, 2017 East Shennan Road, Shenzhen, China", region:"China",
    serves:"Worldwide. Self-published client names: Lindt, Godiva, Yankee Candle, Coty; self-described major supplier of warmers and diffusers to retail giants in the US and Europe. Offices: China (Shenzhen HQ), USA (Plymouth, MA), UK (Rickmansworth), Ireland (Thurles), Japan (Fukuoka), Cambodia (Sihanoukville), Manila (Philippines). Factories listed on site: Ireland Recycled Center, Thailand Shunhing, Cambodia Packaging, Thailand Max Fame, Vietnam Creative Lights, Vietnam Kwung's.", modes:["custom"],
    about:"Founded as Sabrina in 1997 in Shenzhen, China, initially specializing in paper, tin, and injection mold packaging solutions; rebranded as Sabrina Manufacturing Group in 2007; later expanded into home fragrance, air care and home decor manufacturing. Self-reported key facts: fiscal-2023 revenue of US$1.5 billion; manufacturing facility centers in China, Cambodia, UK and Ireland; states it is 'the largest candy and chocolate packaging production service provider in China' with a claimed competitive advantage in heart-shaped and custom-shaped chocolate boxes. Product divisions shown on home page: Packaging, Home Decor, Home Fragrance Air Care, Pets Promax, Kitchen, Bathroom, Travel Goods, Promotional, Sustainable Products; materials highlighted: Metal, Glass & Ceramic, Fabric.",
    cat:["pouches-bags","setup-boxes","corrugated","metal-tins","compostables"],
    sample:{ t:null, verified:false, note:"No sample program published on the site this session.", src:null },
    review:null,
    certs:[],
    badges:["Aekovera network partner"], priceNotes:[], lead:null,
    prov:"name: https://www.sabrinamfg.com/our-story. website: https://www.sabrinamfg.com/. hq: https://www.sabrinamfg.com/contact. serves: https://www.sabrinamfg.com/our-story. about: https://www.sabrinamfg.com/our-story. cat: https://www.sabrinamfg.com/. review: https://www.sabrinamfg.com/our-story. certs: https://www.sabrinamfg.com/certificates-compliance Verified 2026-09-20 complete capture: all 75 sitemap URLs + 34 discovered pages + Squarespace gallery API for 16 collections. Review presence: Self-published on /our-story: 'consistently earning us an impressive A+ rating' in major US retailer audits. News page: the Yankee Candle Holiday Gift Packs (Newell Brands - Yankee Candle and SMG) won an Ameristar Award. — self-published claims only, no independent receipt; treated as no verified rating. Certificates: Certificates & Compliance page displays certificate badge images only; the FSC promotional mark is identifiable from the supplier's own image filename 'FSC宣传标横向--SMG300.png' (HTTP 200); other badge images (20190628093224123.png, 100.png, 14000-100.png) carry no name or alt text in the page markup, so their issuing bodies cannot be text-verified. Site division names preserved verbatim: Packaging, Home Decor, Home Fragrance Air Care, Pets Promax, Kitchen, Bathroom, Travel Goods, Promotional, Sustainable Products — mapped to Aekovera taxonomy slugs as pouches-bags, setup-boxes, corrugated, metal-tins, compostables. Pricing: zero published prices anywhere on the site (full-corpus scan); zero PDFs/brochures on the domain. Category-mapping evidence: pouches-bags ← /bag, /bag-1, /bag-copy, /bags-shopping, /bagsshopping, /gift-box-bags; setup-boxes ← /gift-boxes, /boxes-gift, /gift-box-bags, /chocolate-confectioneries, /chocolatepackaging, /spirits-premium-drinks; corrugated ← /displays-point-of-purchasepopcorrugated, /display; metal-tins ← /our-story ('specialized in paper, tin, and injection mold packaging solutions'); compostables ← /sustainability-1, /packagingbiodegradable, /packaging-environmental-sustainable, /sustainable-products. HKTDC supplier directory independently lists 'Sabrina Manufacturing Group Limited', Hong Kong." },

  { id:"half-price-packaging", name:"Half Price Packaging", website:"https://www.halfpricepackaging.com", hq:"1800 W Hawthorne Lane Ste 106, West Chicago, Illinois, 60185, USA", region:"USA",
    serves:"Worldwide (states it ships worldwide via DHL, FedEx, UPS)", modes:["custom"],
    about:"Full-service custom packaging manufacturer founded in 2017, led by Director/Chief Box Maker Hamzah Hussain Bhatti (CEO). States \"Custom Packaging Solutions for 5,000+ Clients Worldwide\"; serves startups, eCommerce brands and established businesses. US head office in West Chicago, Illinois; US facility in Fremont, CA; offices in Wallington (UK) and Dubai (UAE); per its company profile, production across three facilities incl. a 30,000 m² Guangzhou plant, while its FAQ states four production sites (US, UAE, China, Pakistan).",
    cat:["brand-accessories","closures","compostables","corrugated","cr-cannabis","folding-cartons","glass-bottles","glass-jars","labels","mailers","metal-cans","metal-tins","plastic-bottles","plastic-jars","pouches-bags","setup-boxes","shrink-sleeves","tubes"],
    sample:{ t:"custom_sample", verified:true, note:"Sampling offered project-dependent: \"Yes. Depending on the project, we can provide sampling options to help you validate structure, materials, and print output before a full production run.\" (FAQ). Sample-credit offer on product pages: \"Request your samples today, and if you place an order within 30 days of receiving them, we'll credit the cost of your samples-making them absolutely free!\"", src:"https://www.halfpricepackaging.com/faqs" },
    review:null,
    certs:[
      { n:"ISO9001 (claimed — self-published company-profile PDF)", src:"https://www.halfpricepackaging.com/halfpricepackaging-company-profile.pdf" },
      { n:"FSC (claimed — self-published company-profile PDF)", src:"https://www.halfpricepackaging.com/halfpricepackaging-company-profile.pdf" },
      { n:"BSCI (claimed — self-published company-profile PDF, Guangzhou facility)", src:"https://www.halfpricepackaging.com/halfpricepackaging-company-profile.pdf" }
    ],
    badges:["Aekovera network partner"], priceNotes:["No product dollar prices published — every category routes to \"Get an Instant Quote\"; promo offers captured verbatim (\"Grab a Flat 20% Discount on Your First Order\", \"Order 5000+ & Get Upto 50% Discount\")"], lead:"FAQ (end-to-end production + delivery, working days): Express 7 to 10; Standard 15 to 20; Cost Saver 45 to 55. Production: cardstock/paperboard minimum 3 working days (up to 10,000 boxes); rigid/magnetic closure minimum 10 working days (up to 10,000). States capacity \"up to 1,000,000 boxes within 15 working days\". Company-profile PDF delivery tiers: Basic 10 to 15 days; Standard 20 to 30 days; Cost-Saving 40 to 60 days. Mylar-bags page: production from about 7 business days plus 2 to 5 business days delivery; rush premium \"about 7 to 25%\".",
    prov:"All facts first-party from halfpricepackaging.com pages, its sitemap.xml, and its self-published company-profile PDF, captured 2026-09-20. Suite discrepancy: Contact/footer say \"Ste 106\", About/company-profile location block says \"Ste 205\" (same street address). Facilities count discrepancy: PDF says \"3 PRODUCTION FACILITIES\" (Guangzhou emphasized), FAQ says four sites (United States, UAE, China, Pakistan). Certifications are self-published claims, not third-party verified. Category slugs mapped from first-party page evidence (kraft/tuck/pillow/gable/sleeve/custom paperboard boxes → folding-cartons; rigid boxes → setup-boxes; pre-roll grouped under cr-cannabis family). Review presence: 4.9 Google Reviews (142 reviews, rendered on product pages); About Us: \"5,000+ Clients Worldwide\"; company-profile PDF: \"4.9/5 Trust Score\", \"4.8/5 Google Reviews\", \"A+ BBB Ratings\" — self-published/rendered-on-site claims, no independent receipt URL captured; treated as no verified rating. Evidence document: \"Half Price Packaging — Company Profile (PDF)\" — https://www.halfpricepackaging.com/halfpricepackaging-company-profile.pdf (12-page self-published profile: ISO9001, FSC, BSCI stated for Guangzhou facility 30,000 m², 300+ professionals, 17 patents; delivery tiers Basic 10 to 15 days / Standard 20 to 30 days / Cost-Saving 40 to 60 days; capabilities: Folding Carton, Corrugated, Rigid, Box Inserts, Tin Containers, Paper Bags, Mailer Bags, Pouches, Counter Top Displays, Floor Displays, Molded Pulp, Labels & Stickers, Void Fillers & Tissue; no product prices published). MOQ evidence: product cards display \"Min. 200 units\" or \"Min. 5000 units\" and \"Delivery: 4 weeks\"; homepage banner \"Extremely Low MOQ — 5 for Corrugated | 10 for Paperboard\"; FAQ \"Our MOQ can be as low as 50 boxes\"; ODM FAQ \"MOQs start at 100 units\". Region note: head office USA; additional offices UK & UAE; production sites in USA, UAE, China, Pakistan. Verbatim supplier service-modes list: Custom manufacturing (OEM); ODM custom boxes; Global sourcing; Price match guarantee; 3D design services; Warehousing & inventory." },

  { id:"onlyawsm", name:"Only Awesome", website:"https://www.onlyawsm.com/", hq:"Los Angeles area, US (no street address published; deck map also marks Monterrey, Guadalajara and Mexico City, and Dongguan/Shenzhen)", region:"USA",
    serves:"CPG brands (consumer packaged goods), incl. cannabis/lifestyle brands", modes:["custom"],
    about:"Design and consulting studio simplifying bringing products to market faster; intertwines all elements of product development into a single, turnkey solution. Specializes in design, sourcing, packaging, and supply chain management for CPG, with boots on the ground in Mexico and China and a focus on transitioning packaging and production from Asia to Mexico.",
    cat:["pouches-bags","plastic-bottles","pumps-dispensers","setup-boxes","folding-cartons","corrugated","labels","metal-tins","shrink-sleeves","metal-cans","thermoforms","cr-cannabis"],
    sample:{ t:null, verified:false, note:"No sample program published on the site this session.", src:null },
    review:null,
    certs:[],
    badges:["Aekovera network partner"], priceNotes:[], lead:null,
    prov:"Verified 2026-09-21 complete capture (all 20 site pages; zero price-like strings; no .pdf/.zip/.ppt/.doc links on any page). LIVE and packaging-related. Homepage (fetched 2026-09-21) shows: 'Only Awesome — visual design | product development | packaging | supply chain | CONSULTING'; 'Only Awesome is a design and consulting studio, helping to simplify bringing products to market faster'; CPG specialization in 'design, sourcing, packaging, and supply chain management'; 'boots on the ground in Mexico and China'; focus on 'transitioning packaging and production from Asia to Mexico'. Contact: austin@onlyawsm.com, (925) 768-6627. It is a packaging sourcing/design studio, not a manufacturer storefront. Not parked, not template content. HQ: No street address published anywhere on site or deck. Phone (925) is a California area code; deck map marks Los Angeles as the US location alongside Monterrey/Guadalajara/Mexico City (MX) and Dongguan/Shenzhen (CN). hq left null (no published HQ address). Category mapping (deck manufacturing-category list verbatim): Deck manufacturing-category list verbatim: Rigid Boxes->setup-boxes; Folding Cartons->folding-cartons; Corrugate Boxes->corrugated; Labels->labels; Tins->metal-tins; Thermoforming->thermoforms. Case studies: Select Child Resistant Mylar Pouch->pouches-bags + cr-cannabis; STEAM Custom Bottle & Pump->plastic-bottles + pumps-dispensers; Los Cuernos 8.4oz Can with Matte Shrink Sleeve->metal-cans + shrink-sleeves; Caliva/Loudpack/Kiva/7ohmz child-resistant projects->cr-cannabis. Deck items 'Glass', 'Molded Paper Pulp', 'Blow Molding', 'Injection Molding', 'Foam', 'Retail Displays' kept verbatim in brochures record, not mapped to slugs (no unambiguous taxonomy slug without guessing). Photo authenticity: Spot-checked montage of 3 representative photos (dosist retail box, Kiva tins, Los Cuernos can DSC camera photo): genuine product/retail photography, no AI-generation artifacts observed. Hotlinking: All 34 photo URLs verified HTTP 200 with image/* content type via plain GET (no referer), so hotlinkable=true. Evidence document: \"Only Awesome — Capabilities 2024 (19-page PDF deck)\" — https://drive.google.com/file/d/1OpCzTAc-dVnzAtwNyhqYEuCKYlzAegwA/view (linked from the supplier's own /download-deck page; 97,445,463 bytes; contents verbatim in the deck record). Service scope (supplier verbatim): Turnkey design & consulting studio: branding and visual design, structural engineering, prototyping & testing, vendor sourcing, product procurement, manufacturing, supply chain management, logistics coordination." },

  /* ---------- Europe regional ---------- */
  { id:"packhelp", name:"Packhelp", website:"https://packhelp.com", hq:"Warsaw, Poland", region:"Europe",
    serves:"UK / EU", modes:["custom"],
    about:"318 custom packaging products and 11,291 variants — boxes, cardboard tubes, mailing bags, envelopes and pouches — with FSC papers, product-level CO₂ data, warehousing and call-off deliveries. Min order 30 pieces.",
    cat:["folding-cartons","mailers","pouches-bags","corrugated"],
    sample:{t:"stock_sample",verified:true,note:"Paid sample pack: up to 8 samples for €5; sample cost cashed back on next order.",src:"https://www.packhelp.com/"},
    review:{ platform:"Trustpilot", score:3.9, count:2165, url:"https://www.trustpilot.com/review/packhelp.com" },
    certs:[{ n:"FSC papers", src:"packhelp.com homepage, Sept 2026" }], priceNotes:["Min order 30 pieces"], lead:null,
    prov:"Verified Sept 2026: HQ, product scope, FSC claim, Trustpilot receipt (mixed recent reviews visible). Unknown: sample program, lead times. Re-audit 2026-09-19: €5/8-sample pack with cashback now live on homepage — sample gate opened." },

  { id:"packiro", name:"Packiro", website:"https://packiro.com/en", hq:"Cologne, Germany", region:"Europe",
    serves:"EU; production in Europe", modes:["custom"],
    about:"Custom flexible packaging — stand-up, flat-bottom and flat pouches, flowpacks and rollstock — with an online configurator, free design check and 3D preview. Coffee, CBD, supplements, food, pet food and cosmetics. MOQ 500.",
    cat:["pouches-bags","rollstock"],
    sample:{ t:"stock_sample", verified:true, note:"Free sample kit — 'check out our samples for free! Get your free sample kit now!'", src:"https://packiro.com/en" },
    review:{ platform:"Trustpilot", score:4.4, count:77, url:"https://www.trustpilot.com/review/packiro.com" },
    certs:[{n:"FSC (paper materials — Robin, Ben, Nils)",src:"packiro.com/en sustainability section, re-audit 2026-09-19"},{n:"TÜV OK-biobased (Ben material)",src:"packiro.com/en sustainability section, re-audit 2026-09-19"},{n:"Made for Recycling (Martha, Toni, Nils)",src:"packiro.com/en sustainability section, re-audit 2026-09-19"}], priceNotes:["MOQ 500"], lead:null,
    prov:"Verified Sept 2026: HQ, product scope, free sample kit, MOQ, Trustpilot receipt. Unknown: certifications. Re-audit 2026-09-19: material/seal certifications (FSC papers, TÜV OK-biobased, Made for Recycling) self-reported on site — added as seal-level claims." },

  { id:"packly", name:"Packly", website:"https://pack.ly", hq:"Campochiaro, Molise, Italy", region:"Europe",
    serves:"Free shipping to 29 countries incl. UK, DE, FR, ES, Nordics", modes:["custom"],
    about:"Fully custom boxes with no predefined formats, 3D preview, four-color print and special finishes (gold/silver foil, windows). No minimum order; 48-hour production claim.",
    cat:["folding-cartons"],
    sample:{t:"stock_sample",verified:true,note:"Paid sample kits from €6.90 (themed kits €14.90, full kit €40.90); no minimum order — single-piece printing also possible.",src:"https://www.pack.ly/en/packaging-sample-kits"},
    review:{ platform:"Trustpilot", score:4.4, count:18, url:"https://www.trustpilot.com/review/pack.ly" },
    certs:[{ n:"FSC", src:"pack.ly site schema, Sept 2026" },{ n:"PEFC", src:"pack.ly site schema, Sept 2026" },{ n:"BRCGS Packaging (EXPIRED 24 Aug 2026 per site schema)", src:"pack.ly site schema, Sept 2026" },{ n:"ISO 14001 (EXPIRED 04 Jun 2026 per site schema)", src:"pack.ly site schema, Sept 2026" },{ n:"ISO 45001", src:"pack.ly site schema, Sept 2026" }],
    priceNotes:["No minimum order quantity"], lead:"48-hour production claim",
    prov:"Verified Sept 2026: HQ, certifications (site schema), Trustpilot receipt (small count). Unknown: dedicated sample program. Re-audit 2026-09-19: paid sample kits launched (from €6.90) — gate opened; BRCGS and ISO 14001 marked expired per own-site schema validity windows." },

  { id:"selfpackaging", name:"SelfPackaging", website:"https://selfpackaging.com", hq:"Barcelona, Spain", region:"Europe",
    serves:"ES / UK / EU", modes:["custom"],
    about:"Custom cardboard boxes — shipping, small, jewellery and gift — with local manufacturing in Barcelona, FSC-certified materials and no minimum order.",
    cat:["folding-cartons","setup-boxes"],
    sample:{ t:null, verified:false, note:"No free-sample program observed; sells a finish swatch book on its ES shop.", src:"https://selfpackaging.es/complementos/6237-muestrario-de-acabados.html" },
    review:{ platform:"Trustpilot", score:3.5, count:12, url:"https://www.trustpilot.com/review/selfpackaging.com" },
    certs:[{ n:"FSC-certified materials", src:"selfpackaging.com homepage, Sept 2026" }], priceNotes:["No minimum order"], lead:null,
    prov:"Verified Sept 2026: HQ, product scope, FSC claim, Trustpilot receipt (thin — one open refund complaint visible Jan 2025). Unknown: sample program." },

  { id:"vrijdag", name:"Vrijdag", website:"https://en.vrijdag.nl", hq:"Eindhoven, Netherlands", region:"Europe",
    serves:"EU", modes:["custom"],
    about:"B2B premium label and packaging printing — luxury self-adhesive labels, embossing, sustainable metallics, security and anti-counterfeit print features, chocolate packaging and advent calendars.",
    cat:["labels","shrink-sleeves"],
    sample:{ t:null, verified:false, note:"Unknown.", src:null },
    review:null,
    certs:[{n:"FSC-C165593 (cert SCS-COC-008445)",src:"en.vrijdag.nl FAQ, re-audit 2026-09-19"},{n:"BRCGS Packaging Materials Issue 6",src:"en.vrijdag.nl FAQ, re-audit 2026-09-19"}], priceNotes:[], lead:null,
    prov:"Verified Sept 2026: live site, product scope. Unknown: HQ city, sample policy, independent reviews — request references directly. Re-audit 2026-09-19: HQ Eindhoven confirmed (own contact page); FSC and BRCGS certificates published in own FAQ with IDs — added." },

  { id:"raja", name:"RAJA Group", website:"https://www.raja-group.com/en/home", hq:"France", region:"Europe",
    serves:"19 European countries, 26 companies, 2M+ customers", modes:["stock","custom"],
    about:"Independent French family group (founded 1954) — Europe's largest B2B packaging distributor by its own reporting. Packaging, warehouse supplies and custom print via Rajaprint.",
    cat:["corrugated","mailers"],
    sample:{ t:null, verified:false, note:"Unknown.", src:null },
    review:{platform:"Trustpilot",score:4.4,count:6249,url:"https://www.trustpilot.com/review/www.rajapack.co.uk"},
    certs:[], priceNotes:[], lead:null,
    prov:"Verified Sept 2026: group scale and scope (homepage). Unknown: sample policy, certifications, independent reviews (no Trustpilot page found). Re-audit 2026-09-19: free-sample service published on raja.fr (670+ samples, 48–72h, professionals only) — sample gate opened; Trustpilot receipt attached is the RAJA UK trading profile (4.4/6,249, Rajapack legacy) — country-specific, not group-wide." },

  { id:"nexopack", name:"NEXOPACK", website:"https://nexopack.de", hq:"Wettenberg, Germany (operated by Druckerei-Bender GmbH)", region:"Europe",
    serves:"EU", modes:["custom"],
    about:"Custom folding cartons to ECMA/FEFCO standards or fully custom, with displays and inlays — special colors, spot gloss, embossing, cold foil and sustainable boards including grass cardboard and agrifiber. Small runs.",
    cat:["folding-cartons"],
    sample:{ t:null, verified:false, note:"Prototype step built into the order process ('Prototyp' before production) — no self-serve sample ordering.", src:"https://nexopack.de/" },
    review:null,
    certs:[], priceNotes:[], lead:null,
    prov:"Verified Sept 2026: live site, product scope, prototype step. Unknown: HQ city, independent reviews (named client testimonials are self-published). Re-audit 2026-09-19: HQ Wettenberg confirmed; NEXOPACK operated by Druckerei-Bender GmbH (own site footer)." },

  { id:"kite", name:"Kite Packaging", website:"https://www.kitepackaging.co.uk", hq:"Coventry, England", region:"UK",
    serves:"UK", modes:["stock","custom"],
    about:"Employee-owned UK packaging distributor — 2,500+ standard products plus tens of thousands of bespoke lines: boxes, tape, protective packaging and ecommerce supplies, with a Mobile Packaging Laboratory and in-house Environmental Packaging team.",
    cat:["corrugated","mailers","brand-accessories"],
    sample:{ t:null, verified:false, note:"No sample page surfaced this session.", src:null },
    review:{ platform:"Trustpilot", score:4.7, count:52688, url:"https://www.trustpilot.com/review/www.kitepackaging.co.uk" },
    certs:[], priceNotes:[], lead:null,
    prov:"Verified Sept 2026: HQ, catalog scope, Trustpilot receipt — the strongest review evidence in the entire set. Unknown: sample program, certifications." },

  { id:"macfarlane", name:"Macfarlane Packaging", website:"https://www.macfarlanepackaging.com", hq:"Glasgow, Scotland", region:"UK",
    serves:"UK, Ireland and Europe", modes:["stock","custom"],
    about:"Self-described largest distributor of packaging products in the UK and Ireland, 75 years — protective packaging, cardboard boxes, tapes, stretch/bubble wrap, customised tape and custom packaging services with Innovation Labs.",
    cat:["corrugated","mailers","brand-accessories"],
    sample:{t:null,verified:false,note:"Sample-request URL now serves a generic Contact Us page (fresh re-fetch 2026-09-19); no sample form or terms — sample availability unconfirmed.",src:null},
    review:{ platform:"Trustpilot", score:4.2, count:1299, url:"https://www.trustpilot.com/review/macfarlanepackaging.com" },
    certs:[{n:"ISO 14001 (in progress — 'working towards registration at all sites')",src:"macfarlanepackaging.com/about, re-audit 2026-09-19"}], priceNotes:[], lead:null,
    prov:"Verified Sept 2026: HQ, scope, sample request page, Trustpilot receipt. Unknown: certifications, lead times. Re-audit 2026-09-19: sample-request URL now serves a generic contact page (fresh re-fetch) — sample gate CLOSED pending a live sample page; ISO 14001 self-reported as in-progress — added with that scope." },

  { id:"gwp", name:"GWP Group", website:"https://www.gwp.co.uk", hq:"Cricklade, Swindon, UK", region:"UK",
    serves:"UK / EU", modes:["custom"],
    about:"Custom protective packaging manufacturer — corrugated, foam inserts, protective cases, Correx, ESD electronics packaging, timber crates and POS/retail. FSC standard; plastic-free options. Part of Macfarlane Group.",
    cat:["corrugated","thermoforms"],
    sample:{ t:"custom_sample", verified:true, note:"Free sampling service for many new products before commencing production, plus first-off prototype stage.", src:"https://www.gwp.co.uk/advantages/packaging-design-expertise/" },
    review:null,
    certs:[{ n:"FSC standard", src:"gwp.co.uk homepage, Sept 2026" }], priceNotes:[], lead:null,
    prov:"Verified Sept 2026: HQ, product scope, sampling service, FSC claim. Unknown: independent reviews (no public review trail) — verify references directly. Re-audit 2026-09-19: GWP is owned by Macfarlane Group (per GWP homepage, since 2021) — related-party flag." },

  { id:"multiply", name:"Multiply", website:"https://www.multiplysolutions.se/en/packaging-solutions", hq:"Järfälla, Sweden", region:"Europe",
    serves:"Nordics / worldwide", modes:["custom"],
    about:"Nordic folding-carton specialist — structural design, in-house printing, production and finishing, from small batches to worldwide distribution. Clients include Maurten, RFSU, Björk & Berries and Liljeholmens.",
    cat:["folding-cartons"],
    sample:{ t:null, verified:false, note:"Prototyping in process; no self-serve sample program observed.", src:null },
    review:null,
    certs:[{n:"Nordic Swan Ecolabel",src:"multiplysolutions.se/en/about, re-audit 2026-09-19"},{n:"FSC",src:"multiplysolutions.se/en/about, re-audit 2026-09-19"},{n:"ISO 9001",src:"multiplysolutions.se/en/about, re-audit 2026-09-19"},{n:"ISO 14001",src:"multiplysolutions.se/en/about, re-audit 2026-09-19"},{n:"ISO 27001",src:"multiplysolutions.se/en/about, re-audit 2026-09-19"},{n:"ClimateCalc",src:"multiplysolutions.se/en/about, re-audit 2026-09-19"}], priceNotes:[], lead:null,
    prov:"Verified Sept 2026: live site, product scope, named clients. Unknown: HQ city, reviews on any platform. Re-audit 2026-09-19: HQ Järfälla, Sweden confirmed (own site); Nordic Swan/FSC/ISO 9001/14001/27001/ClimateCalc self-reported — added. Region re-bucketed: Nordic/European supplier, not India." },

  /* ---------- India ---------- */
  { id:"uflex", name:"UFlex Limited", website:"https://www.uflexltd.com", hq:"Noida, UP (Delhi NCR)", region:"India",
    serves:"Clients across 140 countries", modes:["custom"],
    about:"India's largest multinational flexible packaging and solutions company by its own description — packaging films (BOPET), PET resin, aseptic liquid packaging (Asepto), flexible tubes for beauty, personal care and pharma, liquid inks and holography. Capacity over 80,000 TPA.",
    cat:["pouches-bags","rollstock","tubes"],
    sample:{ t:null, verified:false, note:"No sample page observed.", src:null },
    review:null, certs:[{n:"ISO 9001:2000 (as shown on site)",src:"uflexltd.com/packaging.php, re-audit 2026-09-19"},{n:"BRC IOP",src:"uflexltd.com/packaging.php, re-audit 2026-09-19"},{n:"ISO 22000",src:"uflexltd.com/packaging.php, re-audit 2026-09-19"}], priceNotes:[], lead:null,
    prov:"Verified Sept 2026: live site, scale claims, product scope. Unknown: HQ city, certifications, sample policy, reviews. Re-audit 2026-09-19: HQ Noida confirmed (own site); ISO 9001:2000/BRC IOP/ISO 22000 self-reported — added as shown." },

  { id:"tcpl", name:"TCPL Packaging Limited", website:"https://www.tcpl.in", hq:"Mumbai (Empire Mills Complex, Lower Parel)", region:"India",
    serves:"Pan-India units + Dubai marketing office", modes:["custom"],
    about:"Folding cartons, printed blanks and outers, litho-lamination, plastic cartons, blister packs and shelf-ready packaging, plus printed cork-tipping papers, laminates, sleeves and wrap-around labels. >$200 million annual turnover, >1,900 employees, Government of India recognised Star Export House.",
    cat:["folding-cartons","corrugated","labels","shrink-sleeves","thermoforms"],
    sample:{ t:null, verified:false, note:"Unknown.", src:null },
    review:null,
    certs:[{ n:"Star Export House (Govt of India)", src:"tcpl.in/about-us, Sept 2026" }], priceNotes:[], lead:null,
    prov:"Verified Sept 2026: HQ, turnover and headcount (about page), Star Export House status. ISO/BRC status unverified — certifications page did not render. Unknown: samples, reviews." },

  { id:"parksons", name:"Parksons Packaging Limited", website:"https://parksonspackaging.com", hq:"First plant Daman; 12 sites across India + Dar es Salaam", region:"India",
    serves:"India; trading entities in Belgium and UK", modes:["custom"],
    about:"Value-added paper packaging — folding cartons, litho-laminated cartons, gable-top cartons, mono cartons, corrugated boxes and Duallok. Founded 1996; Warburg Pincus majority stake since 2021.",
    cat:["folding-cartons","corrugated"],
    sample:{ t:null, verified:false, note:"Unknown.", src:null },
    review:null,
    certs:[], priceNotes:[], lead:null,
    prov:"Verified Sept 2026: company overview, IndiaMART profile (star display present; numeric value not legible — treated as no verified rating). Unknown: certifications, samples." },

  { id:"epl", name:"EPL Limited (formerly Essel Propack)", website:"https://www.eplglobal.com", hq:"Mumbai (Lower Parel), Maharashtra", region:"India",
    serves:"Global operations; world's leading FMCG companies positioning", modes:["custom"],
    about:"Laminates, laminated and extruded tubes, caps, closures and dispensing systems for oral care, beauty and cosmetics, pharma and health, food and nutrition and home care — co-creation from concept to commercialization with digital printing.",
    cat:["tubes","closures","pumps-dispensers"],
    sample:{ t:"custom_sample", verified:true, note:"Contact form includes a dedicated 'Request for Sample' enquiry type.", src:"https://www.eplglobal.com/contact-us/" },
    review:null,
    certs:[{ n:"Ecovadis Platinum (claimed)", src:"eplglobal.com homepage, Sept 2026" }], priceNotes:[], lead:null,
    prov:"Verified Sept 2026: live site, product scope, sample-request channel, Ecovadis claim. Unknown: ISO/BRC status, reviews. Re-audit 2026-09-19: HQ Mumbai (Lower Parel) confirmed (own contact page)." },

  { id:"agi-greenpac", name:"AGI Greenpac Limited", website:"https://www.agigreenpac.com", hq:"Kolkata (regd.) · Gurgaon (corporate)", region:"India",
    serves:"India", modes:["stock","custom"],
    about:"Glass containers and bottles from 1.5 ml to 6,000 ml (AGI Glaspac, 2,000+ tonnes/day), PET bottles for pharma, alcobev, food, soft drinks, personal care and dairy (AGI Plastek), and security caps and closures with anti-counterfeit features (AGI Clozures). Three glass plants.",
    cat:["glass-bottles","plastic-bottles","closures"],
    sample:{ t:null, verified:false, note:"Unknown.", src:null },
    review:null, certs:[], priceNotes:[], lead:null,
    prov:"Verified Sept 2026: live site, product scope. Certifications page did not render. Unknown: samples, reviews. Re-audit 2026-09-19: registered office Kolkata, corporate office Gurgaon confirmed (own site)." },

  { id:"colour-impressions", name:"Colour Impressions", website:"https://www.colourimpressions.in", hq:"Chandigarh, Punjab", region:"India",
    serves:"FOB & CIF to 5 continents", modes:["stock","custom"],
    about:"Vertically integrated packaging manufacturer — paper cups (single, double, ripple wall), folding cartons, flexible packaging and rigid gift boxes for FMCG, F&B and pharma. Catalog MOQs 25,000–50,000 pcs with MOQ-flexible custom runs.",
    cat:["folding-cartons","pouches-bags","setup-boxes","tubs-pails"],
    sample:{ t:null, verified:false, note:"Unknown.", src:null },
    review:null,
    certs:[{ n:"ISO (claimed)", src:"colourimpressions.in, Sept 2026" },{ n:"BRC (claimed)", src:"colourimpressions.in, Sept 2026" },{ n:"FSSC 22000 (claimed)", src:"colourimpressions.in, Sept 2026" },{ n:"SEDEX (claimed)", src:"colourimpressions.in, Sept 2026" }],
    priceNotes:["Listed catalog MOQs 25,000–50,000 pcs"], lead:null,
    prov:"Verified Sept 2026: HQ, product scope, MOQ facts, certification claims (self-reported, not validated against issuing bodies). Unknown: samples, reviews." },

  { id:"reliable-packaging", name:"Reliable Packaging Industries Limited", website:"https://www.reliablepackaging.com", hq:"Delhi NCR; plants Noida, Hyderabad, Assam", region:"India",
    serves:"India", modes:["custom"],
    about:"Corrugated and carton boxes for FMCG, beverages and durables — over a billion corrugated boxes since 1989, with two own paper mills.",
    cat:["corrugated"],
    sample:{t:"stock_sample",verified:true,note:"Product pages state 'Sample Available : Yes'; fee/quantity terms not stated.",src:"https://www.reliablepackaging.com/apple-corrugated-box/"},
    review:null,
    certs:[{ n:"FSSC 22000 V5.1 (claimed)", src:"reliablepackaging.com, Sept 2026" },{ n:"FSC CoC (claimed)", src:"reliablepackaging.com, Sept 2026" },{ n:"SEDEX (claimed)", src:"reliablepackaging.com, Sept 2026" }],
    priceNotes:[], lead:null,
    prov:"Verified Sept 2026: live site, scale claims, certification claims. Distinct from 'Reliable Packaging' of Raipur. Unknown: samples, reviews. Re-audit 2026-09-19: product pages state 'Sample Available : Yes' — sample gate opened with cautious note; FSSC 22000 V5.1/FSC CoC/SEDEX claims re-confirmed on homepage." },

  { id:"cambay", name:"Cambay Technopack (Cambay Foodservice Packaging)", website:"https://www.cambay.co.in", hq:"Surat, Gujarat (factory Tadkeshwar)", region:"India",
    serves:"Exports to 18+ countries incl. North America, Europe, Middle East", modes:["stock","custom"],
    about:"Paperboard foodservice packaging — bakery boxes, clamshell and eco boxes, boat trays, paper cups, soup and salad bowls and food containers. 250+ SKUs plus private labeling, custom sizes and branded printing at competitive minimums.",
    cat:["folding-cartons","tubs-pails","thermoforms"],
    sample:{ t:"custom_sample", verified:true, note:"Samples offered — 'Tell us what you need. Our export team responds within 24 hours with pricing, samples, and a tailored product recommendation.' Free/paid split not stated.", src:"https://www.cambay.co.in" },
    review:null,
    certs:[{ n:"BRCGS Food Safety A Grade (claimed, independently audited per site)", src:"cambay.co.in, Sept 2026" },{ n:"FSC CoC (claimed)", src:"cambay.co.in, Sept 2026" },{ n:"TÜV Austria EN 13432 compostable (claimed)", src:"cambay.co.in, Sept 2026" },{ n:"SEDEX/BSCI (claimed)", src:"cambay.co.in, Sept 2026" },{ n:"Star Export House (claimed)", src:"cambay.co.in, Sept 2026" }],
    priceNotes:[], lead:null,
    prov:"Verified Sept 2026: HQ, product scope, samples offer, certification claims (site says every certificate is downloadable via logo links). Unknown: marketplace ratings, free/paid sample split." },

  { id:"paharpur3p", name:"Paharpur 3P", website:"https://www.paharpur3p.com", hq:"Facilities Sahibabad (UP), Sri City (AP), Manesar (HR)", region:"India",
    serves:"Exports incl. Canada, US, UK, France, South Africa, UAE, Vietnam and more", modes:["custom"],
    about:"Flexible packaging — stand-up, spouted, flat-bottom, shaped and zipper pouches, side-gusset pouches, retort packaging, rollstock and laminates, shrink sleeves, cold-seal laminates, paper bags and wraps, spouts and caps. Food, beverage, healthcare, home and personal care, pet food, agrochemicals.",
    cat:["pouches-bags","rollstock","shrink-sleeves","sachets"],
    sample:{ t:null, verified:false, note:"Unknown.", src:null },
    review:null, certs:[], priceNotes:[], lead:null,
    prov:"Verified Sept 2026: live site, product scope, export footprint. Unknown: certifications, samples, reviews." },

  { id:"pr-packagings", name:"P.R. Packagings Limited", website:"https://prpack.net", hq:"Palwal, Haryana (Sehrola Road)", region:"India",
    serves:"India; manufacturer/exporter", modes:["custom"],
    about:"Printed packaging manufacturer — folding boxes, rigid boxes, laminate tubes, labels, corrugated mono cartons, liner cartons and paper bags. Founded 1991; public limited.",
    cat:["folding-cartons","setup-boxes","tubes","labels","corrugated"],
    sample:{ t:null, verified:false, note:"Unknown.", src:null },
    review:null,
    certs:[{ n:"SEDEX", src:"PaperIndex profile, Sept 2026" },{ n:"GMI", src:"PaperIndex profile, Sept 2026" },{ n:"BRC/IoP food packaging", src:"PaperIndex profile, Sept 2026" },{ n:"ISO 9001", src:"PaperIndex profile, Sept 2026" },{ n:"ISO 14001", src:"PaperIndex profile, Sept 2026" },{ n:"ISO 12647-2:2013 certified printshop", src:"PaperIndex profile, Sept 2026" }],
    priceNotes:[], lead:null,
    prov:"Verified Sept 2026: directory profile (company site did not render this session). Certifications as listed on PaperIndex. Unknown: samples, reviews. Re-audit 2026-09-19: live company site located (prpack.net; prpackagings.com domain dead, empty responses on all variants). Own site corroborates 5 of 6 PaperIndex certs (SEDEX SMETA 4-pillar, GMI, BRC/IOP, ISO 9001:2015, ISO 14001:2015); ISO 12647-2:2013 remains PaperIndex-only. Own site also lists ISO 45001:2018, One Star Export House, D-U-N-S 918014861, PLMA — recorded, not yet added to certs." },

  { id:"purity-flexpack", name:"Purity Flexpack Limited", website:"https://www.indiamart.com/purity-flexpack/", hq:"Panchmahal district (near Halol), Gujarat", region:"India",
    serves:"India; IEC on file", modes:["custom"],
    about:"Stand-up laminated pouches, rotogravure-printed pouches and rolls, snack food packaging, ORS packaging, healthcare packaging material and vacuum bags. Est. 1988; 101–500 employees.",
    cat:["pouches-bags","rollstock"],
    sample:{ t:null, verified:false, note:"Unknown.", src:null },
    review:null,
    certs:[{n:"ISO 9001:2015 & ISO 22000:2018 (claimed)",src:"purityflexpack.com own site, re-audit 2026-09-19"}],
    badges:["IndiaMART Verified Exporter"], priceNotes:[], lead:null,
    prov:"Verified Sept 2026: IndiaMART profile, Verified Exporter badge. Unknown: numeric rating (rendered graphically, not legible), samples. Re-audit 2026-09-19: own site live (purityflexpack.com) — HQ refined to Panchmahal district (near Halol); ISO 9001:2015 & ISO 22000:2018 claimed on own site — upgraded from generic IndiaMART claim." },

  { id:"sanjeev-flexipack", name:"Sanjeev Flexi Pack Private Limited", website:"https://www.indiamart.com/sanjeev-flexipack-mumbai/", hq:"Mumbai (Mulund West corporate office) · factory: Bhiwandi, Thane", region:"India",
    serves:"Exports to UK, USA, Kenya, Egypt, Germany", modes:["custom"],
    about:"Printed pouches for tea, dry fruits, detergent and sweets, plus retort stand-up pouches, PP woven bags, BOPP laminated pouches, lidding film laminates and frozen-food and pet-food pouches. Est. 2010; clients include Allanasons Ltd. and Himadri Foods.",
    cat:["pouches-bags","rollstock"],
    sample:{ t:null, verified:false, note:"Unknown.", src:null },
    review:null,
    certs:[],
    badges:["IndiaMART Trust Seal Verified","IndiaMART Verified Exporter","69% response rate · 14 yrs on platform"], priceNotes:[], lead:null,
    prov:"Verified Sept 2026: IndiaMART profile, badges. Star display present; numeric value not legible — treated as no verified rating. Unknown: ISO/BRC, samples. Re-audit 2026-09-19: HQ corrected to Mumbai (Mulund West corporate office) per own site — Bhiwandi is the factory address (IndiaMART attribution matches the factory)." },

  { id:"omprakash", name:"Omprakash Packaging Private Limited", website:"https://www.indiamart.com/omprakash-packaging-private-limited/", hq:"Ambarnath, Maharashtra", region:"India",
    serves:"India", modes:["custom"],
    about:"Laminated pouches, stand-up pouches, coffee pouches, aluminium-foil-based pouches, confectionery pouches and hard box and jar packaging. Turnover 25–100 Cr; 5 yrs on IndiaMART.",
    cat:["pouches-bags"],
    sample:{ t:null, verified:false, note:"Unknown.", src:null },
    review:null, certs:[], priceNotes:[], lead:null,
    prov:"Verified Sept 2026: IndiaMART profile only. No TrustSEAL or rating displayed. Unknown: certifications, samples, reviews." },

  { id:"surana-superpack", name:"Surana Superpack Pvt. Ltd.", website:"https://www.indiamart.com/surana-superpack-pvt-ltd/", hq:"Pune, Maharashtra", region:"India",
    serves:"India", modes:["custom"],
    about:"Multi-color rotogravure-printed rolls, center-seal and three-side-seal pouches, stand-up pouches, spout pouches, PVC shrink sleeves and poly bags. Est. 1987; 51–100 employees; 14 yrs on IndiaMART.",
    cat:["pouches-bags","rollstock","shrink-sleeves"],
    sample:{ t:null, verified:false, note:"Unknown.", src:null },
    review:null, certs:[], priceNotes:[], lead:null,
    prov:"Verified Sept 2026: IndiaMART profile only. No TrustSEAL or rating displayed. Unknown: certifications, samples, reviews." },

  { id:"manjushree", name:"Manjushree Technopack Limited", website:"https://www.manjushreeindia.com", hq:"Bangalore (MBH Tech Park, Electronic City Phase-II)", region:"India",
    serves:"India", modes:["stock","custom"],
    about:"Rigid plastics — PET bottles for beverage, liquor, agro and pharma; jars for ghee, custard and spices; preforms; PCO-neck closures; lotion pumps and fine-mist sprayers; paint containers.",
    cat:["plastic-bottles","plastic-jars","closures","pumps-dispensers"],
    sample:{ t:null, verified:false, note:"Unknown.", src:null },
    review:null, certs:[], priceNotes:[], lead:null,
    prov:"Verified Sept 2026: products page (homepage behind bot protection). Unknown: certifications, samples, reviews." },

  { id:"cosmo-first", name:"Cosmo First Limited (Cosmo Films / Cosmo Plastech)", website:"https://cosmofirst.com", hq:"New Delhi (Jasola)", region:"India",
    serves:"Customer footprints in 100+ countries; sales offices Japan, Germany, US, Korea", modes:["custom"],
    about:"BOPP, CPP and BOPET specialty films for flexible packaging, lamination and labels (Cosmo Films), plus rigid packaging via injection moulding and thermoforming for FMCG (Cosmo Plastech). Three manufacturing facilities in India.",
    cat:["rollstock"],
    sample:{ t:null, verified:false, note:"Unknown.", src:null },
    review:null, certs:[], priceNotes:[], lead:null,
    prov:"Verified Sept 2026: live site, product scope. Unknown: HQ city, certifications, samples, reviews. Re-audit 2026-09-19: HQ New Delhi (Jasola) confirmed (own contact page)." },

  { id:"hitech", name:"Hitech Corporation Limited", website:"https://hitechcorporation.co", hq:"Mumbai (Lower Parel) · 13 manufacturing facilities", region:"India",
    serves:"India", modes:["stock","custom"],
    about:"Rigid plastic packaging for personal care, home care, food and beverages, dairy, paints, oils and lubricants, agrochemicals and pharmaceuticals — pails (6 patents), IML containers, caps and closures, pad printing, with in-house design and mould making.",
    cat:["tubs-pails","plastic-bottles","plastic-jars","closures"],
    sample:{ t:null, verified:false, note:"Unknown.", src:null },
    review:null, certs:[], priceNotes:[], lead:null,
    prov:"Verified Sept 2026: live site, facility list, product scope. Unknown: ISO/BRC status, samples, reviews. Re-audit 2026-09-19: HQ Mumbai (Lower Parel) confirmed (own contact page)." },

  { id:"jvsr", name:"JVSR Packaging Company", website:"https://www.jvsrpackaging.com", hq:"Faridabad, Haryana", region:"India",
    serves:"India; export pouches", modes:["custom"],
    about:"Printed laminated pouches and rolls for food and spices, multilayer laminates and pouches for export. Small firm — proprietorship, 11–25 employees, 8 yrs on IndiaMART.",
    cat:["pouches-bags","rollstock"],
    sample:{ t:null, verified:false, note:"Unknown.", src:null },
    review:null,
    certs:[],
    badges:["IndiaMART TrustSEAL (GST verified)","90% response rate"], priceNotes:[], lead:null,
    prov:"Verified Sept 2026: IndiaMART profile, TrustSEAL. Marketplace backup candidate — included for low-MOQ marketplace-style listings. Unknown: certifications, samples, reviews. Re-audit 2026-09-19: own site jvsrpackaging.com live alongside IndiaMART — website updated." },

  { id:"njoyy-flexi", name:"Njoyy Flexi Private Limited", website:"https://www.indiamart.com/njoyyflexi/", hq:"Gomtipur, Ahmedabad, Gujarat", region:"India",
    serves:"India", modes:["custom"],
    about:"Flexible packaging pouches for food, tobacco and dry-fruit zipper pouches plus HDPE and LLDPE detergent and washing-powder bags. Operating since 1982; 26–50 employees.",
    cat:["pouches-bags"],
    sample:{ t:null, verified:false, note:"Unknown.", src:null },
    review:null,
    certs:[],
    badges:["IndiaMART TrustSEAL"], priceNotes:[], lead:null,
    prov:"Verified Sept 2026: IndiaMART profile, TrustSEAL. Marketplace backup candidate. Unknown: certifications, samples, reviews." },

  /* ---------- China ---------- */
  { id:"bowepack", name:"BOWE PACK (Guangdong Bowe Packaging Co., Ltd.)", website:"https://bowepack.com", hq:"Xincheng Town, Xinxing County, Yunfu City, Guangdong", region:"China",
    serves:"Global industry-wide coverage; Aekovera network partner (listed on aekovera.com)", modes:["custom"],
    about:"Aekovera network partner. Custom flexible packaging — stand-up, spout, flat-bottom (box-bottom), quad-seal, side-gusset, stick-pack and shaped pouches, roll-stock films, and kraft, recyclable, compostable and PCR pouches, plus coffee packaging and bag-in-box wine pouches. One-stop custom packaging service with print proofs before production.",
    cat:["pouches-bags","rollstock","sachets","compostables"],
    sample:{ t:null, verified:false, note:"Unknown — FAQ documents print proofs and a $300 minimum order value but no physical-sample offer.", src:"https://bowepack.com/pages/faq" },
    review:null,
    certs:[{ n:"ISO / SGS / BRC / FDA compliance (claimed)", src:"bowepack.com/pages/about-us, Sept 2026" },{ n:"ISO9001 management system (claimed)", src:"bowepack.com/pages/factory-capacity, Sept 2026" }],
    badges:["Aekovera network partner"], priceNotes:["No minimum quantity — $300 minimum order value (supplier FAQ, Sept 2026)","Gravure cylinder fee on first print only; digital = no plate cost"], lead:"Rollstock 5–7 days · pouches 10–15 days after art approval",
    prov:"Verified Sept 2026: live site, product scope, MOQ/lead facts, certification claims, Aekovera homepage partnership listing. Unknown: physical-sample program, independent reviews." },

  { id:"hongqiao", name:"Shantou Hongqiao Packaging Industry Co., Ltd.", website:"https://hqpack.en.alibaba.com/", hq:"Shantou, Guangdong", region:"China",
    serves:"Global export", modes:["custom"],
    about:"Flexible packaging — stand-up spout pouches, spouted standing bags for 121°C high-temperature retorting, mini caps and pouch filling/capping machines.",
    cat:["pouches-bags"],
    sample:{ t:null, verified:false, note:"Unknown.", src:null },
    review:null,
    certs:[{ n:"ISO 22000", src:"Alibaba CERTIFICATES section, Sept 2026" },{ n:"BRC", src:"Alibaba CERTIFICATES section, Sept 2026" },{ n:"2006/42/EC", src:"Alibaba CERTIFICATES section, Sept 2026" }],
    badges:["Verified onsite by TÜV Rheinland (2025.08.05)","21 yrs badge — 35 years in industry"], priceNotes:[], lead:null,
    prov:"Verified Sept 2026: Alibaba storefront, certificates list, TÜV Rheinland onsite audit badge. Unknown: numeric rating, samples." },

  { id:"shanghai-forests", name:"Shanghai Forests Packaging Group Co., Ltd.", website:"https://shforestgroup.en.alibaba.com/", hq:"Shanghai", region:"China",
    serves:"Global export", modes:["custom"],
    about:"Packaging boxes — shipping boxes, gift boxes, shoe boxes and cardboard boxes in paper and paperboard, with full customization and design-based customization.",
    cat:["folding-cartons","corrugated","setup-boxes"],
    sample:{t:"stock_sample",verified:true,note:"Free stock samples — own site: three sample exhibition rooms, thousands of stock samples; terms beyond free unstated.",src:"https://www.forestspackaging.com/"},
    review:null,
    certs:[{ n:"ISO 9001", src:"Alibaba CERTIFICATES section, Sept 2026" },{ n:"FSC", src:"Alibaba CERTIFICATES section, Sept 2026" },{ n:"CE", src:"Alibaba CERTIFICATES section, Sept 2026" }],
    badges:["#1 highest on-time delivery rate in Other Paper Packaging","10 yrs badge — 20 years in industry"], priceNotes:[], lead:null,
    prov:"Verified Sept 2026: Alibaba storefront, certificates, performance badges. Unknown: numeric rating, samples. Re-audit 2026-09-19: own site states free stock samples (three sample exhibition rooms) — gate opened; terms beyond free unstated." },

  { id:"langke", name:"Zhongshan Langke Packaging Co., Ltd.", website:"http://www.langkepackaging.com", hq:"Zhongshan City, Guangdong", region:"China",
    serves:"Customers worldwide", modes:["custom"],
    about:"Color-printed packaging films and pouches — medical device packaging films, food packaging, daily-chemical product packaging, electronics and pet products. Founded 2003; 26,000 m² factory; 20,000 t/yr.",
    cat:["rollstock","pouches-bags"],
    sample:{ t:null, verified:false, note:"Unknown.", src:null },
    review:null,
    certs:[{ n:"ISO 9001 (composite packaging film & bag)", src:"langkepackaging.com/about, Sept 2026" },{ n:"ISO 13485 (medical packaging)", src:"langkepackaging.com/about, Sept 2026" },{ n:"FSSC 22000", src:"langkepackaging.com/about, Sept 2026" }],
    priceNotes:[], lead:null,
    prov:"Verified Sept 2026: company site, certification claims; FDA/ROHS/REACH compliance claims on about page. Unknown: samples, reviews." },

  { id:"unipack-glass", name:"QingDao Unipack Glass Co., Ltd.", website:"https://unipack.en.made-in-china.com/", hq:"Qingdao, Shandong (factory No. 188 Lucheng Road)", region:"China",
    serves:"North America, Western Europe, South America, SE Asia and more; export share 51–70%", modes:["stock","custom"],
    about:"Glass bottles and jars — spirits, vodka, wine, liquor, olive oil, food jars, beer, non-alcoholic beverage, cosmetics and pharmaceuticals — with 4-color screen printers, frosting, decal and gold-plating decoration; caps, cartons and labels via partners. 2,280 t/day capacity; Made-in-China account since 2009.",
    cat:["glass-bottles","glass-jars"],
    sample:{ t:null, verified:false, note:"Unknown.", src:null },
    review:null,
    certs:[{ n:"ISO 9001", src:"Made-in-China profile, Sept 2026" },{ n:"ISO 14001", src:"Made-in-China profile, Sept 2026" },{ n:"OHSAS/OHSMS 18001", src:"Made-in-China profile, Sept 2026" },{ n:"HACCP", src:"Made-in-China profile, Sept 2026" }],
    priceNotes:["Standard bottles US$0.10–$10/pc; MOQ 30,000–50,000 pcs (Made-in-China listings, Sept 2026)"], lead:null,
    prov:"Verified Sept 2026: Made-in-China profile, certificates, listed prices and MOQs. Unknown: numeric rating, samples." },

  { id:"darui-glass", name:"Darui Glass & Packaging", website:"https://drglasspackaging.com/", hq:"Jinan City, Shandong (No. 11111 Jingshi Road)", region:"China",
    serves:"US spirits clients incl. William Price Distilling, Ole Smoky Distillery, Knee-High Distilling", modes:["stock","custom"],
    about:"Glass bottles for prestige spirits, wine, food and beverage, cosmetics and perfume, and pharma, plus closures (GPI caps, capsules, aluminium screw caps, ROPP, non-refillable), metal labels, badges, presentation boxes and 6/12-pack cartons. 25 production lines, 5 decoration sites.",
    cat:["glass-bottles","closures","setup-boxes","brand-accessories"],
    sample:{ t:null, verified:false, note:"Unknown — FAQ covers customization; no sample-order terms seen.", src:null },
    review:null,
    certs:[{ n:"ISO9001 (claimed)", src:"drglasspackaging.com, Sept 2026" },{ n:"ISO14001 (claimed)", src:"drglasspackaging.com, Sept 2026" },{ n:"ISO45001 (claimed)", src:"drglasspackaging.com, Sept 2026" },{ n:"ISO22000 (claimed)", src:"drglasspackaging.com, Sept 2026" }],
    priceNotes:[], lead:null,
    prov:"Verified Sept 2026: company site, certification claims, named US distillery clients. Unknown: samples, reviews." },

  { id:"glory-tins", name:"Glory Tins Co., Ltd.", website:"https://glorytins.com", hq:"Dongguan, Guangdong (branches Hong Kong, Australia, Malaysia, Sri Lanka, Turkey)", region:"China",
    serves:"Exports to 70+ countries; clients incl. L'Oreal, Hershey's, Nivea, Lindt", modes:["stock","custom"],
    about:"Tinplate cans and boxes — food tins, cookie tins, tea tins, gift tins and cosmetic tins with embossing/debossing and CMYK & Pantone printing. 3 factories, 120,000+ m², 6,000+ molds, ~200 million tins/yr.",
    cat:["metal-tins"],
    sample:{ t:"stock_sample", verified:true, note:"Free tin can samples — 'try to install the product first, and then make a decision after satisfaction.'", src:"https://glorytins.com/" },
    review:null,
    certs:[{ n:"ISO 9001:2015", src:"glorytins.com / Made-in-China showroom, Sept 2026" },{ n:"BRC/IoP (awarded 2009)", src:"glorytins.com, Sept 2026" },{ n:"SA 8000 (2012)", src:"glorytins.com, Sept 2026" },{ n:"Sedex audits passed", src:"glorytins.com, Sept 2026" },{ n:"FDA / LFGB / EN71-1/2/3 / REACH product compliance (claimed)", src:"glorytins.com, Sept 2026" }],
    badges:["Made-in-China showroom (registered 2015)"], priceNotes:["6,000+ existing molds — stock shapes without new tooling"], lead:null,
    prov:"Verified Sept 2026: company site and Made-in-China showroom, certifications, free-sample offer, named brand clients. Unknown: numeric rating, L'Oreal/Disney/Hershey's factory-cert scope." },

  { id:"auber", name:"Auber Packaging Co., Ltd.", website:"https://www.auberpackaging.com", hq:"Guangzhou, Guangdong (Baiyun District)", region:"China",
    serves:"Global", modes:["custom"],
    about:"Cosmetic tubes — plastic and metal: skincare, hand cream, body lotion, lip gloss, toothpaste and ointment tubes, plus PE tubes, aluminium laminated tubes, high-glossy tubes, airless tubes, makeup tubes and contract packaging. 18,800 m², 3 million tubes/yr.",
    cat:["tubes"],
    sample:{ t:null, verified:false, note:"Unknown.", src:null },
    review:null,
    certs:[{ n:"ISO 9001:2015 (claimed)", src:"auberpackaging.com, Sept 2026" }],
    badges:["Made-in-China Diamond Member / Audited Supplier"], priceNotes:[], lead:null,
    prov:"Verified Sept 2026: company site, MIC membership badges. Stock-vs-custom split partly unknown. Unknown: samples, reviews. Re-audit 2026-09-19: canonical URL corrected to www.auberpackaging.com (apex returned empty to fetchers)." },

  { id:"mingda", name:"Hubei Mingda Plastics Products Co., Ltd.", website:"https://mingdaplastics.en.made-in-china.com/", hq:"Xianning, Hubei (Chongyang Economic Development Zone)", region:"China",
    serves:"North America, South America, Eastern Europe, SE Asia, Western Europe and more", modes:["stock","custom"],
    about:"HDPE and PET plastic bottles and jars for pharmaceuticals, health foods, supplements, food, daily chemicals and cosmetics, plus caps and sealing paper. 1,400 public molds for stock selection plus OEM/ODM service. Founded 2006.",
    cat:["plastic-bottles","plastic-jars","closures"],
    sample:{ t:"stock_sample", verified:true, note:"'Sample Available' stated on the Made-in-China profile (free/paid terms not shown).", src:"https://mingdaplastics.en.made-in-china.com/" },
    review:null,
    certs:[{n:"ISO 9001 (claimed)",src:"MIC profile COMPANY PROFILE, re-audit 2026-09-19"},{n:"ISO 14001 (claimed)",src:"MIC profile COMPANY PROFILE, re-audit 2026-09-19"},{n:"ISO 22000 (claimed)",src:"MIC profile COMPANY PROFILE, re-audit 2026-09-19"},{n:"ISO 45001 (claimed)",src:"MIC profile COMPANY PROFILE, re-audit 2026-09-19"},{n:"FDA / SGS / HACCP (claimed)",src:"MIC profile COMPANY PROFILE, re-audit 2026-09-19"},{n:"QS food-packaging production license (claimed)",src:"MIC profile COMPANY PROFILE, re-audit 2026-09-19"}],
    badges:["Made-in-China Diamond Member since 2017","Audited Supplier","Verified business license"], priceNotes:[], lead:null,
    prov:"Verified Sept 2026: Made-in-China profile, badges, sample-availability statement. Specific ISO numbers not rendered. Unknown: numeric rating, sample terms. Re-audit 2026-09-19: MIC profile now names ISO 9001/14001/22000/45001, FDA, SGS, HACCP, QS — added as claimed-on-MIC-profile." },

  { id:"fukang", name:"Fukang Plastic Production Co., Ltd.", website:"https://www.made-in-china.com/showroom/alice-zeng/", hq:"Dongguan, Guangdong (Daojiao Town)", region:"China",
    serves:"Global", modes:["stock"],
    about:"Plastic bottles, plastic jars and candy containers for food and health-food packaging. Manufacturer founded more than 16 years ago; Made-in-China account registered 2018.",
    cat:["plastic-bottles","plastic-jars"],
    sample:{ t:null, verified:false, note:"Unknown.", src:null },
    review:null,
    certs:[{ n:"ISO 9001", src:"Made-in-China showroom, Sept 2026" },{ n:"QS production license, third-party inspection report and FDA test report (claimed)", src:"Made-in-China showroom, Sept 2026" }],
    priceNotes:[], lead:null,
    prov:"Verified Sept 2026: Made-in-China showroom. Custom split not stated — partly unknown. Unknown: numeric rating, samples." },

  { id:"linghai", name:"Shantou Linghai Plastic Packing Factory Co., Ltd.", website:"https://www.lhpack.com", hq:"Shantou, Guangdong", region:"China",
    serves:"Global; ships from Shantou port", modes:["stock","custom"],
    about:"Thermoformed plastic and biodegradable packaging from PET, PP, PS, BOPS, PLA and sugarcane for fast food, fruit, vegetable, bakery and beverage. Since 1992; 35,000 m² dust-free workshop; 8 extrusion lines, KIEFEL (Germany) thermoformers, 150 t/day sheet output; own moulding department with 9 CNC machines.",
    cat:["thermoforms","compostables"],
    sample:{ t:null, verified:false, note:"Development sample molds in 3–7 days mentioned; formal sample-ordering terms unknown.", src:"https://www.lhpack.com/about-us/" },
    review:null, certs:[{n:"ISO 9001:2000 (as shown on site)",src:"lhpack.com homepage Our Certificate, re-audit 2026-09-19"},{n:"QS",src:"lhpack.com homepage Our Certificate, re-audit 2026-09-19"},{n:"BRC Global Standard (UK)",src:"lhpack.com homepage Our Certificate, re-audit 2026-09-19"}], priceNotes:[], lead:"3–7 days for single-cavity aluminum sample mold",
    prov:"Verified Sept 2026: company site, capability facts. Own-site certification section did not list certificate names; Alibaba overview did not render. Unknown: certifications, formal sample terms, reviews. Re-audit 2026-09-19: own homepage 'Our Certificate' names ISO 9001:2000, QS, UK BRC Global Standard — added as self-reported (version numbers as shown)." },

  /* ---------- Wave-2 published-price suppliers (24, integrated 2026-09-21;
     approved from verify/pricing-candidates-*.json; 99 verbatim price rows in
     asset-data.js; photos follow in a separate capture pass — zero photos here
     by design) ---------- */

  /* --- Batch A: US stock distributors --- */
  { id:"epackage-supply", name:"ePackageSupply", website:"https://epackagesupply.com", hq:"Evansville, Indiana, USA", region:"USA",
    serves:"US — ships 3M+ containers/month to 6,000+ businesses (press, May 2025)", modes:["stock","custom"],
    about:"Veteran-owned Indiana stock distributor of food-grade buckets, pails, lids and containers on a Shopify storefront with direct per-unit/case pricing, plus custom printed buckets from 60 units. Press (May 2025) reports a strategic investment and a $15M shared distribution facility in Warrick County.",
    cat:["tubs-pails","closures","thermoforms","corrugated"],
    sample:{ t:null, verified:false, note:"No sample program recorded in the wave-2 research capture this session.", src:null },
    review:null,
    certs:[], priceNotes:["5 Gallon Buckets - 90 Mil BPA-Free Food-Grade $5.61/ bucket (captured Sept 2026)","Custom 5 Gallon Buckets (Pressure Sensitive Label) As low as $5.61 / unit at Min Qty 60 (captured Sept 2026)"], lead:"Custom print: 2-3 week lead time (site pricing table, Sept 2026)",
    prov:"Wave-2 addition, verified 2026-09-21 from first-party pages (epackagesupply.com product and homepage listings; 5 verbatim price rows, no conversions). Ad-spend evidence: paid search (managing director quote on Google/Bing Ads efforts), Inside INdiana Business PR, LinkedIn (~2,105 followers), Shopify/Klaviyo marketing stack (StoreCensus). No Trustpilot presence found — review:null; on-site Judge.me volume (3,377 site-wide) and Birdeye count (46, no numeric rating) noted as volumetric only. Unknown: certifications. Confidence: high. Source: verify/pricing-candidates-A-us-stock.json." },

  { id:"bottlestore", name:"BottleStore.com (O.Berk Company)", website:"https://www.bottlestore.com", hq:"Union, New Jersey, USA (O.Berk parent, founded 1910)", region:"USA",
    serves:"US; parent O.Berk serves pharma, nutraceuticals, health & beauty, food & beverage and industrial markets", modes:["stock","custom"],
    about:"Direct-buy e-commerce channel of O.Berk (founded 1910, still family-run) — glass and plastic bottles, jars and closures with per-piece and per-carton pricing plus multi-tier carton discounts published on every captured product page. Part of O.Berk's custom and decorating services, so stock buying bridges to custom work.",
    cat:["glass-bottles","plastic-bottles","glass-jars","plastic-jars","closures","droppers-vials"],
    sample:{ t:null, verified:false, note:"No sample program recorded in the wave-2 research capture this session.", src:null },
    review:{ platform:"Trustpilot", score:4.4, count:3503, url:"https://www.trustpilot.com/review/bottlestore.com" },
    certs:[], priceNotes:["2 oz flint Boston round $0.20/pc (240/carton, tiers to 18% off) (captured Sept 2026)","4 oz amber Boston round $59.20/carton of 160 (captured Sept 2026)"], lead:null,
    prov:"Wave-2 addition, verified 2026-09-21 from first-party pages (bottlestore.com PDPs; 4 verbatim price rows with per-piece and carton-tier strings preserved). Ad-spend evidence: in-house marketing organization (O.Berk marketing director profile), agency paid-ads/SEO case study (Customer Paradigm), LinkedIn (~6,379 followers), email promotions program. Trustpilot receipt observed 2026-09-21 (4.4/3,503, claimed paid profile); reviewer base is small-business CPG. Unknown: sample program, certifications, lead times. Confidence: high. Source: verify/pricing-candidates-A-us-stock.json." },

  { id:"specialty-bottle", name:"Specialty Bottle (Specialty Bottle Supply, LLC)", website:"https://www.specialtybottle.com", hq:"Seattle, Washington, USA (founded 1997; second location Nashville, TN)", region:"USA",
    serves:"US and Canada (first-party claim: 50,000+ customers — puffery-grade)", modes:["stock"],
    about:"Classic stock bottle/jar/tin distributor for food, beauty, herbal and cannabis-adjacent small CPG — five-step published quantity-tier tables on product pages, no small-order fee, case-quantity-1 buying. Active owned-social (Pinterest boards) and SEO content marketing; no ad-library proof found.",
    cat:["glass-bottles","plastic-bottles","glass-jars","metal-tins","droppers-vials","closures","cr-cannabis"],
    sample:{ t:null, verified:false, note:"No sample program recorded in the wave-2 research capture this session.", src:null },
    review:{ platform:"Trustpilot", score:3.8, count:9, url:"https://www.trustpilot.com/review/specialtybottle.com" },
    certs:[], priceNotes:["4 oz Amber Boston Round (BRA4) Now: $0.65, tiers to $0.44 at 10,000-25,000 (captured Sept 2026)"], lead:null,
    prov:"Wave-2 addition, verified 2026-09-21 from first-party pages (specialtybottle.com PDPs; 5 verbatim rows incl. five-step tier tables). Ad-spend evidence: owned content marketing (Pinterest 10+ maintained boards, Instagram, Facebook) + SEO landing pages — no paid-ad-library capture. Trustpilot receipt observed 2026-09-21 (3.8/9 — unclaimed, thin volume; reputation deliberately not presented as strong; Unilocal 4.7/18 noted in research as secondary). Named hint candidate, medium confidence. Source: verify/pricing-candidates-A-us-stock.json." },

  { id:"paper-mart", name:"Paper Mart", website:"https://www.papermart.com", hq:"Ontario, California, USA (founded 1921; ~116 employees)", region:"USA",
    serves:"US — owns its Ontario, CA distribution", modes:["stock"],
    about:"High-volume US retail packaging supplies store ('The Complete Packaging Supplies Store', trading since 1921) — shopping bags, cello/glassine/organza bags, gift, apparel and jewelry boxes with Shopify 'From $X' pricing published on every collection. Paper/retail specialist, not a bottle/jar source.",
    cat:["folding-cartons","setup-boxes","mailers","brand-accessories","pouches-bags"],
    sample:{ t:null, verified:false, note:"No sample program recorded in the wave-2 research capture this session.", src:null },
    review:{ platform:"Trustpilot", score:4.7, count:9621, url:"https://www.trustpilot.com/review/www.papermart.com" },
    certs:[], priceNotes:["Plain White Kraft Shopping Bags Regular price From $9.87 (captured Sept 2026)","Natural Kraft Jewelry Boxes From $32.20 (captured Sept 2026)"], lead:null,
    prov:"Wave-2 addition, verified 2026-09-21 from first-party pages (papermart.com collections; 5 verbatim 'From'-price rows). Ad-spend evidence: Google Ads spend tracker (Grips Intelligence), DoubleClick Floodlight tags, ~1% paid-traffic share, LinkedIn (~5,521 followers), claimed paid Trustpilot subscription with company replies. Trustpilot receipt observed 2026-09-21 (4.7/9,621 — strongest in batch). Material fact: per the company's own About page, a new independently owned company acquired PaperMart.com on August 27, 2026 — re-verify commercial terms before deeper integration. Confidence: high. Source: verify/pricing-candidates-A-us-stock.json." },

  { id:"burch-bottle", name:"Burch Bottle & Packaging, Inc.", website:"https://www.burchbottle.com", hq:"Voorheesville / NY's Capital Region, New York, USA (founded 1984)", region:"USA",
    serves:"US and Canada shipping; will-call warehouse (NY)", modes:["stock"],
    about:"40+ year NY stock distributor — glass and plastic bottles and jars, closures and tins for food & beverage, candles and personal care, with per-case published prices, genuine bulk case-tier tables and stock-on-hand counts shown on product pages.",
    cat:["glass-bottles","plastic-bottles","glass-jars","plastic-jars","closures","metal-tins","droppers-vials","brand-accessories"],
    sample:{ t:null, verified:false, note:"No sample program recorded in the wave-2 research capture this session.", src:null },
    review:{ platform:"Trustpilot", score:4.8, count:2257, url:"https://www.trustpilot.com/review/www.burchbottle.com" },
    certs:[], priceNotes:["2oz Straight Sided Amber Glass Jars $9.15 / Case of 24, bulk tiers to $6.64 (captured Sept 2026)"], lead:null,
    prov:"Wave-2 addition (own discovery, not in the hint list), verified 2026-09-21 from first-party pages (burchbottle.com PDPs; 5 verbatim rows incl. three-step bulk case tiers down to $6.09/Case). Ad-spend evidence: first-party promotions page with dated promo-code sales, email newsletter program, active LinkedIn; no ad-library capture. Trustpilot receipt observed 2026-09-21 (4.8/2,257 — second-strongest in batch). Confidence: high. Source: verify/pricing-candidates-A-us-stock.json." },

  { id:"packaging-supplies", name:"PackagingSupplies.com (a division of Cleveland Packaging, Inc.)", website:"https://www.packagingsupplies.com", hq:"Brunswick / Solon, Ohio, USA (parent founded 1998; six distribution centers)", region:"USA",
    serves:"US — distribution centers in Chicago, Cleveland, Dallas, Greenville SC, Los Angeles and New York", modes:["stock"],
    about:"Cleveland Packaging's national e-commerce division for shipping and secondary packaging — corrugated boxes and bin boxes, packing-list envelopes, stretch film and poly bags with homepage-per-SKU published pricing (bundle/case conditions stated on every card) and a low-price-guarantee positioning.",
    cat:["corrugated","mailers","setup-boxes","pouches-bags"],
    sample:{ t:null, verified:false, note:"No sample program recorded in the wave-2 research capture this session.", src:null },
    review:null,
    certs:[], priceNotes:["10 x 8 x 6 Corrugated Boxes 25/Bundle $20.70 (captured Sept 2026)","16 x 1500 Feet/Roll Stretch Film (4/Case) $44.35 (captured Sept 2026)"], lead:null,
    prov:"Wave-2 addition, verified 2026-09-21 from first-party pages (packagingsupplies.com product cards; 4 verbatim rows). Ad-spend evidence: PR in Transportation Today trade press (president quoted by name, Feb 2023), maintained first-party blog and LinkedIn. Reputation: no Trustpilot profile or review-platform rating found — review:null, press-evidenced and review-unscored (FitSmallBusiness Nov 2024 editorial 'Best for wholesale pricing' is third-party editorial, not named CPG clients). Confidence: medium. Source: verify/pricing-candidates-A-us-stock.json." },

  /* --- Batch B: US digital/custom platforms --- */
  { id:"sticker-mule", name:"Sticker Mule", website:"https://www.stickermule.com", hq:"United States (New York; co-founded by Anthony Constantino)", region:"USA",
    serves:"US / global — SMB, e-commerce and creator customers", modes:["custom"],
    about:"Custom stickers, labels, stand-up pouches, mailers and packaging tape with live configurator pricing — the noissue/Arka peer profile, plus the batch's largest first-party review base and documented creator-sponsorship and podcast marketing.",
    cat:["labels","pouches-bags","mailers","brand-accessories"],
    sample:{ t:"custom_sample", verified:true, note:"$4 custom packaging tape sample (24in strip, free shipping); rotating $1-for-10-sticker deal page (first-party).", src:"https://www.stickermule.com/" },
    review:{ platform:"Trustpilot", score:4.7, count:43782, url:"https://www.trustpilot.com/review/stickermule.com" },
    certs:[], priceNotes:["Custom die cut stickers $1.20 / sticker ($60 configurator default) (captured Sept 2026)","Custom printed stand up pouches $1.80 / pouch ($18 default) (captured Sept 2026)"], lead:null,
    prov:"Wave-2 addition, verified 2026-09-21 from first-party pages (stickermule.com configurator defaults; 5 verbatim rows — two deal/sample rows from indexed first-party page text, noted per row). Ad-spend evidence: SponsorRadar lists 63 sponsored YouTube videos across 4 creators, podcast sponsorships (Podcast Hero), Forbes profiles (Dec 2024, Jul 2024). Trustpilot receipt observed 2026-09-21 (4.7/43,782); first-party review volume also large (4.9/5, 91,248 on stickers page). Pouches state FDA and EU food-contact compliance (first-party). No named CPG clients verified. Confidence: high. Source: verify/pricing-candidates-B-us-digital.json." },

  { id:"ecoenclose", name:"EcoEnclose", website:"https://www.ecoenclose.com", hq:"Louisville, Colorado, USA (416 S Taylor Ave)", region:"USA",
    serves:"US (Louisville, CO); enterprise programs with named-brand case-study roster", modes:["stock","custom"],
    about:"The eco-packaging anchor of its segment: certified B Corp (2021) and Climate Neutral certified (2019) — server-rendered BigCommerce store with genuinely published stock and custom prices, 500-unit custom MOQs, recycled poly mailers, stock and custom tissue, and an 'Ultimate Guide' content program.",
    cat:["mailers","brand-accessories","corrugated","labels","compostables"],
    sample:{ t:"stock_sample", verified:true, note:"Free poly mailer samples (one unit per product and size, customer pays shipping — stated in first-party FAQ); 'Order Free Samples' curated kit offered on the enterprise page.", src:"https://www.ecoenclose.com/" },
    review:{ platform:"Trustpilot", score:4.5, count:61, url:"https://www.trustpilot.com/review/ecoenclose.com" },
    certs:[], priceNotes:["100% Recycled Poly Mailer 9in x 12in $0.00 - $419.00 by size/quantity (captured Sept 2026)","Kraft Tissue Paper (stock) $23.00 per ream of 480 sheets (captured Sept 2026)"], lead:null,
    prov:"Wave-2 addition, verified 2026-09-21 from first-party pages (ecoenclose.com product cards and tissue PDPs; 5 verbatim rows). Ad-spend evidence: certifications-driven press (B Corp 2021, Climate Neutral 2019), owned content program, case-study hub with named brands (Fjallraven, Ritual, Scentbird, Mosh, Raan and more); no Google/Meta ad-library capture achieved. Trustpilot receipt observed 2026-09-21 (4.5/61 — small count; Birdeye 216 Louisville reviews noted as secondary). Starbucks plantable gift-card partnership is a single-source third-party claim, not first-party verified. Confidence: high. Source: verify/pricing-candidates-B-us-digital.json." },

  { id:"boxup", name:"BoxUp", website:"https://www.boxup.com", hq:"Terre Haute, Indiana, USA (1303 E Industrial Dr per BBB profile; founded 2016)", region:"USA",
    serves:"US — custom boxes online, no minimums, quantity-1 proofs", modes:["custom"],
    about:"True digital/web-to-print custom box platform in the noissue/Arka model — display, gift, shipper and gable mailer boxes priced in an in-browser configurator with no minimums and FREEPROOF single custom-printed proofs (pay shipping only).",
    cat:["corrugated","mailers","setup-boxes"],
    sample:{ t:"stock_sample", verified:true, note:"$1 stock sample boxes across all six styles (display mailer, shipper, square mailer, gift mailer, end-open mailer, gable box), plus FREEPROOF single custom-printed proof (pay shipping only).", src:"https://www.boxup.com/view/current-promotions" },
    review:{ platform:"Reviews.io", score:4.7, count:6541, url:"https://www.reviews.io/company-reviews/store/www.boxup.com" },
    certs:[], priceNotes:["Custom Display Mailer Box (full-color CMYK, 9.5x7.75x4in) $4.58 / each at qty 252 (captured Sept 2026)","Custom Gift Mailer Box (top-tuck, 4x4x8in) $1.91 / each (captured Sept 2026)"], lead:null,
    prov:"Wave-2 addition, verified 2026-09-21 from first-party pages (boxup.com configurator rendered in-browser with screenshot evidence; gift-mailer price from Exa's index of the same first-party product pages — JS configurator not raw-fetchable). Ad-spend evidence: first-party Current Promotions page (FREEPROOF, WELCOME 10% off, newsletter offers), affiliate program, active social; no ad-library capture. Review receipt: Reviews.io 4.7/6,541 (94% recommend) observed 2026-09-21; no Trustpilot profile exists for boxup.com — 'Box Up Packaging' at boxuppackaging.com is a distinct entity, not conflated; BBB A+ (not accredited). No named CPG clients verified. Confidence: medium. Source: verify/pricing-candidates-B-us-digital.json." },

  { id:"custom-boxes-now", name:"Custom Boxes Now", website:"https://customboxesnow.com", hq:"Minneapolis, Minnesota, USA (6920 93rd Avenue N.)", region:"USA",
    serves:"US — Minneapolis manufacturing (stated 200,000 sq ft plant; 'not a broker or reseller')", modes:["custom"],
    about:"60+ year in-house corrugated manufacturer with genuinely live configurator pricing — custom RSC shipping boxes and mailers, free structural samples, and the batch's strongest packaging reputation (claimed Trustpilot 4.8 across 183 reviews).",
    cat:["corrugated","mailers"],
    sample:{ t:"stock_sample", verified:true, note:"Free structural sample ('Structural Sample: Free' in first-party comparison table; box-builder notes representative contact for freight-quote cases).", src:"https://customboxesnow.com/" },
    review:{ platform:"Trustpilot", score:4.8, count:183, url:"https://uk.trustpilot.com/review/customboxesnow.com" },
    certs:[], priceNotes:["Custom RSC 10x10x10in kraft at qty 100: TOTAL PRICE $610.00 / $6.10 per box (live render) (captured Sept 2026)"], lead:null,
    prov:"Wave-2 addition, verified 2026-09-21 from first-party pages (customboxesnow.com homepage configurator, live render; a second row preserves an Exa-indexed 2026-05-27 snapshot of the same configurator — embedded iframe inputs could not be scripted, so only the default configuration was captured, dated per row). Ad-spend evidence: owned YouTube channel, claimed-profile review-solicitation program, first-party comparison/content marketing; no ad-library capture. Trustpilot receipt observed 2026-09-21 (4.8/183 on uk.trustpilot.com; on-site badge reads 4.9(182)). Named testimonials are small businesses, not major CPG brands. Confidence: medium. Source: verify/pricing-candidates-B-us-digital.json." },

  { id:"stickerapp", name:"StickerApp", website:"https://stickerapp.com", hq:"Lomma, Sweden; US operations: StickerApp Inc., 40 West St, Annapolis, MD 21401 (first-party statement: 'factories in Sweden and the US')", region:"USA",
    serves:"US and EU custom-sticker customers from Sweden/US factories", modes:["custom"],
    about:"Custom die-cut vinyl stickers and sticker sheets with tiered public pricing, massive review volume (4.7 across ~20,284 Trustpilot reviews) and US factories — a direct labels/stickers peer for the marketplace.",
    cat:["labels","brand-accessories"],
    sample:{ t:"custom_sample", verified:true, note:"Sample packs: 'Pick your perfect match' / 'Try before you buy' — materials, laminates, and CMYK color palettes in one pack (first-party homepage).", src:"https://stickerapp.com/" },
    review:{ platform:"Trustpilot", score:4.7, count:20284, url:"https://www.trustpilot.com/review/stickerapp.com" },
    certs:[], priceNotes:["Custom vinyl stickers $27 per order at the 29-pc starting tier (captured Sept 2026)"], lead:null,
    prov:"Wave-2 addition — price rows captured 2026-09-03 from Exa's index of first-party stickerapp.com pages (the live site is CloudFront-gated and denied both plain fetch and agent-browser render this session; tier-table size context per row is not stated in the extract and was not invented); supplier facts verified 2026-09-21. Ad-spend evidence: first-party cookie policy naming Google Ads/Bing/Facebook Pixel (no live ad-library capture), /campaigns deals page, Porsche AHEAD co-marketing case, Sticker Academy content. Trustpilot receipt observed 2026-09-21 (4.7/20,284). Ownership chain Swedish parent → US entity not verified from corporate filings. Confidence: medium. Source: verify/pricing-candidates-B-us-digital.json." },

  /* --- Batch C: UK and continental EU --- */
  { id:"davpack", name:"Davpack (Davpack International Packaging Supplies Ltd)", website:"https://www.davpack.co.uk", hq:"Derby, United Kingdom", region:"UK",
    serves:"UK", modes:["stock"],
    about:"Classic UK stock packaging distributor with a full e-commerce shop and pack-quantity tier tables (up to -35% at 50+ packs) — corrugated boxes (incl. UN-approved and foam-lined variants) and postal mailers.",
    cat:["corrugated","mailers"],
    sample:{ t:null, verified:false, note:"No sample program recorded in the wave-2 research capture this session.", src:null },
    review:{ platform:"Trustpilot", score:4.6, count:9169, url:"https://uk.trustpilot.com/review/davpack.co.uk" },
    certs:[], priceNotes:["ADW90 Brown Double Wall Box £8.52 Inc VAT per pack of 10 ('From only £6.64 / pack 10') (captured Sept 2026)"], lead:null,
    prov:"Wave-2 addition, verified 2026-09-21 from first-party pages (davpack.co.uk product pages; 3 verbatim rows with 5-tier pack-quantity tables preserved). Ad-spend evidence: Google Ads Transparency Center (80 ads, GB) and Meta Ad Library (~37 results incl. video creative). Trustpilot receipt observed 2026-09-21 (4.6/9,169, claimed paid profile; HQ Derby evidenced by in-person review + 01332 phone code). Reviewer base is small-business/trade repeat purchasing. Confidence: high. Source: verify/pricing-candidates-C-eu-uk.json." },

  { id:"lil-packaging", name:"Lil Packaging (Lil (Crawn) Ltd)", website:"https://lilpackaging.com", hq:"Cambridge, United Kingdom", region:"UK",
    serves:"UK — free UK shipping over £175 (site banner: 'All Prices EX VAT')", modes:["stock"],
    about:"UK corrugated e-commerce mailer manufacturer (FSC-certified) — C2/C4 book wraps and postal mailers with sample+pack+pallet tier ladders, purchasable 1-unit samples, and ex-VAT pricing. Trust score (3.1/820) is the weak spot vs packaging rivals — flagged, not hidden.",
    cat:["mailers","corrugated"],
    sample:{ t:"stock_sample", verified:true, note:"Purchasable 1-unit samples priced per product (e.g. C2 Book Wrap Sample £0.29 ex VAT; C4 Sample £0.55).", src:"https://lilpackaging.com/" },
    review:{ platform:"Trustpilot", score:3.1, count:820, url:"https://uk.trustpilot.com/review/lilpackaging.com" },
    certs:[], priceNotes:["C2 Book Wraps £73.01 per pack of 200 units (1-unit sample £0.29) (captured Sept 2026)"], lead:null,
    prov:"Wave-2 addition, verified 2026-09-21 from first-party pages (lilpackaging.com variant pickers; 3 verbatim rows). Ad-spend evidence: Google Ads Transparency Center (14 ads, GB); Meta check inconclusive (results dominated by unrelated 'Lil' brands) — recorded as inconclusive, not claimed. Trustpilot receipt observed 2026-09-21 (3.1/820, claimed since June 2018 — middling rating shown as-is). Named CPG case studies on first-party blog: Charlotte Tilbury, Goldsmiths, Curveball Leisure. Confidence: high. Source: verify/pricing-candidates-C-eu-uk.json." },

  { id:"polybags", name:"Polybags Ltd (PB Packaging Group)", website:"https://www.polybags.co.uk", hq:"Lyon Way, Greenford, Middlesex UB6 0AQ, United Kingdom", region:"UK",
    serves:"UK", modes:["stock"],
    about:"UK polythene manufacturer + online retailer — clear polybags, grip-seal bags and biodegradable carrier lines with deep per-1000 tier tables. Self-describes as 'the UK's number one packaging manufacturer and online retailer' (self-claim, flagged).",
    cat:["pouches-bags","mailers","compostables"],
    sample:{ t:null, verified:false, note:"No dedicated sample program confirmed this session (shop has bestseller from-pricing only).", src:null },
    review:{ platform:"Trustpilot", score:4.9, count:13607, url:"https://uk.trustpilot.com/review/www.polybags.co.uk" },
    certs:[], priceNotes:["Clear Polybag 12x18in £73.72 Ex. VAT per 1000 (£61.84 at 25000+) (captured Sept 2026)"], lead:null,
    prov:"Wave-2 addition, verified 2026-09-21 from first-party pages (polybags.co.uk product pages; 3 verbatim rows with Inc./Ex. VAT columns and tier rows preserved). Ad-spend evidence: Google Ads Transparency Center (80 ads, GB); Meta keyword search inconclusive (dominated by unrelated advertisers) — recorded as inconclusive, not claimed. Trustpilot receipt observed 2026-09-21 (4.9/13,607, claimed since May 2014 — strongest review base in the wave-2 batch). No named CPG clients found; reputation carried by review volume. Confidence: high. Source: verify/pricing-candidates-C-eu-uk.json." },

  { id:"reuseabox", name:"Reuseabox", website:"https://www.reuseabox.co.uk", hq:"Lincoln, Lincolnshire, United Kingdom", region:"UK",
    serves:"UK", modes:["stock"],
    about:"Unique resale/reuse model for corrugated — Royal Mail PiP-compliant postal boxes and used heavy-duty boxes sold with quantity-dependent pricing and claimed carbon/re-use impact. Press footprint is real and recent; review-based trust is not yet established (3.8 across 4 reviews — flagged honestly).",
    cat:["corrugated","mailers"],
    sample:{ t:null, verified:false, note:"No sample program recorded in the wave-2 research capture this session.", src:null },
    review:{ platform:"Trustpilot", score:3.8, count:4, url:"https://uk.trustpilot.com/review/www.reuseabox.co.uk" },
    certs:[], priceNotes:["C4 Royal Mail PiP Large Letter Box £23.25 - £215.00 by quantity (captured Sept 2026)"], lead:null,
    prov:"Wave-2 addition, verified 2026-09-21 from first-party pages (reuseabox.co.uk product pages; 3 verbatim range rows). Ad-spend evidence: Google Ads Transparency Center (80 ads, GB); Meta check inconclusive — recorded as inconclusive, not claimed. Trustpilot receipt observed 2026-09-21 (3.8/4 — genuinely thin, flagged). Press: Sustainable Packaging News (2026-08 renewable-powered warehouse), Love Business East Midlands (2025-06 team expansion; 2025-01 ten-million-boxes milestone). Confidence: medium. Source: verify/pricing-candidates-C-eu-uk.json." },

  { id:"transpack", name:"Transpack (Transpack Packaging UK Ltd)", website:"https://www.transpack.co.uk", hq:"United Kingdom (family-owned wholesale packaging supplier; registered office not re-verified this session)", region:"UK",
    serves:"UK wholesale — positions for Etsy/Amazon/online retailers", modes:["stock"],
    about:"Deep postal/packaging catalogue (152 SKUs in postal alone) with explicit From/As-low-as per-unit tier strings, incl. biodegradable and recycled lines.",
    cat:["mailers","corrugated","compostables"],
    sample:{ t:null, verified:false, note:"No sample program recorded in the wave-2 research capture this session.", src:null },
    review:{ platform:"Trustpilot", score:4.2, count:16, url:"https://uk.trustpilot.com/review/transpack.co.uk" },
    certs:[], priceNotes:["A0 Postal Tubes £39.00 for 10, as low as £3.10/tube at top tier (captured Sept 2026)"], lead:null,
    prov:"Wave-2 addition — CAVEAT: transpack.co.uk is Cloudflare-gated; the 4 price rows come from first-party product text captured via Exa crawler cache on 2026-09-21, not a direct HTTP fetch or rendered browser pass, so confidence is marked lower. Ad-spend evidence: Google Ads Transparency Center (80 ads, GB); Meta not checked advertiser-specific this session. Trustpilot receipt observed 2026-09-21 (4.2/16 — thin, flagged honestly). No named CPG clients verified. Confidence: medium. Source: verify/pricing-candidates-C-eu-uk.json." },

  { id:"carton-service", name:"Carton Service (SAS Carton Service)", website:"https://www.cartonservice.fr", hq:"7 chemin de Vaubesnard, 91415 Dourdan, France (SAS, RCS Evry B 712 038 603)", region:"Europe",
    serves:"France — delivery 24/48h claimed (first continental-EU pass in wave-2)", modes:["stock"],
    about:"Long-established French packaging distributor/manufacturer (trading since 1958; claims 30,000+ deliveries/year) — ColomPac postal boxes, corrugated cases, bubble film, labels and tapes with published HT (ex-VAT) from-prices on product pages.",
    cat:["corrugated","mailers","labels"],
    sample:{ t:null, verified:false, note:"No sample program recorded in the wave-2 research capture this session.", src:null },
    review:{ platform:"Avis Vérifiés", score:4.4, count:234, url:"https://www.avis-verifies.com/avis-clients/cartonservice.fr" },
    certs:[], priceNotes:["Boîte postale renforcée ColomPac 230x166x90 mm from 1,25 € HT (captured Sept 2026)"], lead:null,
    prov:"Wave-2 addition, verified 2026-09-21 from first-party pages (cartonservice.fr product pages; 4 verbatim rows, French HT strings preserved). Ad-spend evidence: Google Ads Transparency Center (76 ads, FR); Meta snapshot unreadable — recorded as inconclusive, not claimed. Review receipt: no Trustpilot profile exists — Avis Vérifiés (certified French platform) 4.4/5 across 234 since 08/07/2021, observed 2026-09-21. No named CPG clients found. Confidence: high. Source: verify/pricing-candidates-C-eu-uk.json." },

  { id:"verpacking", name:"verpacking.com (RAPIDPACK GmbH)", website:"https://www.verpacking.com", hq:"Neuenhagener Chaussee 2, 15366 Hoppegarten, Germany (RAPIDPACK GmbH)", region:"Europe",
    serves:"Germany (Hoppegarten, Berlin metro area) — self-described 'Spezialist für Verpackungsmaterialien aus Berlin'", modes:["stock"],
    about:"German shipping-carton specialist (Fefco-coded boxes, DHL/Maxibrief formats, custom 'Kartons nach Maß') with full published quantity-tier price tables on product pages and strong paid-search presence in DE.",
    cat:["corrugated","mailers","pouches-bags"],
    sample:{ t:null, verified:false, note:"No sample program recorded in the wave-2 research capture this session.", src:null },
    review:{ platform:"Trustpilot", score:3.5, count:4, url:"https://www.trustpilot.com/review/verpacking.com" },
    certs:[], priceNotes:["Großbriefkarton DIN A6 ab 0,08 € pro Stück (at 195,000 Stück) (captured Sept 2026)"], lead:null,
    prov:"Wave-2 addition, verified 2026-09-21 from first-party pages (verpacking.com product pages; 4 verbatim rows, German decimal-comma strings preserved). Ad-spend evidence: Google Ads Transparency Center (80 ads, DE). Trustpilot receipt observed 2026-09-21 (3.5/4 — thin, shown as-is); the substantial base is Shopauskunft.de (4.86/5 across 1,460, 92% five-star) — noted here, kept out of the receipt because the wave-2 receipt slot holds the Trustpilot record. No named CPG clients found. Confidence: high. Source: verify/pricing-candidates-C-eu-uk.json." },

  { id:"viv-webshop", name:"VIV Verpakkingsindustrie Veenendaal (webshop.viv.nl)", website:"https://webshop.viv.nl", hq:"Veenendaal, Netherlands (Verpakkingsindustrie Veenendaal B.V.)", region:"Europe",
    serves:"Netherlands (Veenendaal webshop)", modes:["stock"],
    about:"Established Dutch packaging manufacturer/webshop — deep corrugated range (single/double wall, pallet boxes, custom 'Doos op maat', printed boxes) with published quantity-tier pricing (Staffelkorting).",
    cat:["corrugated"],
    sample:{ t:null, verified:false, note:"No sample program recorded in the wave-2 research capture this session.", src:null },
    review:{ platform:"Kiyoh", score:9.3, count:8734, url:"https://www.kiyoh.com/reviews/1043128/Webshop_viv_nl" },
    certs:[], priceNotes:["Single-wall box 302x220x150mm from € 0,43/piece, tiers to € 0,29 (captured Sept 2026)"], lead:null,
    prov:"Wave-2 addition, verified 2026-09-21 from first-party pages (webshop.viv.nl). Price-row caveat: displayed tier text proved unstable in headless rendering — row 1 comes from the product page's own embedded Magento tierPrices JSON (first-party published price data, exact internal precision preserved); rows 2-3 are verbatim rendered category-card tier blocks whose exact SKU mapping was not pinned (caveated per row in asset-data.js). Ad-spend evidence: Google Ads Transparency Center (80 ads, NL). Review receipt: Kiyoh (certified Dutch platform, profile 1043128) 9.3/10 across 8,734 via aggregateRating JSON-LD, observed 2026-09-21 — strongest review evidence in the EU batch; no Trustpilot profile found. No named CPG clients. Confidence: medium. Source: verify/pricing-candidates-C-eu-uk.json." },

  /* --- Batch D: India, China and global export --- */
  { id:"maruthi-plastics", name:"Maruthi Plastics & Packaging Chennai Pvt Ltd", website:"https://maruthiplastics.in", hq:"Chennai, Tamil Nadu, India (corporate office: Egmore; factory: Redhills)", region:"India",
    serves:"India (Chennai; own OngoMart online store)", modes:["stock"],
    about:"India manufacturer (est. 1985) with fully transparent quantity-tiered e-commerce pricing across stand-up pouches, corrugated boxes, thermal label rolls and aluminium pouches; food-grade SKUs and 125-165 micron retort/vacuum range fit CPG sellers.",
    cat:["pouches-bags","corrugated","labels","mailers","compostables"],
    sample:{ t:"stock_sample", verified:true, note:"Product pages carry a 'Buy samples' link ('If you're confused about which pouch size matches your requirements, then Buy samples'); sample pricing not captured this round.", src:"https://maruthiplastics.in/onlineproducts/matt-gold-standup-pouch-with-zipper-" },
    review:null,
    certs:[], priceNotes:["Kraft stand-up pouch ₹.2.83/pc at the 5,000-Above tier (captured Sept 2026)"], lead:null,
    prov:"Wave-2 addition, verified 2026-09-21 from first-party pages (maruthiplastics.in product pages; 5 verbatim INR tier rows, GST-exclusive context preserved per row). Ad-spend evidence: two Facebook Pixel IDs in site source (active Meta campaign tracking), Facebook/Instagram/LinkedIn pages linked from own footer, own OngoMart storefront. Reputation: marketplace-seller spec lines ('Flipkart Corrugated Boxes', 'Amazon Courier Bags') evidence supplying e-commerce sellers, NOT verified direct brand contracts; no Trustpilot presence — review:null. Confidence: medium (named CPG clients unverifiable this pass). Source: verify/pricing-candidates-D-asia-global.json." },

  { id:"cxpack", name:"Shenzhen Chengxing Packing & Material Co., Ltd. (CXPACK)", website:"https://www.cxpack.com", hq:"Shenzhen, Guangdong, China (109-5, Xinhe Rd, Pinghu St, Longgang)", region:"China",
    serves:"Export-oriented: claimed North America 30%, Western Europe 10%, Southern Europe 10%, Oceania 10%, rest multi-region", modes:["custom"],
    about:"Folding-carton manufacturer (founded 2004; brand Jack & Sunny) for cosmetics/perfume/skincare CPG end-uses — transparent USD range pricing with explicit MOQs on product pages, sample kits per company profile, and current third-party audits (Sedex 2026, BSCI 2025).",
    cat:["folding-cartons","labels","corrugated","mailers"],
    sample:{ t:"custom_sample", verified:true, note:"Own-site company profile states sample kits are available; from-50-pieces minimum order and 3-day lead time claim on profile page.", src:"https://www.cxpack.com/aboutus/37667.html" },
    review:null,
    certs:[], priceNotes:["Embossed cosmetic paper box $0.1-0.5 /Piece (captured Sept 2026)"], lead:"3-day lead time claim on company profile page (Sept 2026)",
    prov:"Wave-2 addition, verified 2026-09-21 from first-party pages (cxpack.com product pages; 5 verbatim USD range rows, per-piece units preserved). Ad-spend evidence: YouTube (@jackandsunny), Facebook, LinkedIn, TikTok and X accounts linked from own-site footers; Alibaba storefront contact + Trade Assurance payment accepted. Reputation: certifications listed on product pages (ISO 9001, BSCI 2025, Sedex 2026, RoHS, REACH, FSC pending) — self-published; no named CPG clients, no Trustpilot presence — review:null. Confidence: medium. Source: verify/pricing-candidates-D-asia-global.json." },

  { id:"cangzhou-yunfeng", name:"Cangzhou Yunfeng Packaging Products Co., Ltd.", website:"https://www.yunfengpackaging.com", hq:"Cangzhou city, Hebei Province, China", region:"China",
    serves:"Export: claimed US, Europe, South America, South Africa, Australia, New Zealand, Japan, Singapore", modes:["custom"],
    about:"38-year-old flexible-packaging manufacturer (est. 1986) with per-piece USD prices and explicit MOQs on its own English storefront — coffee bags with valves, pet-food eight-side-seal bags, stand-up pouches and poly mailers.",
    cat:["pouches-bags","rollstock","mailers","labels"],
    sample:{ t:"stock_sample", verified:true, note:"Free samples offered on product pages ('Free sample in stock, pls feel free to enquiry'; buyer pays delivery).", src:"https://www.yunfengpackaging.com/custom-flat-bottom-bag/63398718.html" },
    review:null,
    certs:[], priceNotes:["Custom Aluminum Foil Coffee Bean Pouch $0.05/pc at 10,000+ ($0.21 at 1,000-9,999) (captured Sept 2026)"], lead:null,
    prov:"Wave-2 addition, verified 2026-09-21 from first-party pages (yunfengpackaging.com English storefront; 5 verbatim rows incl. one quantity-tier row whose doubled displayed strings are preserved). Ad-spend evidence: official Alibaba storefront (yunfengpackaging.en.alibaba.com), own-site PR news section, 'Exhibition show' trade-show photos on product pages. Reputation: certifications claimed in site FAQ (ISO9001, SGS, BSCI, BRC) — self-published; no named CPG clients, no Trustpilot presence — review:null. Confidence: medium. Source: verify/pricing-candidates-D-asia-global.json." },

  { id:"dinolabel", name:"DinoLabelDigital", website:"https://dinolabeldigital.com", hq:"Gurugram, Haryana, India (285, Phase II, Udyog Vihar, Sector 20)", region:"India",
    serves:"India (Gurugram; Shopify storefront)", modes:["custom"],
    about:"Digitally printed roll labels with fully transparent INR pricing, low MOQ (1,000 pcs), label prototyping service and digital proofs before printing — strong fit for startup CPG sellers.",
    cat:["labels"],
    sample:{ t:"custom_sample", verified:true, note:"Label Prototyping Service and label samples offered ('option to test with label samples'); digital proofs before printing.", src:"https://dinolabeldigital.com/" },
    review:null,
    certs:[], priceNotes:["Food & Beverage Labels Rs. 1,040.00 per 1000 pcs (captured Sept 2026)"], lead:null,
    prov:"Wave-2 addition, verified 2026-09-21 from first-party pages (dinolabeldigital.com; 4 verbatim Rs. from-price rows with the Rs. 560.00 compare-at string preserved on row 1). Ad-spend evidence: Instagram and YouTube channels linked from own-site footer, Shopify storefront with social-login integrations. Reputation: 28 on-site reviews (small/home brands); homepage 'Trusted by' logo strip not extractable — no named CPG clients verified; FSC-approved-materials claim is self-published. No third-party review platform receipt — review:null. Confidence: medium. Source: verify/pricing-candidates-D-asia-global.json." },

  { id:"swisspac", name:"Swiss Pac Pvt. Ltd. (Swisspac India)", website:"https://www.swisspack.co.in", hq:"Vadodara, Gujarat, India (plant: Jambusar Highway, Dabhasa; offices Mumbai, Noida, Bengaluru)", region:"India",
    serves:"India + claimed exports to 70+ countries; operations claimed in Canada, Australia, Mexico, Singapore and Europe", modes:["stock"],
    about:"Flexible-packaging manufacturer (claims 40+ years) with an own Magento store publishing INR price ranges with online checkout across stock stand-up pouch sizes (kraft, foil and flat-bottom, with valve, for coffee and food) plus a compostable/recyclable materials catalog.",
    cat:["pouches-bags","rollstock","labels","compostables"],
    sample:{ t:"stock_sample", verified:true, note:"Dedicated sample dispatch operation ('tracking number of samples and order dispatch schedule' support lines, dispatch2@swisspac.com).", src:"https://www.swisspack.co.in/" },
    review:null,
    certs:[], priceNotes:["Kraft Paper Stand Up Pouches With Valve ₹6.55 - ₹15.86 by size (captured Sept 2026)"], lead:null,
    prov:"Wave-2 addition, verified 2026-09-21 from first-party pages (swisspack.co.in; 3 verbatim INR range rows across stock sizes). Ad-spend evidence: PACK EXPO Southeast 2025 exhibitor (official show directory), PlastIndia press, industry press on HP Indigo 25K and Flexcel NX equipment investments, own catalog PDF on first-party domain, LinkedIn + Pinterest presence. Reputation: awards self-published in own catalog PDF (not independently verified); 'TRUSTED BY BRANDS' strip not extractable — no named CPG clients verified; no Trustpilot presence — review:null. Confidence: high (batch's strongest evidence set). Source: verify/pricing-candidates-D-asia-global.json." },
];

/* ------------------------------------------------------------------ */
/* EXCLUDED SUPPLIERS — auditable exclusion record                     */
/* Nothing here renders anywhere; kept so the decision is reviewable.  */
/* ------------------------------------------------------------------ */
const EXCLUDED_SUPPLIERS = [
  { name:"Uline", reason:"Trustpilot 2.1 with 291 reviews (AI summary: most reviewers unhappy) — fails the well-reviewed bar. BBB A+ is complaint-handling, not sentiment, and is not review-based.", src:"https://www.trustpilot.com/review/www.uline.com" },
  { name:"Lumi", reason:"Trustpilot 1.9 with 12 reviews, 100% 1-star, unclaimed profile — fails the well-reviewed bar. Site also unreadable (JS-rendered).", src:"https://www.trustpilot.com/review/lumi.com" },
  { name:"Fantastapack", reason:"Trustpilot 2.1 with 17 reviews, no replies to negatives — fails the well-reviewed bar despite BBB A+.", src:"https://www.trustpilot.com/review/fantastapack.com" },
  { name:"Packaroo", reason:"Identity ambiguous: packaroo.design is software, packaroo.shop is a UK cups supplier — Aekovera partner identity unconfirmed. Do not list until confirmed.", src:"https://packaroo.shop" },
  { name:"Sabina Manufacturing", reason:"Domain sabinamfg.com is parked and listed for sale — web presence not verifiable. Confirm current URL with Aekovera before listing.", src:"https://sabinamfg.com" },
  { name:"Qorpak — note", reason:"NOT excluded from listings (listed as Berlin Packaging division), but flagged: duplicate coverage with Berlin Packaging; treated as a division, not an independent network.", src:"https://www.qorpak.com" },
  { name:"Research-stage drops (never candidates)", reason:"Mold-Tek (hosting suspended), Parikh Packaging (spam content), Huhtamaki India (JS-only pages), SPS Polypack / Shree Shyam / Mangla Polypack (below quality bar), Reliable Packaging Raipur (snippets only) — documented in the India & China research doc.", src:"art_6XTcxoI0" },
];

/* ------------------------------------------------------------------ */
/* Source-verified price/MOQ overrides — [specKey, supplierIndex,      */
/* price, MOQ] tuples get these baked in by LISTINGS_BUILT.            */
/* Keys: "<specKey>:<supplierId>". Only research-verified facts.       */
/* ------------------------------------------------------------------ */
const OVERRIDES = {
  "pouches-bags--custom:bowepack": { priceNote:"No minimum quantity — $300 minimum order value (verified Sept 2026)", lead:"Rollstock 5–7 days · pouches 10–15 days after art approval" },
  "pouches-bags--custom:packiro": { moq:500, moqNote:"MOQ 500 (supplier-published, Sept 2026)" },
  "glass-bottles--custom:unipack-glass": { priceFrom:0.10, priceTo:10, moq:30000, moqNote:"MOQ 30,000–50,000 pcs standard bottles (Made-in-China listings, Sept 2026)" },
  "glass-bottles--stock:tricorbraun": { moqNote:"No MOQ on stock orders (shop FAQ, Sept 2026)" },
  "glass-jars--stock:tricorbraun": { moqNote:"No MOQ on stock orders (shop FAQ, Sept 2026)" },
  "droppers-vials--stock:sks": { price:0.40, moqNote:"Sold in case packs — observed case sizes 48–298 pcs across SKS vial lines (re-audit 2026-09-19); exact per-item minimum: see catalog or ask supplier", priceNote:"30 ml amber euro dropper — $0.40/pc (SKS catalog, Sept 2026; case sizes vary by item)" },
  "folding-cartons--custom:packlane": { moq:25, moqNote:"MOQ 25 paperboard cartons (Packlane support, re-verified 2026-09-19)" },
  "mailers--custom:packlane": { moq:1, moqNote:"MOQ 1 for corrugated mailers (Packlane support, re-verified 2026-09-19)" },
  "folding-cartons--custom:packwire": { moq:500, moqNote:"MOQ 500 folding / 10 mailers (supplier FAQ, Sept 2026)" },
  "folding-cartons--custom:arka": { moq:250, moqNote:"250 custom-size (Arka FAQ, re-verified 2026-09-19); standard-size cartons 25" },
  "folding-cartons--custom:noissue": { moqNote:"Per-product MOQ — noissue help center: lowest MOQ always listed online in the catalog (catalog is browser-rendered; not publicly readable in the 2026-09-19 audit)" },
  "mailers--custom:noissue": { moqNote:"Per-product MOQ — see noissue catalog; lowest MOQ always listed online (help center, 2026-09-19 audit)" },
  "brand-accessories--custom:noissue": { moqNote:"Per-product MOQ — see noissue catalog; lowest MOQ always listed online (help center, 2026-09-19 audit)" },
  "folding-cartons--custom:packhelp": { moq:30, moqNote:"Min order 30 pieces (Packhelp, Sept 2026)" },
  "folding-cartons--custom:packly": { moq:1, moqNote:"No minimum order quantity (Packly, Sept 2026)" },
  "folding-cartons--custom:selfpackaging": { moq:1, moqNote:"No minimum order (SelfPackaging, Sept 2026)" },
  "mailers--custom:packwire": { moq:10, moqNote:"MOQ 10 (supplier FAQ, Sept 2026)" },
  "mailers--custom:arka": { moq:1, moqNote:"Branded mailer boxes from 1 unit · poly mailers 1,000–10,000 (Arka FAQ, Sept 2026)" },
  "brand-accessories--custom:arka": { moq:100, moqNote:"Stickers from 100 · tissue from 5 units · tape 24+ rolls (Arka FAQ, Sept 2026)" },
  "labels--custom:consolidated-label": { moqNote:"Exact-quantity digital — no plate charges (Sept 2026)" },
  "metal-tins--custom:glory-tins": { moqNote:"Thousands of units for printed tins; 6,000+ existing molds (Sept 2026)" },
  "metal-tins--stock:glory-tins": { moqNote:"Case-level stock shapes from 6,000+ public molds (Sept 2026)" },
  "glass-bottles--stock:sks": { priceNote:"16 oz amber Boston round example $40.09/case (TricorBraun shop; SKS bulk cases 432/cs, Sept 2026)" },
};

/* ------------------------------------------------------------------ */
/* LISTINGS — [specKey, supplierIndex, price, MOQ] tuples, built       */
/* from supplier→category edges (single source of truth) with          */
/* research-verified overrides merged in. LISTINGS_BUILT derives the   */
/* render objects.                                                     */
/* ------------------------------------------------------------------ */
function buildListings() {
  const rows = [];
  SUPPLIERS.forEach(function(s, si) {
    s.cat.forEach(function(slug) {
      ["stock", "custom"].forEach(function(mode) {
        const key = slug + "--" + mode;
        if (!SPECS[key] || !s.modes || s.modes.indexOf(mode) === -1) return;
        const ov = OVERRIDES[key + ":" + s.id] || {};
        rows.push([key, si, ov.price !== undefined ? ov.price : null, ov.moq !== undefined ? ov.moq : null]);
      });
    });
  });
  return rows;
}
const LISTINGS = buildListings();

const LISTINGS_BUILT = LISTINGS.map(function(row, i) {
  const spec = SPECS[row[0]];
  const sup = SUPPLIERS[row[1]];
  const ov = OVERRIDES[row[0] + ":" + sup.id] || {};
  return {
    id: "L" + String(i + 1).padStart(3, "0"),
    specKey: row[0],
    supplierIndex: row[1],
    supplierId: sup.id,
    price: row[2],
    priceFrom: ov.priceFrom !== undefined ? ov.priceFrom : null,
    priceTo: ov.priceTo !== undefined ? ov.priceTo : null,
    priceNote: ov.priceNote || null,
    moq: row[3],
    moqNote: ov.moqNote || null,
    lead: ov.lead || sup.lead || null,
    offerType: spec.type,
    spec: spec,
    supplier: sup,
  };
});

/* Category image mapping (9 white-background photos reused from v0.2) */
const IMG_BY_KEY = {
  pouches:"kraft-pouches.png", pump:"pump-bottles.png", tubs:"plastic-tubs.png",
  cans:"tin-cans.png", boxes:"mailer-boxes.png", rigid:"rigid-boxes.png",
  labels:"label-rolls.png", jars:"mason-jars.png", amber:"amber-bottles.png",
  tubes:"squeeze-tubes.png", closures:"closures-caps.png", alcans:"aluminum-cans.png",
  thermoform:"thermoform-trays.png", droppers:"dropper-vials.png", cr:"child-resistant.png",
  sustainable:"sustainable-packaging.png",
};

/* Regions for filter */
const REGIONS = ["USA", "UK", "Europe", "India", "China"];
const MATERIALS = ["Glass", "Plastic", "Paper", "Metal", "Film"];

/* Collect all certifications used by listed suppliers (for the filter) */
const CERT_FILTERS = (function() {
  const set = {};
  SUPPLIERS.forEach(function(s) {
    (s.certs || []).forEach(function(c) {
      const base = c.n.replace(" (claimed)", "").replace(" (claimed, independently audited per site)", "");
      set[base] = true;
    });
  });
  return Object.keys(set).sort();
})();
