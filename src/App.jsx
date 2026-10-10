import { useEffect } from 'react'
import { Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom'
import TopNav from './components/TopNav.jsx'
import Footer from './components/Footer.jsx'
import Discover from './views/Discover.jsx'
import Outreach from './views/Outreach.jsx'
import Marketplace from './views/Marketplace.jsx'
import IngredientsDiscover from './views/ingredients/Discover.jsx'
import IngredientProfile from './views/ingredients/SupplierProfile.jsx'
import { PackagingBasketProvider } from './state/packagingBasket.jsx'
import PackagingLanding from './views/packaging/Landing.jsx'
import PackagingResults from './views/packaging/Results.jsx'
import PackagingProduct from './views/packaging/ProductDetail.jsx'
import SuppliersDirectory from './views/packaging/SuppliersDirectory.jsx'
import SupplierProfile from './views/packaging/SupplierProfile.jsx'
import PackagingBasket from './views/packaging/Basket.jsx'
import LiveCall from './components/outreach/LiveCall.jsx'
import ColdOpen, { ColdOpenGate } from './components/intro/ColdOpen.jsx'
import Login from './views/live/Login.jsx'
import SupplierPortal from './views/live/SupplierPortal.jsx'
import ControlRoom from './views/live/ControlRoom.jsx'
import { onDemoReset } from './lib/live/realtime.js'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [pathname])
  return null
}

/** Pathless layout: one basket provider shared by every /packaging route. */
function PackagingLayout() {
  return (
    <PackagingBasketProvider>
      <Outlet />
    </PackagingBasketProvider>
  )
}

// Admin "Reset demo" → every open screen reloads to its start page.
export function homeAfterReset(pathname) {
  if (pathname.startsWith('/control')) return '/control'
  if (pathname.startsWith('/supplier')) return '/supplier'
  if (pathname.startsWith('/login')) return pathname
  return '/'
}

function DemoResetListener() {
  useEffect(
    () =>
      onDemoReset(() => {
        try {
          sessionStorage.clear()
        } catch {
          /* noop */
        }
        window.location.replace(homeAfterReset(window.location.pathname))
      }),
    [],
  )
  return null
}

export default function App() {
  // The outreach workspace and the cold-open intro are full-screen surfaces
  // with their own chrome — the standard site chrome drops away there.
  const { pathname } = useLocation()
  const immersive =
    pathname.startsWith('/outreach') ||
    pathname === '/intro' ||
    pathname.startsWith('/control') ||
    pathname.startsWith('/supplier')

  return (
    <div className={`app-shell ${immersive ? 'app-shell--immersive' : ''}`}>
      <ScrollToTop />
      <DemoResetListener />
      {!immersive && <TopNav />}
      <main className="app-main">
        <Routes>
          <Route path="/" element={<Discover />} />
          <Route path="/outreach" element={<Outreach />} />
          <Route
            path="/outreach/live"
            element={
              <ColdOpenGate>
                <LiveCall />
              </ColdOpenGate>
            }
          />
          <Route path="/intro" element={<ColdOpen />} />
          <Route path="/login" element={<Login />} />
          <Route path="/supplier" element={<SupplierPortal />} />
          <Route path="/control" element={<ControlRoom />} />
          <Route path="/control/:requestId" element={<ControlRoom />} />
          <Route path="/marketplace" element={<Marketplace />} />
          <Route path="/ingredients" element={<IngredientsDiscover />} />
          <Route path="/ingredients/:supplierId" element={<IngredientProfile />} />
          <Route element={<PackagingLayout />}>
            <Route path="/packaging" element={<PackagingLanding />} />
            <Route path="/packaging/results" element={<PackagingResults />} />
            <Route path="/packaging/products/:id" element={<PackagingProduct />} />
            <Route path="/packaging/suppliers" element={<SuppliersDirectory />} />
            <Route path="/packaging/suppliers/:slug" element={<SupplierProfile />} />
            <Route path="/packaging/basket" element={<PackagingBasket />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      {!immersive && <Footer />}
    </div>
  )
}
