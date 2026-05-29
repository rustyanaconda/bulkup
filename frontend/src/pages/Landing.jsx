import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Activity, RefreshCw, ListChecks, Leaf } from 'lucide-react'

const FEATURES = [
  {
    Icon:  Activity,
    title: 'Targets from your real burn',
    desc:  'Connect Whoop and your daily goal tracks what you actually burned — not a one-size-fits-all estimate.',
  },
  {
    Icon:  RefreshCw,
    title: 'Adapts when life happens',
    desc:  'Miss or skip a meal and the plan adjusts. No guilt, no recalculating it yourself.',
  },
  {
    Icon:  ListChecks,
    title: 'One clean meal, not a diary',
    desc:  'See your day as a few simple meals — not an endless spreadsheet of entries.',
  },
  {
    Icon:  Leaf,
    title: 'Clean food, built in',
    desc:  'Whole foods and quality sourcing baked into every plan, not bolted on after.',
  },
]

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default function Landing() {
  const emailRef                    = useRef(null)
  const [email,       setEmail]     = useState('')
  const [submitted,   setSubmitted] = useState(false)
  const [emailError,  setEmailError]  = useState(false)
  const [submitError, setSubmitError] = useState(false)
  const [loading,     setLoading]   = useState(false)

  function scrollToEmail() {
    emailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    setTimeout(() => emailRef.current?.focus(), 350)
  }

  async function handleJoin() {
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
    if (!valid) { setEmailError(true); return }
    setEmailError(false)
    setSubmitError(false)
    setLoading(true)
    try {
      const res = await fetch(`${API}/waitlist`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email: email.trim() }),
      })
      if (!res.ok) throw new Error(`status ${res.status}`)
      setSubmitted(true)
    } catch {
      setSubmitError(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F5EFE0] text-[#1A2E45]">

      {/* ── Nav ──────────────────────────────────────────────────────────── */}
      <nav className="max-w-[720px] mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <img src="/logo.svg" alt="Mise logo" width={32} height={32} className="block flex-shrink-0" />
          <span className="font-serif text-lg font-semibold text-[#1A2E45]">Mise</span>
        </div>

        <div className="flex items-center gap-4">
          <Link
            to="/login"
            className="text-sm text-[#42526A] hover:text-[#1A2E45] transition-colors"
          >
            Log in
          </Link>
          <button
            onClick={scrollToEmail}
            className="text-sm font-medium px-4 py-1.5 rounded-full border border-[#1A2E45]
                       text-[#1A2E45] hover:bg-[#1A2E45]/5 transition-colors"
          >
            Join waitlist
          </button>
        </div>
      </nav>

      <div className="border-t border-[#E4DCC9] max-w-[720px] mx-auto" />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="max-w-[720px] mx-auto px-6 pt-14 pb-16 text-center">
        <span className="inline-block bg-[#EBE1CC] text-[#42526A] text-xs font-medium
                         px-3.5 py-1.5 rounded-full mb-8">
          Powered by your real burn, not a generic formula
        </span>

        <h1 className="font-serif text-4xl sm:text-5xl font-bold text-[#1A2E45]
                       leading-tight mb-5">
          Gain weight cleanly,
          <br className="hidden sm:block" />{' '}
          without the guesswork
        </h1>

        <p className="text-[#42526A] text-base sm:text-lg leading-relaxed
                      max-w-[520px] mx-auto mb-10">
          Mise plans your meals around the calories you actually burn each day — so
          you hit your goal eating real food, not chasing a number off a chart.
        </p>

        {submitted ? (
          <p className="text-[#1A2E45] font-medium">
            You're on the list — we'll be in touch.
          </p>
        ) : (
          <div className="flex flex-col sm:flex-row gap-2 max-w-[440px] mx-auto">
            <input
              ref={emailRef}
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value); setEmailError(false) }}
              onKeyDown={e => e.key === 'Enter' && handleJoin()}
              placeholder="you@email.com"
              className={`flex-1 bg-[#FBF7EE] text-[#1A2E45] placeholder-[#8A7E63]
                         text-sm px-4 py-3 rounded-xl outline-none transition-colors
                         ${emailError
                           ? 'border border-red-400'
                           : 'border border-[#C9BFA6] focus:border-[#1A2E45]'}`}
            />
            <button
              onClick={handleJoin}
              disabled={loading}
              className="bg-[#1A2E45] text-[#F5EFE0] text-sm font-semibold px-5 py-3
                         rounded-xl hover:bg-[#152639] disabled:opacity-50
                         transition-colors whitespace-nowrap"
            >
              {loading ? 'Joining…' : 'Join the waitlist'}
            </button>
          </div>
        )}

        {!submitted && submitError && (
          <p className="text-xs text-[#A32D2D] mt-2">
            Something went wrong — please try again.
          </p>
        )}

        {!submitted && !submitError && (
          <p className="text-xs text-[#8A7E63] mt-3">
            No spam — just a note when Mise opens up.
          </p>
        )}
      </section>

      {/* ── Why Mise ─────────────────────────────────────────────────────── */}
      <section className="bg-[#FBF7EE] border-t border-b border-[#E4DCC9] py-14 px-6">
        <div className="max-w-[720px] mx-auto">
          <p className="text-xs font-semibold text-[#8A7E63] uppercase tracking-widest
                        text-center mb-8">
            Why Mise
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {FEATURES.map(({ Icon, title, desc }) => (
              <div
                key={title}
                className="bg-[#F5EFE0] border border-[#E4DCC9] rounded-xl p-5"
              >
                <Icon size={20} strokeWidth={1.75} className="text-[#1A2E45] mb-3" />
                <p className="text-sm font-medium text-[#1A2E45] mb-1.5">{title}</p>
                <p className="text-sm text-[#52617A] leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Story ────────────────────────────────────────────────────────── */}
      <section className="max-w-[720px] mx-auto px-6 py-16 text-center">
        <p className="font-serif italic text-2xl text-[#1A2E45] mb-5">
          mise en place
        </p>
        <p className="text-[#42526A] text-base sm:text-lg leading-relaxed
                      max-w-[500px] mx-auto">
          "Everything in its place." Mise does the prep — the macros, the math,
          the planning — so all you have to do is follow it.
        </p>
      </section>

      {/* ── Closing band ─────────────────────────────────────────────────── */}
      <section className="bg-[#1A2E45] px-6 py-16 text-center">
        <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#F5EFE0]
                       leading-tight mb-8">
          Ready to eat with intention?
        </h2>
        <button
          onClick={scrollToEmail}
          className="bg-[#F5EFE0] text-[#1A2E45] text-sm font-semibold px-6 py-3
                     rounded-xl hover:bg-white transition-colors"
        >
          Join the waitlist
        </button>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="max-w-[720px] mx-auto px-6 py-6 flex items-center justify-between
                         border-t border-[#E4DCC9]">
        <span className="font-serif font-semibold text-[#1A2E45]">Mise</span>
        <span className="text-xs text-[#8A7E63]">© 2026 · mise.fit</span>
      </footer>

    </div>
  )
}
