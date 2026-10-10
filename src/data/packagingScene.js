// Packaging scene — runs on the brand callback after the co-manufacturer is
// chosen. Aeko walks the 3 options, rejects the Amazon markup, recommends
// going direct to Berlin Packaging, and offers to get a quote.
//
// Images: each option tries the Supabase Storage URL first (public bucket
// "packaging", file name below) and falls back to the bundled asset, so you
// can swap images by uploading to Supabase without a deploy.
// Prices are the demo figures from the Aeko reel (fictional demo data).
import frostedBags from '../assets/packaging/frosted-bags.webp'
import whiteBag from '../assets/packaging/white-bag.webp'
import blackBag from '../assets/packaging/black-bag.webp'

const SUPABASE_PUBLIC = 'https://uizgiqreafcxkxavwpbx.supabase.co/storage/v1/object/public/packaging/'

export const PACKAGING_OPTIONS = [
  {
    id: 'amazon',
    rank: 1,
    name: 'Frosted self-seal cookie bags',
    seller: 'Amazon listing',
    channel: 'Retail marketplace',
    unitPrice: '$0.36–0.41',
    unitNum: 0.385,
    priceNote: 'per bag · retail listing',
    verdict: 'Good bag — Amazon markup',
    tone: 'reject',
    remote: `${SUPABASE_PUBLIC}amazon.jpg`,
    image: frostedBags,
  },
  {
    id: 'berlin',
    rank: 2,
    name: 'Premium white cookie bag',
    seller: 'Berlin Packaging',
    channel: 'Direct from the manufacturer',
    unitPrice: '$0.037',
    unitNum: 0.037,
    priceNote: 'per bag · $37.26 per 1,000',
    verdict: 'Premium look · ~10× cheaper direct',
    tone: 'pick',
    recommended: true,
    remote: `${SUPABASE_PUBLIC}berlin.jpg`,
    image: whiteBag,
  },
  {
    id: 'custom-print',
    rank: 3,
    name: 'Custom printed black cookie bag',
    seller: 'Custom print supplier',
    channel: 'Printed to order',
    unitPrice: 'Quote',
    unitNum: null,
    priceNote: 'priced on artwork + volume',
    verdict: 'Bold, playful brand look',
    tone: 'neutral',
    remote: `${SUPABASE_PUBLIC}custom-print.jpg`,
    image: blackBag,
  },
]

export const PACKAGING_PICK = 'berlin'

// Appended to the brand-callback system instruction. It overrides the
// "goodbye after choosing" step so the call continues into packaging.
export function packagingSceneInstruction({ product = 'stuffed cookies' } = {}) {
  const list = PACKAGING_OPTIONS.map(
    (o) => `"${o.id}": ${o.name} — ${o.seller} (${o.channel}), ${o.unitPrice} ${o.priceNote}.`,
  ).join(' ')
  return (
    '\n\nIMPORTANT — PACKAGING SCENE (this replaces the goodbye step above): after the brand chooses a manufacturer and you confirm the intro, do NOT say goodbye or call end_call yet. ' +
    `Say: "One more thing — let's sort your packaging." Then call show_packaging. The brand now sees three packaging options for their ${product}: ${list} ` +
    'Then deliver this, casually and with personality, staying close to the wording: ' +
    '"Let me go through these and find you the best ones! ' +
    'Okay — the first one, the Amazon one, it\'s really good, I\'m not gonna lie. But it\'s VERY expensive for what it is. We are not paying Amazon markup. No. ' +
    'The second one though… that\'s the one. It gives the premium look we\'re going for — clean, elevated, exactly right for stuffed cookies. And here\'s the kicker: if we go direct to the manufacturer, Berlin Packaging, it\'s like 10x cheaper than Amazon. Same quality, a tenth of the price. I love that math. ' +
    'Want me to connect you with them and get a quote?" ' +
    'Call focus_packaging with id "amazon" right before you talk about the first one, and focus_packaging with id "berlin" right before the second. ' +
    'If they ask about the third (black printed bag), say it is a bold, playful look printed to order and priced on their artwork. ' +
    'When they say yes to the quote, call request_packaging_quote with id "berlin" (or the one they picked), confirm the quote request is on its way, then say a short warm goodbye and call end_call. ' +
    'If they say no, say no problem, the options stay on their screen, then say goodbye and call end_call.'
  )
}
