import { useEffect } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import TopNav from './components/TopNav.jsx'
import Footer from './components/Footer.jsx'
import Discover from './views/Discover.jsx'
import Outreach from './views/Outreach.jsx'
import Marketplace from './views/Marketplace.jsx'
import LiveCall from './components/outreach/LiveCall.jsx'
import ColdOpen, { ColdOpenGate } from './components/intro/ColdOpen.jsx'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [pathname])
  return null
}

export default function App() {
  // The outreach workspace and the cold-open intro are full-screen surfaces
  // with their own chrome — the standard site chrome drops away there.
  const { pathname } = useLocation()
  const immersive = pathname.startsWith('/outreach') || pathname === '/intro'

  return (
    <div className={`app-shell ${immersive ? 'app-shell--immersive' : ''}`}>
      <ScrollToTop />
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
          <Route path="/marketplace" element={<Marketplace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      {!immersive && <Footer />}
    </div>
  )
}
