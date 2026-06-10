import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Eye, EyeOff, Lock, Mail, ArrowRight, BarChart2, CheckCircle2 } from 'lucide-react'
import toast from 'react-hot-toast'

const FEATURES = [
  'Multi-department weekly report consolidation',
  'Professional PDF export with inline images',
  'Outlook-ready email with embedded attachments',
  'Role-based access — Department Heads & Admin',
]

export default function LoginPage() {
  const { login, user } = useAuth()
  const navigate = useNavigate()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPwd,  setShowPwd]  = useState(false)
  const [loading,  setLoading]  = useState(false)

  useEffect(() => { if (user) navigate('/', { replace: true }) }, [user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) return
    setLoading(true)
    try {
      await login(email, password)
      navigate('/', { replace: true })
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Invalid credentials. Please verify and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex" style={{ background: '#faf9f8' }}>

      {/* ── Left Panel — Brand Identity ─────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[44%] xl:w-[42%] flex-col justify-between p-12 relative overflow-hidden"
           style={{ background: 'linear-gradient(160deg, #2c0820 0%, #4d0e38 45%, #3d0b2d 100%)' }}>

        {/* Texture */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.04]"
             style={{
               backgroundImage: 'repeating-linear-gradient(45deg, rgba(255,255,255,1) 0, rgba(255,255,255,1) 1px, transparent 0, transparent 50%)',
               backgroundSize: '8px 8px',
             }} />

        {/* Decorative glow */}
        <div className="absolute pointer-events-none"
             style={{
               width: '320px', height: '320px', borderRadius: '50%',
               background: 'radial-gradient(circle, rgba(201,168,76,0.12) 0%, transparent 70%)',
               top: '-60px', right: '-60px',
             }} />
        <div className="absolute pointer-events-none"
             style={{
               width: '200px', height: '200px', borderRadius: '50%',
               background: 'radial-gradient(circle, rgba(255,255,255,0.04) 0%, transparent 70%)',
               bottom: '80px', left: '-30px',
             }} />

        {/* Top — Logo */}
        <div className="relative">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center"
                 style={{ background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.3)' }}>
              <BarChart2 className="w-6 h-6" style={{ color: '#c9a84c' }} />
            </div>
            <div>
              <div className="font-display text-xl text-white leading-tight">SPR India</div>
              <div className="text-[10px] font-bold uppercase tracking-[0.14em]"
                   style={{ color: 'rgba(201,168,76,0.7)' }}>Pvt. Ltd.</div>
            </div>
          </div>

          <h2 className="font-display text-4xl xl:text-5xl text-white leading-tight mb-4">
            Weekly Activity<br />
            <span style={{ color: '#c9a84c' }}>Report System</span>
          </h2>
          <p className="text-sm font-medium leading-relaxed"
             style={{ color: 'rgba(255,255,255,0.45)', maxWidth: '360px' }}>
            A centralised platform for department heads to document, review, and
            distribute weekly activity reports across the organisation.
          </p>
        </div>

        {/* Features list */}
        <div className="relative space-y-3.5">
          {FEATURES.map(f => (
            <div key={f} className="flex items-start gap-3">
              <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#c9a84c' }} />
              <span className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.55)' }}>{f}</span>
            </div>
          ))}
        </div>

        {/* Bottom */}
        <div className="relative">
          <div className="h-px w-full mb-5" style={{ background: 'rgba(255,255,255,0.08)' }} />
          <p className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.25)' }}>
            © {new Date().getFullYear()} SPR India Private Limited. All rights reserved.
          </p>
        </div>
      </div>

      {/* ── Right Panel — Sign In Form ───────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md animate-scale-in">

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                 style={{ background: '#4d0e38' }}>
              <BarChart2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-display text-lg" style={{ color: '#4d0e38' }}>SPR India</div>
              <div className="text-xs text-muted font-semibold uppercase tracking-wider">Weekly Reports</div>
            </div>
          </div>

          {/* Form card */}
          <div className="bg-white rounded-2xl p-8 sm:p-10"
               style={{ boxShadow: '0 8px 40px rgba(77,14,56,0.10), 0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #ece8e5' }}>

            <div className="mb-8">
              <h1 className="font-display text-3xl mb-1.5" style={{ color: '#1a1512' }}>
                Sign In
              </h1>
              <p className="text-sm font-medium" style={{ color: '#a89f98' }}>
                Access your department's activity reports
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email */}
              <div>
                <label className="label">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                        style={{ color: '#a89f98' }} />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="yourname@sprindia.com"
                    className="input pl-10"
                    autoFocus
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="label">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                        style={{ color: '#a89f98' }} />
                  <input
                    type={showPwd ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••••"
                    className="input pl-10 pr-11"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(!showPwd)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7
                               flex items-center justify-center rounded-md
                               transition-colors"
                    style={{ color: '#a89f98' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#4d0e38')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#a89f98')}
                  >
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary btn-lg w-full group mt-2"
              >
                {loading ? (
                  <span className="btn-spinner" />
                ) : (
                  <>
                    Proceed to Dashboard
                    <ArrowRight className="w-4 h-4 transition-transform duration-200
                                           group-hover:translate-x-1" />
                  </>
                )}
              </button>
            </form>

            {/* Demo Credentials */}
            <div className="mt-7 pt-6"
                 style={{ borderTop: '1px solid #ece8e5' }}>
              <p className="text-[10px] font-black uppercase tracking-[0.12em] mb-3"
                 style={{ color: '#a89f98' }}>
                Demo Access Credentials
              </p>
              <div className="space-y-2">
                {[
                  { role: 'Administrator',    cred: 'admin@spr.com',    pass: 'Admin@SPR2024!' },
                  { role: 'Engineering Head', cred: 'eng.head@spr.com', pass: 'Password123!' },
                  { role: 'Operations Head',  cred: 'ops.head@spr.com', pass: 'Password123!' },
                ].map(({ role, cred, pass }) => (
                  <div key={role}
                       className="flex items-center justify-between gap-3 rounded-lg px-3 py-2.5"
                       style={{ background: '#faf9f8', border: '1px solid #ece8e5' }}>
                    <span className="text-xs font-bold" style={{ color: '#5c544e', minWidth: '120px' }}>
                      {role}
                    </span>
                    <span className="text-[11px] font-mono truncate" style={{ color: '#7a7068' }}>
                      {cred}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
