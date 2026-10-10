/**
 * Quote-basket state for the packaging marketplace.
 *
 * Ported from aekobaba_new src/state/basket (zustand store) to a React
 * context + localStorage. The persisted shape is a trimmed map keyed by
 * product id: { [id]: { quantity } } — read back defensively and joined to
 * the live catalog on hydration so a stale id from an older demo build
 * simply drops out instead of rendering a dead row.
 *
 * The basket is a simulated quote request — no network, no backend. The
 * multi-supplier submit is deterministic: a sequential fictional request id
 * (PKQ-YYYYMMDD-NN) from a monotonic counter in sessionStorage.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { allProducts } from '../lib/packaging/catalog'

const STORAGE_KEY = 'aeko.packaging.basket.v1'
const COUNTER_KEY = 'aeko.packaging.basket.requestCounter'

export const BasketContext = createContext(null)

/** Read and sanitize persisted basket entries against the live catalog. */
function loadBasket() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    const valid = {}
    for (const [id, entry] of Object.entries(parsed)) {
      if (!entry || typeof entry !== 'object') continue
      if (!allProducts.some((p) => p.id === id)) continue
      const quantity = Number(entry.quantity)
      if (!Number.isFinite(quantity) || quantity <= 0) continue
      valid[id] = { quantity }
    }
    return valid
  } catch (error) {
    // Corrupt or unavailable storage: start empty rather than crash the demo.
    console.warn('Packaging basket: ignoring unreadable persisted state', error)
    return {}
  }
}

/** Deterministic, sequential fictional request id. */
function nextRequestId() {
  const day = new Date().toISOString().slice(0, 10).replaceAll('-', '')
  const counter = Number(window.sessionStorage.getItem(COUNTER_KEY) ?? '0') + 1
  window.sessionStorage.setItem(COUNTER_KEY, String(counter))
  return `PKQ-${day}-${String(counter).padStart(3, '0')}`
}

export function PackagingBasketProvider({ children }) {
  // Hydrate once on mount (explicit; no SSR in this SPA).
  const [entries, setEntries] = useState({})
  const [hydrated, setHydrated] = useState(false)
  const [submitted, setSubmitted] = useState(null)

  useEffect(() => {
    setEntries(loadBasket())
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
    } catch (error) {
      // Storage full or blocked (private mode): the demo keeps working,
      // the basket just won't survive a reload.
      console.warn('Packaging basket: could not persist state', error)
    }
  }, [entries, hydrated])

  const addItem = useCallback((productId, quantity) => {
    const parsed = Number(quantity)
    setEntries((prev) => ({
      ...prev,
      [productId]: { quantity: Number.isFinite(parsed) && parsed > 0 ? parsed : 1 },
    }))
  }, [])

  const setQuantity = useCallback((productId, quantity) => {
    const parsed = Number(quantity)
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setEntries((prev) => {
        const next = { ...prev }
        delete next[productId]
        return next
      })
      return
    }
    setEntries((prev) => ({ ...prev, [productId]: { quantity: parsed } }))
  }, [])

  const removeItem = useCallback((productId) => {
    setEntries((prev) => {
      const next = { ...prev }
      delete next[productId]
      return next
    })
  }, [])

  const clear = useCallback(() => setEntries({}), [])

  /** Live catalog joined with persisted quantities — the honest view. */
  const items = useMemo(() => {
    return Object.entries(entries)
      .map(([id, entry]) => {
        const product = allProducts.find((p) => p.id === id)
        if (!product) return null
        return { product, quantity: entry.quantity }
      })
      .filter(Boolean)
  }, [entries])

  const submit = useCallback(() => {
    if (items.length === 0) return null
    const requestId = nextRequestId()
    const request = {
      id: requestId,
      // On the source platform quotes route to each supplier's inbox; this
      // simulation records the intent only — nothing is sent.
      supplierCount: new Set(items.map((it) => it.product.supplier.slug)).size,
      itemCount: items.length,
    }
    setSubmitted(request)
    return request
  }, [items])

  const dismissSubmission = useCallback(() => setSubmitted(null), [])

  const value = useMemo(
    () => ({
      items,
      hydrated,
      submitted,
      addItem,
      setQuantity,
      removeItem,
      clear,
      submit,
      dismissSubmission,
    }),
    [items, hydrated, submitted, addItem, setQuantity, removeItem, clear, submit, dismissSubmission],
  )

  return <BasketContext.Provider value={value}>{children}</BasketContext.Provider>
}

export function usePackagingBasket() {
  const context = useContext(BasketContext)
  if (!context) {
    throw new Error('usePackagingBasket must be used within PackagingBasketProvider')
  }
  return context
}

/** Add-to-basket affordance state: true when the product id is in the basket. */
export function useInBasket(productId) {
  const { items } = usePackagingBasket()
  return items.some((it) => it.product.id === productId)
}
