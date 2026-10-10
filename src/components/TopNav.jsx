import { useEffect, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { ArrowRightIcon } from './icons.jsx'

const NAV_LINKS = [
  { to: '/', label: 'Discover', end: true },
  { to: '/outreach', label: 'Outreach' },
  { to: '/packaging', label: 'Packaging' },
  { to: '/ingredients', label: 'Ingredients' },
]

export default function TopNav() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header className={`site-header ${scrolled ? 'site-header--scrolled' : ''}`}>
      <div className="site-header__inner">
        <Link to="/" className="brand">
          <span className="brand__mark" aria-hidden="true">
            <span className="brand__mark-glow" />
            <span className="brand__mark-glyph">Æ</span>
          </span>
          Aekovera
        </Link>

        <nav className="site-nav" aria-label="Primary">
          {NAV_LINKS.map((link) =>
            link.href ? (
              <a key={link.label} href={link.href} className="site-nav__link">
                {link.label}
              </a>
            ) : (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  `site-nav__link ${isActive ? 'site-nav__link--active' : ''}`
                }
              >
                {link.label}
              </NavLink>
            )
          )}
        </nav>

        <div className="site-nav__actions">
          <a href="#signin" onClick={(e) => e.preventDefault()} className="site-nav__link">
            Sign in
          </a>
          <Link to="/outreach" className="btn btn--pill btn--navy">
            Book a demo
            <ArrowRightIcon size={16} className="btn__arrow" />
          </Link>
        </div>
      </div>
    </header>
  )
}
