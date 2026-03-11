import { motion } from 'framer-motion'

const colorMap = {
  emerald: {
    bg: 'rgba(16,185,129,0.07)',
    border: 'rgba(16,185,129,0.2)',
    hoverBorder: 'rgba(16,185,129,0.5)',
    glow: 'rgba(16,185,129,0.2)',
    badge: 'rgba(16,185,129,0.15)',
    text: '#10b981',
  },
  indigo: {
    bg: 'rgba(99,102,241,0.07)',
    border: 'rgba(99,102,241,0.2)',
    hoverBorder: 'rgba(99,102,241,0.5)',
    glow: 'rgba(99,102,241,0.2)',
    badge: 'rgba(99,102,241,0.15)',
    text: '#6366f1',
  },
  amber: {
    bg: 'rgba(245,158,11,0.07)',
    border: 'rgba(245,158,11,0.2)',
    hoverBorder: 'rgba(245,158,11,0.5)',
    glow: 'rgba(245,158,11,0.2)',
    badge: 'rgba(245,158,11,0.15)',
    text: '#f59e0b',
  },
}

export default function FeatureCard({ feature, index }) {
  const c = colorMap[feature.color]

  return (
    <motion.div
      initial={{ opacity: 0, y: 48 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ delay: index * 0.12, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{
        y: -8,
        boxShadow: `0 24px 64px ${c.glow}`,
        borderColor: c.hoverBorder,
      }}
      style={{
        background: c.bg,
        border: `1px solid ${c.border}`,
        backdropFilter: 'blur(14px)',
        transition: 'border-color 0.3s, box-shadow 0.3s, transform 0.3s',
      }}
      className="rounded-3xl p-7 flex flex-col gap-5 cursor-default"
    >
      <div className="text-4xl">{feature.icon}</div>

      <div>
        <span
          className="text-xs font-bold px-3 py-1 rounded-full"
          style={{ background: c.badge, color: c.text }}
        >
          {feature.level}
        </span>
      </div>

      <div>
        <h3 className="text-xl font-black text-white mb-2">{feature.title}</h3>
        <p className="text-white/55 text-sm leading-relaxed" style={{ fontFamily: "'DM Sans', sans-serif" }}>
          {feature.description}
        </p>
      </div>

      <div
        className="mt-auto pt-4 border-t text-xs font-semibold flex items-center gap-1.5"
        style={{ borderColor: c.border, color: c.text }}
      >
        <span>Explore</span>
        <span>→</span>
      </div>
    </motion.div>
  )
}
