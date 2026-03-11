import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export default function TestimonialCarousel({ testimonials }) {
  const [current, setCurrent] = useState(0)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (paused) return
    const id = setInterval(() => {
      setCurrent(prev => (prev + 1) % testimonials.length)
    }, 4500)
    return () => clearInterval(id)
  }, [paused, testimonials.length])

  const t = testimonials[current]

  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-xl mx-auto rounded-3xl p-8 md:p-10"
          style={{
            background: 'rgba(255,255,255,0.035)',
            border: '1px solid rgba(255,255,255,0.08)',
            backdropFilter: 'blur(16px)',
          }}
        >
          {/* Stars */}
          <div className="flex gap-1 mb-5">
            {Array(5).fill(0).map((_, i) => (
              <span key={i} className="text-amber-400 text-sm">★</span>
            ))}
          </div>

          <p
            className="text-lg leading-relaxed text-white/80 mb-7 italic"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            "{t.text}"
          </p>

          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-white font-black text-sm flex-shrink-0"
              style={{ background: `linear-gradient(135deg, ${t.color}, ${t.color}88)` }}
            >
              {t.avatar}
            </div>
            <div>
              <div className="text-white font-bold text-sm">{t.name}</div>
              <div className="text-white/40 text-xs mt-0.5" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                {t.role} · {t.city}
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Dots */}
      <div className="flex justify-center gap-2 mt-7">
        {testimonials.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className="rounded-full transition-all duration-300"
            style={{
              height: '5px',
              width: i === current ? '28px' : '8px',
              background: i === current ? '#6366f1' : 'rgba(255,255,255,0.15)',
            }}
          />
        ))}
      </div>
    </div>
  )
}
