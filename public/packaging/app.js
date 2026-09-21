/* ============================================================
   Aekovera Packaging Marketplace — v3 app
   Honest marketplace: attributed review receipts, source-gated
   samples, offer-type honesty, unknowns stay unknown.
   ============================================================ */
(function () {
  "use strict";

  /* ---------------- helpers ---------------- */
  var COLLECTED = "Sept 2026";
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function money(n) { return "$" + Number(n).toLocaleString("en-US"); }
  function $(sel) { return document.querySelector(sel); }

  var TAX_BY_SLUG = {};
  TAXONOMY.forEach(function (t) { TAX_BY_SLUG[t.slug] = t; });

  var L_BY_ID = {};
  LISTINGS_BUILT.forEach(function (l) { L_BY_ID[l.id] = l; });
  var S_BY_ID = {};
  SUPPLIERS.forEach(function (s) { S_BY_ID[s.id] = s; });

  /* Genuine-asset layer (asset-data.js, captured 2026-09-19 from supplier live sites):
     prices[supplierId][category] = verbatim dated price rows with deep source URLs;
     photos[supplierId] = supplier-owned product images (attributed, never re-hosted);
     noPublishedPriceFor[supplierId] = categories where the supplier publishes no price.
     Access-blocked suppliers (kaufman, raja) have neither rows nor a quote-flag — absence
     was not established, so they render as unpublished, not quote-verified. */
  var ASSETS = (typeof window !== "undefined" && window.ASSET_DATA) || { meta: {}, prices: {}, photos: {}, noPublishedPriceFor: {} };
  var CAPTURED = ASSETS.meta.captured || "2026-09-19";
  function assetPriceRows(sid, cat) { return (ASSETS.prices[sid] && ASSETS.prices[sid][cat]) || []; }
  function assetPhotos(sid) { return ASSETS.photos[sid] || []; }
  function hotlinkPhotos(sid) { return assetPhotos(sid).filter(function (p) { return p.hotlinkable; }); }
  function noPubFor(sid, cat) { return !!(ASSETS.noPublishedPriceFor[sid] && ASSETS.noPublishedPriceFor[sid].indexOf(cat) !== -1); }
  function genuinePhotoFor(l) {
    var ph = hotlinkPhotos(l.supplierId);
    if (!ph.length) return null;
    var n = parseInt(l.id.slice(1), 10) || 0;
    return ph[n % ph.length];
  }
  function genuineImgTag(l, img) {
    var g = genuinePhotoFor(l);
    if (!g) return null;
    return '<img src="' + esc(g.url) + '" alt="Genuine product photo from ' + esc(l.supplier.name) + ': ' + esc(g.product || g.alt || "packaging product") + '" loading="lazy"' +
      (img ? ' onerror="App.imgFallback(this,\'' + esc(img) + '\')"' : "") + ">";
  }

  var CAT_COUNTS = {};
  LISTINGS_BUILT.forEach(function (l) {
    CAT_COUNTS[l.spec.cat] = (CAT_COUNTS[l.spec.cat] || 0) + 1;
  });

  /* Category imagery: reuse the nine white-background photos only where the
     packaging style genuinely maps; everything else gets a typographic tile. */
  var CAT_IMG_EXTRA = {
    "folding-cartons": "rigid",
    "corrugated": "boxes",
    "droppers-vials": "amber",
    "pumps-dispensers": "pump"
  };
  function catImg(t) {
    var key = t.img || CAT_IMG_EXTRA[t.slug];
    return key && IMG_BY_KEY[key] ? "img/" + IMG_BY_KEY[key] : null;
  }
  function catGlyph(t) {
    var w = (t.short || t.label).split(/\s+/);
    return ((w[0] || "?")[0] + (w[1] ? w[1][0] : "")).toUpperCase();
  }
  function specImg(spec) { var t = TAX_BY_SLUG[spec.cat]; return t ? catImg(t) : null; }
  function specGlyph(spec) { var t = TAX_BY_SLUG[spec.cat]; return t ? catGlyph(t) : "PK"; }

  /* ---------------- offer-type honesty ----------------
     Stock  = ready-made, bought as-is (price shown only if research-verified)
     Custom = made to your artwork (verified price floor where one exists)
     Quote-only = the only honest path is a quote — no price is published   */
  function offerKind(l) {
    if (l.offerType === "Stock") return "Stock";
    if (l.price != null || l.priceFrom != null || l.priceNote) return "Custom";
    return "Quote-only";
  }
  function kindBadge(kind) {
    var cls = kind === "Stock" ? "kind-stock" : (kind === "Custom" ? "kind-custom" : "kind-quote");
    return '<span class="badge ' + cls + '">' + esc(kind) + "</span>";
  }
  function priceMain(l) {
    if (l.price != null) return { big: money(l.price), per: "per unit" };
    if (l.priceFrom != null) return { big: money(l.priceFrom) + "–" + money(l.priceTo), per: "per unit range" };
    if (l.priceNote) return { note: l.priceNote };
    return null;
  }
  function moqText(l) {
    if (l.moqNote) return l.moqNote;
    if (l.moq != null) return "MOQ " + Number(l.moq).toLocaleString("en-US") + " pieces";
    if (l.spec.moq) return l.spec.moq;
    return "Ask the supplier";
  }
  function leadText(l) { return l.lead || "Ask the supplier"; }

  /* ---------------- review receipts ----------------
     Every rating is a receipt: platform + score + count + collection date +
     deep link. No verified reviews → say so. Never mirror review text. */
  function ratingReceipt(sup) {
    if (!sup.review) return '<span class="rating none">No verified reviews yet</span>';
    var r = sup.review;
    return '<a class="rating" href="' + esc(r.url) + '" target="_blank" rel="noopener" title="Review receipt — opens ' + esc(r.platform) + ' in a new tab">' +
      '<span class="stars">' + esc(r.score.toFixed(1)) + " ★</span> " + esc(r.platform) +
      ' · <span class="cnt">' + Number(r.count).toLocaleString("en-US") + " reviews</span>" +
      ' · <span class="date">' + COLLECTED + "</span></a>";
  }

  /* ---------------- samples: source-gated ---------------- */
  function sampleOk(sup) { return !!(sup.sample && sup.sample.verified && sup.sample.src); }

  /* ---------------- state ---------------- */
  var state = {
    q: "",
    f: { region: [], mat: [], kind: [], sample: false, certs: [] },
    sort: "featured",
    compare: []
  };
  var MAX_COMPARE = 4;

  function clearFilters() {
    state.f = { region: [], mat: [], kind: [], sample: false, certs: [] };
  }

  function matchesFilters(l, skip) {
    var f = state.f;
    if (!skip && state.q) {
      var q = state.q.toLowerCase();
      var t = TAX_BY_SLUG[l.spec.cat];
      var hay = (l.spec.name + " " + l.spec.materials + " " + l.spec.use + " " + l.spec.sizes + " " +
        l.supplier.name + " " + l.supplier.region + " " + t.label + " " + t.short).toLowerCase();
      if (hay.indexOf(q) === -1) return false;
    }
    if (skip !== "region" && f.region.length && f.region.indexOf(l.supplier.region) === -1) return false;
    if (skip !== "mat" && f.mat.length && f.mat.indexOf(l.spec.mat) === -1) return false;
    if (skip !== "kind" && f.kind.length && f.kind.indexOf(offerKind(l)) === -1) return false;
    if (skip !== "sample" && f.sample && !sampleOk(l.supplier)) return false;
    if (skip !== "cert" && f.certs.length) {
      var any = f.certs.some(function (fc) {
        return valueMatches(l, "cert", fc);
      });
      if (!any) return false;
    }
    return true;
  }

  function sortRows(rows) {
    var s = state.sort;
    var featuredScore = function (l) {
      return (l.price != null || l.priceFrom != null || l.priceNote ? 4 : 0) +
        (sampleOk(l.supplier) ? 2 : 0) + (l.supplier.review ? 1 : 0);
    };
    return rows.slice().sort(function (a, b) {
      if (s === "reviews") {
        return ((b.supplier.review || {}).count || -1) - ((a.supplier.review || {}).count || -1);
      }
      if (s === "rating") {
        var as = a.supplier.review ? a.supplier.review.score : -1;
        var bs = b.supplier.review ? b.supplier.review.score : -1;
        return bs - as || ((b.supplier.review || {}).count || 0) - ((a.supplier.review || {}).count || 0);
      }
      if (s === "name") return a.spec.name.localeCompare(b.spec.name) || a.supplier.name.localeCompare(b.supplier.name);
      return featuredScore(b) - featuredScore(a) || a.spec.name.localeCompare(b.spec.name);
    });
  }

  function valueMatches(l, name, v) {
    if (name === "region") return l.supplier.region === v;
    if (name === "mat") return l.spec.mat === v;
    if (name === "kind") return offerKind(l) === v;
    if (name === "cert") {
      var supCerts = (l.supplier.certs || []).map(function (c) {
        return c.n.replace(" (claimed)", "").replace(" (claimed, independently audited per site)", "");
      });
      return supCerts.some(function (sc) { return sc.indexOf(v) > -1; });
    }
    return false;
  }

  /* Count for one facet VALUE: rows that pass every other filter group and match this value. */
  function facetCount(rows, facet, val) {
    return rows.filter(function (l) { return matchesFilters(l, facet) && valueMatches(l, facet, val); }).length;
  }

  /* ---------------- shared renderers ---------------- */
  function priceFact(l) {
    var rows = assetPriceRows(l.supplierId, l.spec.cat);
    if (rows.length) {
      var first = rows[0];
      var prod = first.product && first.product.length > 42 ? first.product.slice(0, 42) + "…" : (first.product || "");
      return '<div class="f"><span>Price</span><b><span class="num">' + esc(first.priceVerbatim) + '</span> <span class="from">published' + (prod ? " · " + esc(prod) : "") + " (" + esc(first.dateCaptured) + ")</span></b></div>";
    }
    var pm = priceMain(l);
    if (pm && pm.big) return '<div class="f"><span>Price</span><b><span class="num">' + esc(pm.big) + '</span> <span class="from">' + esc(pm.per) + "</span></b></div>";
    if (pm && pm.note) return '<div class="f"><span>Price</span><b>' + esc(pm.note) + "</b></div>";
    return '<div class="f"><span>Price</span><b>Request quote</b></div>';
  }
  function moqFact(l) {
    return '<div class="f"><span>Minimums</span><b>' + esc(moqText(l)) + "</b></div>";
  }
  function leadFact(l) {
    return '<div class="f"><span>Lead time</span><b>' + esc(leadText(l)) + "</b></div>";
  }

  function card(l) {
    var kind = offerKind(l);
    var img = specImg(l.spec);
    var genuine = genuineImgTag(l, img);
    var checked = state.compare.indexOf(l.id) >= 0;
    return '<article class="card">' +
      '<div class="badges">' + kindBadge(kind) +
        (genuine ? '<span class="badge genuine" title="Genuine product photo from the supplier\'s own site — attributed, never re-hosted">Genuine photo</span>' : "") +
        (sampleOk(l.supplier) ? '<span class="badge sample" title="Sample program verified on the supplier\'s own site (' + COLLECTED + ')">Sample available</span>' : "") +
      "</div>" +
      '<label class="compare-check" title="Add to comparison"><input type="checkbox" aria-label="Compare ' + esc(l.spec.name) + ' from ' + esc(l.supplier.name) + '"' +
        (checked ? " checked" : "") + ' onchange="App.toggleCompare(\'' + l.id + '\')">Compare</label>' +
      '<a class="thumb" href="#/l/' + l.id + '">' +
        (genuine ? genuine : (img ? '<img src="' + img + '" alt="Illustrative photo of the ' + esc(l.spec.name) + ' packaging style">' : '<span class="glyph">' + esc(specGlyph(l.spec)) + "</span>")) +
      "</a>" +
      '<div class="body">' +
        '<a class="name" href="#/l/' + l.id + '">' + esc(l.spec.name) + "</a>" +
        '<div class="sub">' + esc(l.supplier.name) + " · " + esc(l.supplier.region) + "</div>" +
        ratingReceipt(l.supplier) +
        '<div class="facts">' + priceFact(l) + moqFact(l) + leadFact(l) + "</div>" +
        '<div class="cta-row">' +
          '<button class="btn btn-primary sm" onclick="App.openQuote(\'' + l.id + '\')">Request quote</button>' +
          (sampleOk(l.supplier) ? '<button class="btn btn-secondary" onclick="App.openSample(\'' + l.supplier.id + '\')">Sample</button>' : "") +
        "</div>" +
      "</div>" +
    "</article>";
  }

  function grid(list) {
    if (!list.length) {
      return '<div class="empty"><h3>No offers match</h3><p>Try removing a filter — or clear everything to see the full catalog.</p>' +
        '<button class="btn btn-secondary" onclick="App.clearAll()">Clear search &amp; filters</button></div>';
    }
    return '<div class="grid">' + list.map(card).join("") + "</div>";
  }

  function moqExplainer(slug, compact) {
    var t = TAX_BY_SLUG[slug];
    if (!t) return "";
    return '<div class="callout info moq-note"><div class="c-icon">i</div><div>' +
      "<h3>New to sourcing " + esc(t.short.toLowerCase()) + "? Here's why minimums vary</h3>" +
      "<p><b>Typical MOQs: " + esc(t.moqTypical) + ".</b> " + esc(t.why) +
      (t.unit === "kg" ? " This category is sold <b>by the kilogram</b> (rollstock film), not per piece — one quote covers thousands of bags' worth of film." : "") +
      "</p></div></div>";
  }

  function provBlock(sup) {
    return '<div class="prov"><div class="prov-title">Data provenance</div><ul><li>' + esc(sup.prov || "Manual enrichment from the supplier's own website, " + COLLECTED + ".") + "</li>" +
      '<li><span class="ok-tag">Verified:</span> supplier identity, website, categories, sample terms (where shown), review receipts.</li>' +
      '<li><span class="uk-tag">Not verified:</span> anything marked "Ask the supplier" or "Not published" — Aekovera does not infer missing data.</li>' +
      '<li>No content on this platform is scraped; entries are dated manual enrichment with source links.</li></ul></div>';
  }

  function certPills(sup, withNote) {
    var certs = sup.certs || [];
    if (!certs.length) return '<div class="pills"><span class="pill">No certifications published</span></div>';
    var html = '<div class="pills">' + certs.map(function (c) {
      var claim = /\(claimed/.test(c.n);
      return '<span class="pill ' + (claim ? "claim" : "ok") + '" title="' + esc(c.src || "Source not recorded") + '">' + esc(c.n) + "</span>";
    }).join("");
    if (sup.badges && sup.badges.length) {
      html += sup.badges.map(function (b) { return '<span class="pill" title="Marketplace / platform badge (' + COLLECTED + ')">' + esc(b) + "</span>"; }).join("");
    }
    html += "</div>";
    if (withNote) html += '<p class="panel-note" style="margin-top:8px">Shown exactly as published by the supplier. "(claimed)" = supplier statement without independent verification this session.</p>';
    return html;
  }

  function crumbs(items) {
    return '<nav class="crumbs" aria-label="Breadcrumb">' + items.map(function (it, i) {
      var last = i === items.length - 1;
      return last ? '<span class="here">' + esc(it.t) + "</span>" : '<a href="' + it.h + '">' + esc(it.t) + '</a><span class="sep">›</span>';
    }).join("") + "</nav>";
  }

  /* ---------------- views ---------------- */
  function viewHome() {
    var nSup = SUPPLIERS.length, nOff = LISTINGS_BUILT.length, nCat = TAXONOMY.length;
    var nSample = SUPPLIERS.filter(sampleOk).length;
    var nRev = SUPPLIERS.filter(function (s) { return s.review; }).length;

    var catTiles = TAXONOMY.map(function (t) {
      var img = catImg(t);
      return '<a class="cat-tile" href="#/cat/' + t.slug + '">' +
        '<div class="thumb">' + (img ? '<img src="' + img + '" alt="">' : '<span class="glyph">' + esc(catGlyph(t)) + "</span>") + "</div>" +
        '<div class="meta"><div class="name">' + esc(t.label) + '</div><div class="cnt">' + (CAT_COUNTS[t.slug] || 0) + " offers</div></div></a>";
    }).join("");

    var results = "";
    if (state.q) {
      var rows = sortRows(LISTINGS_BUILT.filter(function (l) { return matchesFilters(l); }));
      results = '<section class="section"><div class="section-head"><h2>Results for “' + esc(state.q) + '”</h2>' +
        '<span class="result-count" style="padding:0"><b>' + rows.length + "</b> offers</span></div>" +
        (rows.length ? '<div class="grid">' + rows.slice(0, 8).map(card).join("") + "</div>" +
          (rows.length > 8 ? '<div style="margin-top:16px"><a class="btn btn-secondary" href="#/cat/all">See all ' + rows.length + " results</a></div>" : "")
          : '<div class="empty"><h3>Nothing matches “' + esc(state.q) + '”</h3><p>Try a broader term — e.g. “pouch”, “jar”, “label”, “carton”.</p></div>') +
        "</section>";
    }

    var featured = sortRows(LISTINGS_BUILT.slice()).slice(0, 8);

    var revSup = SUPPLIERS.filter(function (s) { return s.review; })
      .sort(function (a, b) { return b.review.count - a.review.count; }).slice(0, 8);
    var supCards = revSup.map(function (s) {
      return '<article class="card"><div class="body" style="flex:1">' +
        '<a class="name" href="#/sup/' + s.id + '">' + esc(s.name) + "</a>" +
        '<div class="sub">' + esc(s.hq) + " · " + esc(s.region) + "</div>" +
        ratingReceipt(s) +
        '<div class="facts"><div class="f"><span>Coverage</span><b>' + s.cat.length + " categories</b></div>" +
        '<div class="f"><span>Samples</span><b>' + (sampleOk(s) ? "Verified program" : "Ask the supplier") + "</b></div></div>" +
        '<div class="cta-row"><a class="btn btn-secondary" href="#/sup/' + s.id + '">View supplier</a>' +
        (sampleOk(s) ? '<button class="btn btn-ghost" onclick="App.openSample(\'' + s.id + '\')">Sample terms</button>' : "") +
        "</div></div></article>";
    }).join("");

    $("#app").innerHTML =
      '<section class="hero"><div class="wrap">' +
        '<span class="kicker">Aekovera Marketplace · v3 prototype</span>' +
        "<h1>Real packaging suppliers, <em>honestly</em> presented.</h1>" +
        '<p class="sub">Every supplier, rating and sample offer below was verified from the supplier\'s own website in ' + COLLECTED +
        '. Where something isn\'t published, we say “ask the supplier” instead of guessing.</p>' +
        '<div class="hero-cta"><a class="btn btn-primary" href="#/cat/all">Browse all categories</a>' +
          '<a class="btn btn-secondary" href="#verified" onclick="document.getElementById(\'verified\').scrollIntoView({behavior:\'smooth\'});return false">What “verified” means</a></div>' +
        '<div class="hero-stats">' +
          '<div class="hero-stat"><div class="num">' + nCat + '</div><div class="lbl">packaging categories</div></div>' +
          '<div class="hero-stat"><div class="num">' + nSup + '</div><div class="lbl">verified suppliers</div></div>' +
          '<div class="hero-stat"><div class="num">' + nOff + '</div><div class="lbl">live offers</div></div>' +
          '<div class="hero-stat"><div class="num">' + nRev + ' <em>reviewed</em></div><div class="lbl">' + nSample + " with verified sample programs</div></div>" +
        "</div>" +
      "</div></section>" +

      '<section class="wrap" style="padding-bottom:10px" id="verified"><div class="callout"><div class="c-icon">✓</div><div>' +
        "<h3>What “verified” means here</h3><p>Ratings are <b>attributed receipts</b> — platform, score, review count and a link, collected " + COLLECTED +
        ' — never copied review text. “Order sample” appears <b>only</b> when the supplier\'s own site confirms a sample program. Suppliers with poor verified review records are excluded entirely. Nothing is scraped; nothing is invented.</p>' +
      "</div></div></section>" +

      results +

      '<section class="section wrap"><div class="section-head"><h2>Browse all categories</h2><span class="more muted">25 categories from the CPG packaging taxonomy</span></div>' +
        '<div class="cat-grid">' + catTiles + "</div></section>" +

      '<section class="section wrap"><div class="section-head"><h2>Featured offers</h2><span class="more"><a href="#/cat/all">See everything</a></span></div>' +
        grid(featured) + "</section>" +

      '<section class="section wrap"><div class="callout info"><div class="c-icon">i</div><div>' +
        "<h3>First time buying packaging? Read this first</h3>" +
        "<p><b>MOQ means minimum order quantity</b> — the smallest run a supplier will produce. It varies enormously by category: rollstock film is priced <b>per kilogram</b> with minimums in the hundreds of kg, while cartons are priced <b>per piece</b> with digital-print minimums from just 1–30 units. Stock items ship by the case with no tooling at all. Every category page shows its typical range before you browse.</p>" +
      "</div></div></section>" +

      '<section class="section wrap"><div class="section-head"><h2>How sourcing works</h2></div><div class="steps">' +
        '<div class="step"><span class="n">STEP 1</span><h3>Find your format</h3><p>Browse 25 categories, filter by region, material and offer type — stock, custom or quote-only.</p></div>' +
        '<div class="step"><span class="n">STEP 2</span><h3>Request a quote</h3><p>Share quantity, size and artwork status. Suppliers typically respond within 2 business days.</p></div>' +
        '<div class="step"><span class="n">STEP 3</span><h3>Order a sample (when verified)</h3><p>Where the supplier\'s own site confirms a sample program, you can check quality before committing.</p></div>' +
        '<div class="step"><span class="n">STEP 4</span><h3>Approve a proof, then order</h3><p>Printed runs start with a proof sign-off. Tooling, plates and cylinder fees are quoted separately.</p></div>' +
      "</div></section>" +

      '<section class="section wrap"><div class="section-head"><h2>Suppliers with verified reviews</h2><span class="more muted">ratings link to their source</span></div>' +
        '<div class="grid">' + supCards + "</div></section>";
  }

  function toolbar(rows, catTitle) {
    var f = state.f;
    function facetGroup(name, values, active) {
      return values.map(function (v) {
        var n = facetCount(rows, name, v);
        var on = active.indexOf(v) >= 0;
        return '<label class="facet' + (on ? " on" : "") + '"><input type="checkbox" ' + (on ? "checked" : "") +
          ' onchange="App.toggleFacet(\'' + name + "','" + esc(v) + '\')">' + esc(v) + ' <span class="n">' + n + "</span></label>";
      }).join("");
    }
    var certList = Object.keys(CERT_FILTERS).sort();
    var html = '<div class="toolbar wrap" style="max-width:var(--wrap)">' +
      '<button class="chip-btn' + (f.sample ? " on" : "") + '" onclick="App.toggleSampleFilter()">' +
        "Sample program verified" + (f.sample ? " ✓" : "") + "</button>" +
      '<button class="chip-btn' + (f.region.length ? " on" : "") + '" data-pop="f-region">Region' + (f.region.length ? " · " + f.region.length : "") + ' <span class="chev">▾</span></button>' +
      '<button class="chip-btn' + (f.mat.length ? " on" : "") + '" data-pop="f-mat">Material' + (f.mat.length ? " · " + f.mat.length : "") + ' <span class="chev">▾</span></button>' +
      '<button class="chip-btn' + (f.kind.length ? " on" : "") + '" data-pop="f-kind">Offer type' + (f.kind.length ? " · " + f.kind.length : "") + ' <span class="chev">▾</span></button>' +
      '<button class="chip-btn' + (f.certs.length ? " on" : "") + '" data-pop="f-cert">Certifications' + (f.certs.length ? " · " + f.certs.length : "") + ' <span class="chev">▾</span></button>' +
      ((f.region.length || f.mat.length || f.kind.length || f.certs.length || f.sample || state.q) ?
        '<button class="btn btn-ghost" onclick="App.clearAll()">Clear all</button>' : "") +
      '<div class="sort-row"><label class="muted" style="font-size:.84rem">Sort</label><select onchange="App.setSort(this.value)" aria-label="Sort offers">' +
        '<option value="featured"' + (state.sort === "featured" ? " selected" : "") + '>Featured</option>' +
        '<option value="rating"' + (state.sort === "rating" ? " selected" : "") + ">Highest rated</option>" +
        '<option value="reviews"' + (state.sort === "reviews" ? " selected" : "") + ">Most reviewed</option>" +
        '<option value="name"' + (state.sort === "name" ? " selected" : "") + ">Name A–Z</option>" +
      "</select></div>";

    var popovers =
      '<div class="popover hidden" id="pop-f-region"><div class="pop-title">Region — where the supplier is headquartered</div><div class="facet-list">' +
        facetGroup("region", REGIONS, f.region) + "</div></div>" +
      '<div class="popover hidden" id="pop-f-mat"><div class="pop-title">Primary material</div><div class="facet-list">' +
        facetGroup("mat", MATERIALS, f.mat) + "</div></div>" +
      '<div class="popover hidden" id="pop-f-kind"><div class="pop-title">Offer type — stated honestly on every card</div><div class="facet-list">' +
        facetGroup("kind", ["Stock", "Custom", "Quote-only"], f.kind) + "</div></div>" +
      '<div class="popover hidden" id="pop-f-cert"><div class="pop-title">Certifications &amp; platform badges (as published)</div><div class="facet-list">' +
        facetGroup("cert", certList, f.certs) + "</div></div>";

    return html + popovers + "</div>";
  }

  function viewCategory(slug) {
    var isAll = slug === "all";
    var t = TAX_BY_SLUG[slug];
    var base = isAll ? LISTINGS_BUILT.slice() : LISTINGS_BUILT.filter(function (l) { return l.spec.cat === slug; });
    var rows = sortRows(base.filter(function (l) { return matchesFilters(l); }));

    var head, crumbsH, explainer = "";
    if (isAll) {
      head = "<h1>" + (state.q ? "Results for “" + esc(state.q) + "”" : "All packaging offers") + "</h1>" +
        '<p class="desc">' + rows.length + " offers across " + TAXONOMY.length + " categories and " + SUPPLIERS.length + " verified suppliers. Prices shown only where the research verified one; everything else is a quote.</p>";
      crumbsH = crumbs([{ t: "Home", h: "#/" }, { t: state.q ? "Search" : "All offers" }]);
    } else {
      head = "<h1>" + esc(t.label) + "</h1><p class=\"desc\">" + esc(t.blurb) + ".</p>";
      crumbsH = crumbs([{ t: "Home", h: "#/" }, { t: t.label }]);
      explainer = moqExplainer(slug);
    }

    $("#app").innerHTML =
      '<div class="wrap">' + crumbsH +
      '<div class="page-head">' + head + "</div>" + explainer +
      toolbar(base) +
      '<div class="result-count"><b>' + rows.length + "</b> offers" + (isAll ? "" : " in " + esc(t.label)) + " · MOQ and price shown only where verified " + COLLECTED + "</div>" +
      grid(rows) + "</div>";
  }

  function viewDetail(id) {
    var l = L_BY_ID[id];
    var t = TAX_BY_SLUG[l.spec.cat];
    var kind = offerKind(l);
    var img = specImg(l.spec);
    var pm = priceMain(l);
    var others = LISTINGS_BUILT.filter(function (x) { return x.specKey === l.specKey && x.id !== l.id; });
    var similar = LISTINGS_BUILT.filter(function (x) { return x.spec.cat === l.spec.cat && x.specKey !== l.specKey; }).slice(0, 4);

    var buyRows = "";
    if (pm && pm.big) buyRows += '<div class="fl"><span class="k">Verified price (' + COLLECTED + ')</span><span class="v"><span class="num">' + esc(pm.big) + "</span> " + esc(pm.per) + "</span></div>";
    if (pm && pm.note) buyRows += '<div class="fl"><span class="k">Verified price (' + COLLECTED + ')</span><span class="v">' + esc(pm.note) + "</span></div>";
    if (!pm) buyRows += '<div class="fl"><span class="k">Price</span><span class="v">Not published — request quote</span></div>';
    buyRows += '<div class="fl"><span class="k">Minimum order</span><span class="v">' + esc(moqText(l)) + "</span></div>";
    buyRows += '<div class="fl"><span class="k">Lead time</span><span class="v">' + esc(leadText(l)) + "</span></div>";
    buyRows += '<div class="fl"><span class="k">Materials</span><span class="v">' + esc(l.spec.materials) + "</span></div>";
    buyRows += '<div class="fl"><span class="k">Sizes</span><span class="v">' + esc(l.spec.sizes) + "</span></div>";
    buyRows += '<div class="fl"><span class="k">Priced per</span><span class="v">' + esc(l.spec.unit || t.unit) + "</span></div>";
    buyRows += '<div class="fl"><span class="k">Typical category MOQs</span><span class="v">' + esc(t.moqTypical) + "</span></div>";

    var gPhoto = hotlinkPhotos(l.supplierId)[0] || null;
    var priceRows = assetPriceRows(l.supplierId, l.spec.cat);
    var pricingSection = "";
    if (priceRows.length) {
      pricingSection = '<div class="detail-section"><h2>Published pricing — captured ' + CAPTURED + "</h2>" +
        '<div class="compare-wrap"><table class="mini-table price-snap">' +
        "<tr><th>Product</th><th>Price (as displayed)</th><th>Unit / pack</th><th>Tier</th><th>MOQ condition</th><th>Source</th></tr>" +
        priceRows.map(function (r) {
          return "<tr><td>" + esc(r.product) + '</td><td><span class="num">' + esc(r.priceVerbatim) + "</span></td><td>" +
            esc([r.unit, r.packSize].filter(Boolean).join(" · ")) + "</td><td>" + esc(r.tier || "—") + "</td><td>" + esc(r.moqCondition || "—") + "</td><td>" +
            '<a href="' + esc(r.url) + '" target="_blank" rel="noopener">supplier page ↗</a></td></tr>';
        }).join("") + "</table></div>" +
        '<p class="cta-note" style="margin-top:8px">Verbatim snapshots taken from the supplier\'s own pages on ' + CAPTURED + " — not live quotes, never converted, rounded or estimated. Currency, units and minimums are exactly as displayed; confirm current pricing with the supplier.</p></div>";
    } else if (noPubFor(l.supplierId, l.spec.cat)) {
      pricingSection = '<div class="detail-section"><p class="cta-note">This supplier publishes no price for ' + esc(t.label) + " (verified " + CAPTURED + ") — the quote is the only honest path.</p></div>";
    }
    var phsAll = assetPhotos(l.supplierId);
    var photoSection = "";
    if (phsAll.length) {
      photoSection = '<div class="detail-section"><h2>Genuine product photography — ' + esc(l.supplier.name) + "</h2>" +
        '<div class="photo-strip">' + phsAll.map(function (p) {
          return p.hotlinkable ?
            '<figure class="photo-card"><img src="' + esc(p.url) + '" alt="' + esc(p.alt || p.product || "Supplier product photo") + '" loading="lazy" onerror="this.closest(\'.photo-card\').classList.add(\'broken\'); this.remove();">' +
            "<figcaption>" + esc(p.product || "") + ' · <a href="' + esc(p.page) + '" target="_blank" rel="noopener">View on supplier site ↗</a></figcaption></figure>' :
            '<figure class="photo-card photo-out"><span class="glyph">' + esc(specGlyph(l.spec)) + "</span><figcaption>" + esc(p.product || "Supplier photo") + " · held on " + (p.page ? '<a href="' + esc(p.page) + '" target="_blank" rel="noopener">' + esc(l.supplier.name) + "\'s site ↗</a>" : '<a href="' + esc(l.supplier.website) + '" target="_blank" rel="noopener">' + esc(l.supplier.name) + "\'s site ↗</a>") + "</figcaption></figure>";
        }).join("") + "</div>" +
        '<p class="cta-note" style="margin-top:8px">All photos remain the property of ' + esc(l.supplier.name) + ". Displayed with attribution and a link to the source page — never re-hosted or presented as ours.</p></div>";
    }
    var quoteCopy = kind === "Stock" ? "Stock items are quoted by quantity — tell the supplier how many cases you need." :
      (kind === "Custom" ? "Custom run — the supplier prices from your artwork, size and quantity." :
        "This supplier publishes no pricing — the quote is the only honest path.");

    $("#app").innerHTML =
      '<div class="wrap">' +
        crumbs([{ t: "Home", h: "#/" }, { t: t.label, h: "#/cat/" + t.slug }, { t: l.spec.name }]) +
        '<div class="detail-layout">' +
          '<div><div class="gallery">' + (gPhoto ? '<img src="' + esc(gPhoto.url) + '" alt="Genuine product photo from ' + esc(l.supplier.name) + ': ' + esc(gPhoto.product || gPhoto.alt || "packaging product") + '" onerror="App.imgFallback(this,\'' + esc(img || "") + '\')">' : (img ? '<img src="' + img + '" alt="Illustrative photo of the ' + esc(l.spec.name) + ' packaging style">' : '<span class="glyph">' + esc(specGlyph(l.spec)) + "</span>")) + "</div>" +
            '<p class="cta-note" style="margin-top:8px">' + (gPhoto ? 'Genuine product photo from <a href="' + esc(gPhoto.page) + '" target="_blank" rel="noopener">' + esc(l.supplier.name) + "\'s site</a> — property of " + esc(l.supplier.name) + ", shown with attribution (" + CAPTURED + ")." : "Photo shows the packaging style, not a specific supplier SKU.") + "</p></div>" +
          '<div class="detail-info">' +
            '<div class="kind-row">' + kindBadge(kind) +
              (sampleOk(l.supplier) ? '<span class="badge sample">Sample available</span>' : "") +
              '<span class="badge cert">' + esc(l.spec.mat) + "</span>" +
              '<span class="badge cert">' + esc(l.supplier.region) + "</span></div>" +
            "<h1>" + esc(l.spec.name) + "</h1>" +
            '<div class="sup">Offered by <a href="#/sup/' + l.supplier.id + '">' + esc(l.supplier.name) + "</a> · " + esc(l.supplier.hq) + "</div>" +
            ratingReceipt(l.supplier) +
            '<div class="buy-box">' +
              (pm && pm.big ? '<div class="price-line"><span class="amount">' + esc(pm.big) + '</span><span class="per">' + esc(pm.per) + '</span><span class="dated">verified ' + COLLECTED + "</span></div>" : "") +
              (pm && pm.note ? '<div class="price-line"><span class="amount" style="font-size:1.15rem">' + esc(pm.note) + '</span><span class="dated">verified ' + COLLECTED + "</span></div>" : "") +
              (!pm ? '<div class="price-line"><span class="amount" style="font-size:1.15rem">Request quote</span><span class="dated">no published price — we don\'t invent one</span></div>' : "") +
              '<div class="fact-lines">' + buyRows + "</div>" +
              '<div class="cta-stack">' +
                '<button class="btn btn-primary btn-block" onclick="App.openQuote(\'' + l.id + '\')">Request quote</button>' +
                (sampleOk(l.supplier)
                  ? '<button class="btn btn-secondary btn-block" onclick="App.openSample(\'' + l.supplier.id + '\')">Order sample</button>'
                  : '<div class="cta-note">Sample availability not confirmed on the supplier\'s site — ask with your quote.</div>') +
                '<div class="cta-note">' + esc(quoteCopy) + "</div>" +
              "</div>" +
              '<div class="receipt-card">' +
                '<div class="rc-row"><span class="k">Reviews</span><span class="v">' + ratingReceipt(l.supplier) + "</span></div>" +
                '<div class="rc-row"><span class="k">Sample program</span><span class="v">' +
                  (sampleOk(l.supplier) ? '<a href="' + esc(l.supplier.sample.src) + '" target="_blank" rel="noopener">Verified on supplier site (' + COLLECTED + ") ↗</a>" : "Not published") +
                "</span></div>" +
                '<div class="rc-row"><span class="k">Offer type</span><span class="v">' + esc(kind) + (l.offerType === "Stock" ? " — ships as-is" : " — made to your artwork") + "</span></div>" +
              "</div>" +
            "</div>" +
          "</div>" +
        "</div>" +

        '<div class="detail-section"><h2>About this packaging</h2><div class="pills" style="margin-bottom:14px">' +
          l.spec.bullets.map(function (b) { return '<span class="pill">' + esc(b) + "</span>"; }).join("") + "</div></div>" +

        '<div class="detail-section"><h2>Specification</h2><table class="spec-table">' +
          "<tr><th>Category</th><td><a href=\"#/cat/" + t.slug + '">' + esc(t.label) + "</a></td></tr>" +
          "<tr><th>Use cases</th><td>" + esc(l.spec.use) + "</td></tr>" +
          "<tr><th>Materials</th><td>" + esc(l.spec.materials) + "</td></tr>" +
          "<tr><th>Sizes</th><td>" + esc(l.spec.sizes) + "</td></tr>" +
          "<tr><th>Offer type</th><td>" + esc(kind) + "</td></tr>" +
          "<tr><th>MOQ (this offer)</th><td>" + esc(moqText(l)) + "</td></tr>" +
          "<tr><th>Typical MOQs (" + esc(t.short) + ")</th><td>" + esc(t.moqTypical) + "</td></tr>" +
          "<tr><th>Samples</th><td>" + (sampleOk(l.supplier) ? esc(l.supplier.sample.note) + ' <a href="' + esc(l.supplier.sample.src) + '" target="_blank" rel="noopener">Source ↗</a>' : "Not published — ask the supplier") + "</td></tr>" +
        "</table></div>" +

        '<div class="detail-section">' + moqExplainer(l.spec.cat) + "</div>" +
        pricingSection + photoSection +

        '<div class="detail-section"><h2>How ordering works</h2><div class="steps" style="grid-template-columns:repeat(3,1fr)">' +
          '<div class="step"><span class="n">STEP 1</span><h3>Request a quote</h3><p>Quantity, size and artwork status. Suppliers typically respond within 2 business days.</p></div>' +
          '<div class="step"><span class="n">STEP 2</span><h3>Approve a proof</h3><p>Printed packaging starts with a proof sign-off before production begins.</p></div>' +
          '<div class="step"><span class="n">STEP 3</span><h3>' + (sampleOk(l.supplier) ? "Order a sample" : "Confirm details") + "</h3><p>" +
            (sampleOk(l.supplier) ? esc(l.supplier.sample.note) : "Any unlisted detail — samples, tooling fees, certifications — is a question for the supplier, not a guess.") + "</p></div>" +
        "</div></div>" +

        (others.length ? '<div class="detail-section"><h2>Same packaging, other suppliers</h2><div class="compare-wrap"><table class="mini-table">' +
          "<tr><th>Supplier</th><th>Region</th><th>Offer type</th><th>Price</th><th>MOQ</th><th>Samples</th><th>Reviews</th></tr>" +
          others.map(function (o) {
            var pm2 = priceMain(o);
            return "<tr><td><a href=\"#/l/" + o.id + '">' + esc(o.supplier.name) + "</a></td><td>" + esc(o.supplier.region) + "</td><td>" + esc(offerKind(o)) + "</td><td>" +
              (pm2 && pm2.big ? '<span class="num">' + esc(pm2.big) + "</span>" : esc(pm2 && pm2.note ? pm2.note : "Request quote")) + "</td><td>" + esc(moqText(o)) + "</td><td>" +
              (sampleOk(o.supplier) ? "Verified" : "Not published") + "</td><td>" + ratingReceipt(o.supplier) + "</td></tr>";
          }).join("") + "</table></div></div>" : "") +

        (similar.length ? '<div class="detail-section"><h2>More ' + esc(t.label.toLowerCase()) + "</h2>" + grid(similar) + "</div>" : "") +

        '<div class="detail-section"><h2>About ' + esc(l.supplier.name) + '</h2><div class="panel">' +
          "<p>" + esc(l.supplier.about) + "</p>" +
          '<div class="pills">' + (l.supplier.badges || []).map(function (b) { return '<span class="pill" title="Platform badge (' + COLLECTED + ')">' + esc(b) + "</span>"; }).join("") +
            '<span class="pill" title="Supplier website (' + COLLECTED + ')"><a href="' + esc(l.supplier.website) + '" target="_blank" rel="noopener">' + esc(l.supplier.website.replace(/^https?:\/\//, "")) + " ↗</a></span></div>" +
          provBlock(l.supplier) +
        "</div></div>" +
      "</div>";

    if (/[?&]quote=1/.test(location.hash)) App.openQuote(l.id);
  }

  function viewSupplier(id) {
    var s = S_BY_ID[id];
    var offers = LISTINGS_BUILT.filter(function (l) { return l.supplier.id === id; });
    var catNames = s.cat.map(function (c) { return TAX_BY_SLUG[c].label; });

    $("#app").innerHTML =
      '<div class="wrap">' +
        crumbs([{ t: "Home", h: "#/" }, { t: s.name }]) +
        '<div class="sup-head">' +
          '<div class="avatar">' + esc(s.name.split(/\s+/).slice(0, 2).map(function (w) { return w[0]; }).join("").toUpperCase()) + "</div>" +
          '<div class="meta"><h1>' + esc(s.name) + "</h1>" +
            '<div class="sub"><span>' + esc(s.hq) + "</span><span>Region: " + esc(s.region) + "</span><span>Serves: " + esc(s.serves) + "</span></div>" +
            '<div style="margin-top:10px">' + ratingReceipt(s) + "</div>" +
          "</div>" +
          '<div class="actions">' +
            '<a class="btn btn-secondary" href="' + esc(s.website) + '" target="_blank" rel="noopener">Supplier website ↗</a>' +
            (offers.length > 0 ? '<a class="btn btn-ghost" href="#sup-offers">See ' + offers.length + " offers</a>" : "") +
          "</div>" +
        "</div>" +
        '<div class="two-col">' +
          "<div>" +
            '<div class="panel"><h3>About</h3><p style="margin:0">' + esc(s.about) + "</p>" +
              (catNames.length ? '<div class="pills" style="margin-top:12px">' + catNames.map(function (c) { return '<span class="pill">' + esc(c) + "</span>"; }).join("") + "</div>"
                : '<p class="panel-note" style="margin:10px 0 0">Category coverage is not verified for this supplier yet — we list nothing rather than guess. See provenance below.</p>') + "</div>" +
            '<div class="panel"><h3>Certifications &amp; platform badges</h3>' + certPills(s, true) + "</div>" +
            (offers.length ? '<div class="panel" id="sup-offers"><h3>Offers (' + offers.length + ')</h3><div class="compare-wrap"><table class="mini-table">' +
              "<tr><th>Offer</th><th>Type</th><th>Price</th><th>MOQ</th><th></th></tr>" +
              offers.slice(0, 30).map(function (l) {
                var pm = priceMain(l);
                return "<tr><td><a href=\"#/l/" + l.id + '">' + esc(l.spec.name) + "</a></td><td>" + esc(offerKind(l)) + "</td><td>" +
                  (pm && pm.big ? '<span class="num">' + esc(pm.big) + "</span>" : esc(pm && pm.note ? pm.note : "Request quote")) + "</td><td>" + esc(moqText(l)) +
                  '</td><td><a href="#/l/' + l.id + '">Details</a></td></tr>';
              }).join("") +
              (offers.length > 30 ? "<tr><td colspan=\"5\">+ " + (offers.length - 30) + " more — filter by category to narrow</td></tr>" : "") +
            "</table></div></div>"
            : '<div class="panel" id="sup-offers"><h3>Offers</h3><p class="panel-note" style="margin:0">No offers listed yet — category coverage for this supplier is unverified in our research. The supplier website is linked above.</p></div>') +
          "</div>" +
          "<div>" +
            '<div class="panel"><h3>Reviews</h3>' + ratingReceipt(s) +
              (s.review ? '<p class="panel-note" style="margin-top:8px">Rating collected ' + COLLECTED + ' from ' + esc(s.review.platform) + '. Aekovera displays the receipt, never mirrors review text.</p>'
                : '<p class="panel-note" style="margin-top:8px">No review platform with a verified receipt was found for this supplier in ' + COLLECTED + '. We show nothing rather than guess.</p>') +
            "</div>" +
            '<div class="panel"><h3>Samples</h3>' +
              (sampleOk(s)
                ? '<div class="sample-box"><div class="sb-title">Verified sample program <span class="tag">SOURCE-VERIFIED</span></div>' +
                  '<p>' + esc(s.sample.note) + '</p><p><a href="' + esc(s.sample.src) + '" target="_blank" rel="noopener">Source: supplier site (' + COLLECTED + ") ↗</a></p>" +
                  '<button class="btn btn-secondary btn-block" onclick="App.openSample(\'' + s.id + '\')">Order sample</button></div>'
                : '<div class="sample-box"><div class="sb-title">Sample program not confirmed</div><p>' + esc(s.sample && s.sample.note ? s.sample.note : "Unknown.") +
                  ' Aekovera shows an “Order sample” button <b>only</b> when the supplier\'s own site confirms a live program. Ask about samples with your quote.</p></div>') +
            "</div>" +
            '<div class="panel"><h3>Pricing notes</h3>' +
              (s.priceNotes && s.priceNotes.length ? '<ul class="plain">' + s.priceNotes.map(function (p) { return "<li>" + esc(p) + "</li>"; }).join("") + "</ul>"
                : '<p class="panel-note">No verified pricing notes — quotes are per quantity.</p>') +
            "</div>" +
            '<div class="panel"><h3>Contact</h3>' +
              '<p class="panel-note">Website: <a href="' + esc(s.website) + '" target="_blank" rel="noopener">' + esc(s.website.replace(/^https?:\/\//, "")) + "</a></p>" +
              '<p class="panel-note">Lead times: ' + esc(s.lead || "Not published") + "</p>" +
            "</div>" +
            provBlock(s) +
          "</div>" +
        "</div>" +
      "</div>";
  }

  function viewCompare() {
    var rows = state.compare.map(function (id) { return L_BY_ID[id]; }).filter(Boolean);
    if (!rows.length) {
      $("#app").innerHTML = '<div class="wrap">' + crumbs([{ t: "Home", h: "#/" }, { t: "Compare" }]) +
        '<div class="empty" style="margin:20px 0 60px"><h3>Nothing to compare yet</h3><p>Tick “Compare” on up to four offers, then come back.</p><a class="btn btn-primary" href="#/">Browse offers</a></div></div>';
      return;
    }
    function cell(l, fn) { return fn(l); }
    var def = [
      { h: "Supplier", f: function (l) { return '<a href="#/sup/' + l.supplier.id + '">' + esc(l.supplier.name) + "</a>"; } },
      { h: "Region", f: function (l) { return esc(l.supplier.region); } },
      { h: "Offer type", f: function (l) { return esc(offerKind(l)); } },
      { h: "Price (verified " + COLLECTED + ")", f: function (l) { var pm = priceMain(l); return pm && pm.big ? '<span class="num">' + esc(pm.big) + "</span> " + esc(pm.per) : (pm && pm.note ? esc(pm.note) : '<span class="un">Not published — quote</span>'); } },
      { h: "Minimum order", f: function (l) { return esc(moqText(l)); } },
      { h: "Lead time", f: function (l) { return esc(leadText(l)); } },
      { h: "Samples", f: function (l) { return sampleOk(l.supplier) ? "Verified program" : '<span class="un">Not published</span>'; } },
      { h: "Reviews", f: function (l) { return ratingReceipt(l.supplier); } },
      { h: "Materials", f: function (l) { return esc(l.spec.materials); } },
      { h: "Certifications", f: function (l) { var c = (l.supplier.certs || []).map(function (x) { return x.n; }); return c.length ? esc(c.join(" · ")) : '<span class="un">None published</span>'; } },
      { h: "", f: function (l) { return '<a href="#/l/' + l.id + '">View details</a>'; } }
    ];
    $("#app").innerHTML = '<div class="wrap">' +
      crumbs([{ t: "Home", h: "#/" }, { t: "Compare offers" }]) +
      '<div class="page-head"><h1>Side-by-side comparison</h1><p class="desc">Every cell states its source or says “not published”. Nothing is estimated.</p></div>' +
      '<div class="compare-wrap"><table class="mini-table"><thead><tr><th></th>' +
        rows.map(function (l) { var img = specImg(l.spec); return "<th>" + (img ? '<img src="' + img + '" alt="" style="max-height:44px;float:right;mix-blend-mode:multiply">' : "") + esc(l.spec.name) + '<br><span style="font-weight:400;text-transform:none;letter-spacing:0">' + esc(l.supplier.name) + "</span></th>"; }).join("") +
      "</tr></thead><tbody>" +
      def.map(function (d) {
        return "<tr><th>" + esc(d.h) + "</th>" + rows.map(function (l) { return "<td>" + d.f(l) + "</td>"; }).join("") + "</tr>";
      }).join("") +
      "</tbody></table></div>" +
      '<div style="margin:14px 0 40px"><button class="btn btn-ghost" onclick="App.clearCompare()">Clear comparison</button></div>' +
      "</div>";
  }

  /* ---------------- compare bar ---------------- */
  function renderCompareBar() {
    var bar = $("#cmpbar");
    var rows = state.compare.map(function (id) { return L_BY_ID[id]; }).filter(Boolean);
    if (!rows.length) { bar.innerHTML = ""; bar.classList.add("hidden"); return; }
    bar.classList.remove("hidden");
    bar.innerHTML = '<span class="t">Compare (' + rows.length + "/" + MAX_COMPARE + ')</span>' +
      '<span class="thumbs">' + rows.map(function (l) {
        var img = specImg(l.spec);
        return '<span class="thumb-pip" title="' + esc(l.spec.name + " — " + l.supplier.name) + '">' + (img ? '<img src="' + img + '" alt="">' : '<span class="g">' + esc(specGlyph(l.spec)) + "</span>") + "</span>";
      }).join("") + "</span>" +
      '<button class="btn btn-primary sm" onclick="location.hash=\'#/compare\'">Compare</button>' +
      '<a class="clear" href="#" onclick="App.clearCompare();return false">Clear</a>';
  }

  /* ---------------- modals ---------------- */
  function closeModal() { var m = $("#modal"); if (!m) return; m.innerHTML = ""; m.classList.add("hidden"); }
  function openModal(html) { var m = $("#modal"); m.innerHTML = '<div class="modal-backdrop" onclick="if(event.target===this)App.closeModal()"><div class="modal">' + html + "</div></div>"; m.classList.remove("hidden"); }

  function openQuote(listingId) {
    var l = L_BY_ID[listingId];
    openModal(
      '<button class="close-x" onclick="App.closeModal()" aria-label="Close">✕</button>' +
      "<h3>Request a quote</h3>" +
      '<div class="modal-sub">' + esc(l.spec.name) + " · " + esc(l.supplier.name) + " · " + esc(offerKind(l)) + " · MOQ: " + esc(moqText(l)) + "</div>" +
      '<form onsubmit="return App.submitQuote(event,\'' + l.id + '\')">' +
        '<label>Quantity needed <input name="qty" type="text" placeholder="e.g. 5,000 units" required></label>' +
        '<label>Artwork status <select name="art"><option>Ready to send</option><option>In progress</option><option>Need help with design</option></select></label>' +
        '<label>Your name <input name="name" type="text" required></label>' +
        '<label>Work email <input name="email" type="email" required></label>' +
        '<label>Notes <span class="opt">(sizes, materials, deadline)</span> <textarea name="notes" rows="3" placeholder="Optional"></textarea></label>' +
        '<button class="btn btn-primary btn-block" type="submit">Send request</button>' +
        '<div class="cta-note">Prototype: nothing is sent or stored. In production this routes to ' + esc(l.supplier.name) + ", who typically responds within 2 business days.</div>" +
      "</form>"
    );
  }
  function submitQuote(e, id) {
    e.preventDefault();
    var l = L_BY_ID[id];
    openModal(
      '<div class="success-state"><div class="tick">✓</div>' +
      "<h3>Request captured</h3>" +
      '<p class="modal-sub">In the live marketplace this quote request routes directly to ' + esc(l.supplier.name) +
      ' with your quantity and artwork status. This prototype stores nothing and sends nothing.</p>' +
      '<button class="btn btn-secondary" onclick="App.closeModal()">Done</button></div>'
    );
    return false;
  }

  function openSample(supId) {
    var s = S_BY_ID[supId];
    if (!sampleOk(s)) return; /* hard gate — never render a sample flow without a verified source */
    openModal(
      '<button class="close-x" onclick="App.closeModal()" aria-label="Close">✕</button>' +
      "<h3>Order a sample — " + esc(s.name) + "</h3>" +
      '<div class="modal-sub">Verified from the supplier\'s own website, ' + COLLECTED + '.</div>' +
      '<div class="sample-box"><div class="sb-title">Verified terms <span class="tag">SOURCE-VERIFIED</span></div><p>' + esc(s.sample.note) + "</p>" +
      '<p><a href="' + esc(s.sample.src) + '" target="_blank" rel="noopener">Source: ' + esc(String(s.sample.src).replace(/^https?:\/\/(www\.)?/, "").split("/")[0]) + " ↗</a></p></div>" +
      '<div class="cta-stack" style="margin-top:16px">' +
        '<a class="btn btn-primary btn-block" href="' + esc(s.sample.src) + '" target="_blank" rel="noopener">Continue to the supplier\'s sample page</a>' +
        '<button class="btn btn-secondary btn-block" onclick="App.closeModal()">Keep browsing</button>' +
        '<div class="cta-note">Prototype: sampling happens on the supplier\'s site. We link to the verified source rather than re-selling the sample.</div>' +
      "</div>"
    );
  }

  /* ---------------- popovers ---------------- */
  function closePopovers() {
    document.querySelectorAll(".popover").forEach(function (p) { p.classList.add("hidden"); });
  }
  function togglePopover(id) {
    var p = $("#pop-" + id);
    var wasHidden = p.classList.contains("hidden");
    closePopovers();
    if (wasHidden) p.classList.remove("hidden");
  }

  /* ---------------- router & events ---------------- */
  function route() {
    var h = location.hash.replace(/^#\/?/, "");
    var parts = h.split("/");
    closeModal(); closePopovers();
    if (parts[0] === "cat" && (parts[1] === "all" || TAX_BY_SLUG[parts[1]])) viewCategory(parts[1] || "all");
    else if (parts[0] === "l" && L_BY_ID[parts[1]]) viewDetail(parts[1]);
    else if (parts[0] === "sup" && S_BY_ID[parts[1]]) viewSupplier(parts[1]);
    else if (parts[0] === "compare") viewCompare();
    else viewHome();
    renderCompareBar();
    window.scrollTo(0, 0);
  }

  function rerender() { route(); }

  window.App = {
    search: function (v) {
      state.q = v.trim();
      var hq = $("#hero-q"); if (hq && hq.value !== v) hq.value = v;
      var nq = $("#nav-q"); if (nq && nq.value !== v) nq.value = v;
      if (location.hash && location.hash.indexOf("#/cat") !== 0) location.hash = "#/";
      else route();
    },
    searchGo: function () { location.hash = "#/cat/all"; route(); },
    clearAll: function () { state.q = ""; clearFilters(); var nq = $("#nav-q"); if (nq) nq.value = ""; var hq = $("#hero-q"); if (hq) hq.value = ""; rerender(); },
    setSort: function (v) { state.sort = v; rerender(); },
    toggleFacet: function (name, val) {
      var arr = state.f[name];
      var i = arr.indexOf(val);
      if (i >= 0) arr.splice(i, 1); else arr.push(val);
      rerender();
    },
    toggleSampleFilter: function () { state.f.sample = !state.f.sample; rerender(); },
    toggleCompare: function (id) {
      var i = state.compare.indexOf(id);
      if (i >= 0) state.compare.splice(i, 1);
      else {
        if (state.compare.length >= MAX_COMPARE) { showToast("Compare up to " + MAX_COMPARE + " offers — remove one first."); return; }
        state.compare.push(id);
      }
      route();
    },
    clearCompare: function () { state.compare = []; rerender(); },
    imgFallback: function (el, fallbackSrc) {
      if (fallbackSrc) { el.onerror = null; el.src = fallbackSrc; }
      else { el.style.display = "none"; }
    },
    viewOffers: function (sid) { location.hash = "#/cat/all"; route(); /* simple: full list; supplier offers are on their page */ },
    openQuote: openQuote, submitQuote: submitQuote, openSample: openSample, closeModal: closeModal
  };

  function showToast(msg) {
    var t = document.createElement("div");
    t.className = "toast"; t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 2600);
  }

  function buildCatMenu() {
    var grid = $("#catmenu-grid");
    if (!grid) return;
    grid.innerHTML = TAXONOMY.map(function (t) {
      return '<a href="#/cat/' + t.slug + '"><span class="n">' + String(t.n).padStart(2, "0") + "</span>" + esc(t.label) + "</a>";
    }).join("");
  }

  function init() {
    buildCatMenu();
    window.addEventListener("hashchange", route);
    document.addEventListener("click", function (e) {
      var chip = e.target.closest("[data-pop]");
      if (chip) { togglePopover(chip.getAttribute("data-pop")); return; }
      if (!e.target.closest(".popover")) closePopovers();
    });
    try { route(); }
    catch (err) {
      var app = document.getElementById("app");
      if (app) app.innerHTML = '<div style="padding:40px;max-width:720px;margin:0 auto;font-family:monospace"><h2>Render error</h2><pre>' + String(err && err.stack || err) + "</pre></div>";
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
