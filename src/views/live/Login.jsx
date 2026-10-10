import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../../lib/live/api.js'

const DEMO_ACCOUNTS = [
  { email: 'maya@doughmere.demo', label: 'Brand · Doughmere Cookie Co.' },
  { email: 'admin@aekovera.demo', label: 'Aeko control room' },
  { email: 'ops@stonefurrow.demo', label: 'Supplier · Stonefurrow Crumb Co.' },
  { email: 'ops@ridgeline.demo', label: 'Supplier · Ridgeline Baking Co.' },
  { email: 'ops@wheatwind.demo', label: 'Supplier · Wheatwind Bakehouse' },
]

export function homeForRole(role) {
  if (role === 'SUPPLIER') return '/supplier'
  if (role === 'ADMIN') return '/control'
  return '/'
}

export default function Login() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e?.preventDefault()
    setBusy(true)
    setError('')
    try {
      const user = await api.login(email.trim(), password)
      navigate(params.get('next') || homeForRole(user.role), { replace: true })
    } catch (err) {
      setError(err.status === 401 ? 'Wrong email or password.' : `Sign-in failed (${err.message}).`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="live-login">
      <form className="live-login__card" onSubmit={submit}>
        <p className="eyebrow">
          <span className="eyebrow__dash" /> Aekovera · Sign in
        </p>
        <h1 className="live-login__title">Welcome back</h1>
        <label className="live-field">
          <span>Email</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus required />
        </label>
        <label className="live-field">
          <span>Password</span>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        {error && <p className="live-error">{error}</p>}
        <button className="btn btn--brand btn--lg" type="submit" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
        <div className="live-login__demo">
          <p>Demo accounts</p>
          {DEMO_ACCOUNTS.map((a) => (
            <button
              key={a.email}
              type="button"
              className="chip"
              onClick={() => {
                setEmail(a.email)
                setPassword('aeko2026')
              }}
            >
              {a.label}
            </button>
          ))}
        </div>
      </form>
    </section>
  )
}
