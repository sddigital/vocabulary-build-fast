import { motion } from 'framer-motion'

const palette = [
  { bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.35)', glow: 'rgba(16,185,129,0.2)', text: '#10b981', dot: '#34d399' },
  { bg: 'rgba(99,102,241,0.1)', border: 'rgba(99,102,241,0.35)', glow: 'rgba(99,102,241,0.2)', text: '#6366f1', dot: '#818cf8' },
  { bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.35)', glow: 'rgba(245,158,11,0.2)', text: '#f59e0b', dot: '#fcd34d' },
]

export default function LevelBadge({ level, index }) {
  const c = palette[index]

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.5 + index * 0.15, type: 'spring', stiffness: 90, damping: 14 }}
      whileHover={{ y: -4, boxShadow: `0 16px 48px ${c.glow}` }}
      style={{
        background: c.bg,
        border: `1px solid ${c.border}`,
        backdropFilter: 'blur(16px)',
        transition: 'box-shadow 0.3s ease, transform 0.3s ease',
      }}
      className="rounded-2xl p-5 cursor-default select-none min-w-[200px]"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-black" style={{ color: c.text }}>{level.label}</span>
        <span
          className="text-xs px-2 py-0.5 rounded-full font-semibold"
          style={{ background: `${c.text}22`, color: c.text }}
        >
          {level.sublabel}
        </span>
      </div>

      <div className="text-white font-bold text-base mb-3">{level.words}</div>

      <div className="flex flex-col gap-1.5">
        {level.formats.map(f => (
          <div key={f} className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: c.dot }} />
            <span className="text-xs text-white/50" style={{ fontFamily: "'DM Sans', sans-serif" }}>{f}</span>
          </div>
        ))}
      </div>
    </motion.div>
  )
}
