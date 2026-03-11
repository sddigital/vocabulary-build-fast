import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence, useInView } from 'framer-motion'
import LevelBadge from './Landing/LevelBadge'
import FeatureCard from './Landing/FeatureCard'
import TestimonialCarousel from './Landing/TestimonialCarousel'
import data from '../data/landingData.json'

// ─── Animated number counter ──────────────────────────────────────────────────
function Counter({ target, suffix = '' }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true })
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!inView) return
    const duration = 1600
    const start = performance.now()
    const tick = now => {
      const p = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - p, 3)
      setCount(Math.floor(eased * target))
      if (p < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [inView, target])

  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>
}

// ─── Glowing background orbs ──────────────────────────────────────────────────
function Orbs() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      <motion.div
        animate={{ x: [0, 40, 0], y: [0, -30, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.22) 0%, transparent 70%)' }}
      />
      <motion.div
        animate={{ x: [0, -30, 0], y: [0, 40, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut', delay: 4 }}
        className="absolute top-1/3 -right-32 w-[420px] h-[420px] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(236,72,153,0.18) 0%, transparent 70%)' }}
      />
      <motion.div
        animate={{ x: [0, 25, 0], y: [0, 30, 0] }}
        transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut', delay: 8 }}
        className="absolute -bottom-20 left-1/3 w-[380px] h-[380px] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(245,158,11,0.14) 0%, transparent 70%)' }}
      />
    </div>
  )
}

// ─── Navbar ───────────────────────────────────────────────────────────────────
function Navbar({ onStart }) {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-6 py-4 transition-all duration-300"
      style={{
        background: scrolled ? 'rgba(8,8,26,0.85)' : 'transparent',
        backdropFilter: scrolled ? 'blur(16px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(255,255,255,0.06)' : '1px solid transparent',
      }}
    >
      <div className="flex items-center gap-2.5">
        <span className="text-xl">📖</span>
        <span className="font-black text-white text-base tracking-tight" style={{ fontFamily: "'Sora', sans-serif" }}>
          Vocab<span style={{ color: '#6366f1' }}>Pro</span>
        </span>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={onStart}
          className="text-sm text-white/40 hover:text-white/70 transition-colors hidden sm:block"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          Already practising?
        </button>
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
          onClick={onStart}
          className="text-sm font-bold px-5 py-2 rounded-full"
          style={{
            background: 'rgba(99,102,241,0.15)',
            border: '1px solid rgba(99,102,241,0.35)',
            color: '#a5b4fc',
            fontFamily: "'Sora', sans-serif",
          }}
        >
          Open App →
        </motion.button>
      </div>
    </motion.nav>
  )
}

// ─── PWA Install Banner ───────────────────────────────────────────────────────
function InstallBanner() {
  const [prompt, setPrompt] = useState(null)
  const [show, setShow] = useState(false)

  useEffect(() => {
    const handler = e => { e.preventDefault(); setPrompt(e); setShow(true) }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  if (!show) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 px-5 py-3.5 rounded-2xl shadow-2xl"
        style={{
          background: 'rgba(20,20,40,0.95)',
          border: '1px solid rgba(99,102,241,0.4)',
          backdropFilter: 'blur(16px)',
          boxShadow: '0 0 40px rgba(99,102,241,0.2)',
        }}
      >
        <span className="text-2xl">📱</span>
        <span className="text-white/80 text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>
          Install for offline use
        </span>
        <button
          onClick={() => { prompt?.prompt(); setShow(false) }}
          className="text-sm font-bold px-4 py-1.5 rounded-full text-white"
          style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
        >
          Install
        </button>
        <button onClick={() => setShow(false)} className="text-white/30 hover:text-white/60 text-sm">✕</button>
      </motion.div>
    </AnimatePresence>
  )
}

// ─── Main landing page ────────────────────────────────────────────────────────
export default function LandingPage({ onStart }) {
  const container = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.11 } },
  }
  const item = {
    hidden: { opacity: 0, y: 32 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] } },
  }

  return (
    <div
      style={{
        background: '#08081a',
        fontFamily: "'Sora', sans-serif",
        minHeight: '100vh',
        color: 'white',
        overflowX: 'hidden',
      }}
    >
      <Navbar onStart={onStart} />
      <InstallBanner />

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center pt-20">
        <Orbs />

        <div className="relative z-10 w-full max-w-6xl mx-auto px-6 py-16">
          <div className="grid lg:grid-cols-2 gap-14 items-center">

            {/* Left: copy */}
            <motion.div variants={container} initial="hidden" animate="visible">

              <motion.div variants={item} className="mb-6">
                <span
                  className="inline-flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-full"
                  style={{
                    background: 'rgba(245,158,11,0.12)',
                    border: '1px solid rgba(245,158,11,0.3)',
                    color: '#fcd34d',
                  }}
                >
                  🏆 CBSE Classes 5–12 · SSC · UPSC · Banking · NEET · JEE
                </span>
              </motion.div>

              <motion.h1
                variants={item}
                className="text-5xl lg:text-6xl font-black leading-tight mb-6"
                style={{ letterSpacing: '-0.025em' }}
              >
                Master English{' '}
                <span
                  style={{
                    background: 'linear-gradient(100deg, #6366f1 0%, #ec4899 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  Vocabulary
                </span>
                <br />
                <span style={{ color: 'rgba(255,255,255,0.75)' }}>for Every Exam.</span>
              </motion.h1>

              <motion.p
                variants={item}
                className="text-base lg:text-lg text-white/55 max-w-md mb-10 leading-relaxed"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                From word-matching quizzes for beginners to UPSC-level cloze tests —
                1500 to 5000 hand-curated words across 3 learning levels, 9 quiz formats.
              </motion.p>

              <motion.div variants={item} className="flex flex-wrap gap-4 mb-10">
                <motion.button
                  whileHover={{ scale: 1.04, boxShadow: '0 0 56px rgba(99,102,241,0.55)' }}
                  whileTap={{ scale: 0.97 }}
                  onClick={onStart}
                  className="flex items-center gap-2.5 px-8 py-4 rounded-2xl font-black text-base text-white"
                  style={{
                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                    boxShadow: '0 0 28px rgba(99,102,241,0.38)',
                  }}
                >
                  Start Learning Free <span className="text-lg">→</span>
                </motion.button>

              </motion.div>

              <motion.div variants={item} className="flex flex-wrap gap-5">
                {['✓ Free forever', '✓ No sign-up', '✓ No ads', '✓ Works offline'].map(t => (
                  <span
                    key={t}
                    className="text-xs text-white/35"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                  >
                    {t}
                  </span>
                ))}
              </motion.div>
            </motion.div>

            {/* Right: floating level badges */}
            <div className="flex flex-row lg:flex-col gap-4 flex-wrap justify-center lg:justify-end">
              {data.levels.map((level, i) => (
                <LevelBadge key={level.id} level={level} index={i} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS BAR ────────────────────────────────────────────────────── */}
      <section
        className="py-16"
        style={{ borderTop: '1px solid rgba(255,255,255,0.055)', borderBottom: '1px solid rgba(255,255,255,0.055)', background: 'rgba(255,255,255,0.018)' }}
      >
        <div className="max-w-4xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-10">
          {data.stats.map(({ value, label, icon }) => {
            const num = parseInt(value.replace(/\D/g, ''))
            const suf = value.replace(/[\d]/g, '')
            return (
              <div key={label} className="text-center">
                <div className="text-3xl mb-2.5">{icon}</div>
                <div className="text-3xl md:text-4xl font-black text-white mb-1.5">
                  <Counter target={num} suffix={suf} />
                </div>
                <div className="text-white/40 text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>{label}</div>
              </div>
            )
          })}
        </div>
      </section>

      {/* ── FEATURE CARDS ────────────────────────────────────────────────── */}
      <section className="py-28 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-5xl font-black mb-4 leading-tight">
              Everything you need to{' '}
              <span style={{ color: '#6366f1' }}>score higher</span>
            </h2>
            <p className="text-white/45 max-w-md mx-auto" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Purpose-built for Indian students and competitive exam aspirants
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {data.features.map((f, i) => <FeatureCard key={f.title} feature={f} index={i} />)}
          </div>
        </div>
      </section>

      {/* ── LEVEL COMPARISON ─────────────────────────────────────────────── */}
      <section
        className="py-28 px-6"
        style={{ background: 'rgba(255,255,255,0.015)', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
      >
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-5xl font-black mb-4">Choose your level</h2>
            <p className="text-white/45" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Content matched to your current stage — switch anytime
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {data.levels.map((level, i) => {
              const icons = ['📗', '📘', '📕']
              return (
                <motion.div
                  key={level.id}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  whileHover={{ y: -6 }}
                  className="rounded-3xl p-7"
                  style={{
                    border: `1px solid ${level.color}30`,
                    background: `${level.color}0a`,
                    transition: 'transform 0.3s ease',
                  }}
                >
                  <div className="text-4xl mb-5">{icons[i]}</div>
                  <div className="text-xl font-black text-white mb-1">{level.label}</div>
                  <div className="text-sm font-bold mb-1" style={{ color: level.color }}>{level.sublabel}</div>
                  <div
                    className="text-xs text-white/35 mb-5"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                  >
                    {level.words}
                  </div>
                  <div className="flex flex-col gap-2.5">
                    {level.formats.map(f => (
                      <div key={f} className="flex items-center gap-2.5 text-sm text-white/55">
                        <span style={{ color: level.color, fontSize: '10px' }}>✦</span>
                        <span style={{ fontFamily: "'DM Sans', sans-serif" }}>{f}</span>
                      </div>
                    ))}
                  </div>
                  <button
                    className="mt-7 w-full py-2.5 rounded-xl text-sm font-bold transition-all duration-200 hover:opacity-90"
                    style={{
                      background: `${level.color}18`,
                      border: `1px solid ${level.color}35`,
                      color: level.color,
                    }}
                    onClick={onStart}
                  >
                    Start this level →
                  </button>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ─────────────────────────────────────────────────── */}
      <section className="py-28 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-5xl font-black mb-4 leading-tight">
              Students love it.{' '}
              <span
                style={{
                  background: 'linear-gradient(100deg, #ec4899, #f59e0b)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                Exams prove it.
              </span>
            </h2>
            <p className="text-white/45" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Real results from students across India
            </p>
          </motion.div>

          <TestimonialCarousel testimonials={data.testimonials} />
        </div>
      </section>

      {/* ── FINAL CTA ────────────────────────────────────────────────────── */}
      <section className="py-28 px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative max-w-2xl mx-auto rounded-3xl p-12 md:p-16 text-center overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(99,102,241,0.14), rgba(236,72,153,0.08))',
            border: '1px solid rgba(99,102,241,0.22)',
            boxShadow: '0 0 100px rgba(99,102,241,0.12)',
          }}
        >
          {/* background glow */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.15) 0%, transparent 65%)' }}
            aria-hidden
          />

          <div className="relative z-10">
            <div className="text-5xl mb-6">🚀</div>
            <h2 className="text-3xl md:text-4xl font-black mb-4">
              Ready to level up your English?
            </h2>
            <p
              className="text-white/50 mb-9 max-w-sm mx-auto leading-relaxed"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              Join thousands of students who've improved their scores with daily vocabulary practice.
            </p>

            <motion.button
              whileHover={{ scale: 1.05, boxShadow: '0 0 70px rgba(99,102,241,0.65)' }}
              whileTap={{ scale: 0.97 }}
              onClick={onStart}
              className="px-10 py-4 rounded-2xl font-black text-lg text-white"
              style={{
                background: 'linear-gradient(135deg, #6366f1, #ec4899)',
                boxShadow: '0 0 32px rgba(99,102,241,0.42)',
              }}
            >
              Start Learning Free →
            </motion.button>

            <p
              className="text-white/25 text-xs mt-5"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              No account needed · Works on any device · 100% free
            </p>
          </div>
        </motion.div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────────── */}
      <footer
        className="py-10 px-6"
        style={{ borderTop: '1px solid rgba(255,255,255,0.055)' }}
      >
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-5">
          <div className="flex items-center gap-2">
            <span>📖</span>
            <span className="font-black text-white">VocabPro</span>
          </div>
          <div
            className="flex gap-6 text-white/30 text-sm"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            <span>✓ Free to use</span>
            <span>✓ No tracking</span>
            <span>✓ No ads</span>
          </div>
          <div
            className="text-white/20 text-xs"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            Built for Indian students 🇮🇳
          </div>
        </div>
      </footer>
    </div>
  )
}
