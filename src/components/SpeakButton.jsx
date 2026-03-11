import { motion, AnimatePresence } from 'framer-motion'

/**
 * SpeakButton
 *
 * Props:
 *   isActive  — true when this button's audio is currently playing
 *   onSpeak   — called when user clicks to start
 *   onStop    — called when user clicks to stop
 *   label     — short tag shown below icon, e.g. "EN" or "अ"
 *   size      — 'sm' | 'md' | 'lg'
 *   disabled  — disables the button entirely
 */
export default function SpeakButton({
  isActive = false,
  onSpeak,
  onStop,
  label = 'EN',
  size = 'md',
  disabled = false,
}) {
  const dims = {
    sm: { btn: 'w-8 h-8',  ring: 'w-8 h-8',  icon: 'text-sm', tag: 'text-[9px]' },
    md: { btn: 'w-11 h-11', ring: 'w-11 h-11', icon: 'text-lg', tag: 'text-[10px]' },
    lg: { btn: 'w-14 h-14', ring: 'w-14 h-14', icon: 'text-2xl', tag: 'text-xs' },
  }[size] ?? { btn: 'w-11 h-11', ring: 'w-11 h-11', icon: 'text-lg', tag: 'text-[10px]' }

  function handleClick() {
    if (disabled) return
    isActive ? onStop?.() : onSpeak?.()
  }

  return (
    <div className="flex flex-col items-center gap-0.5 select-none">
      {/* Button + ripple wrapper */}
      <div className={`relative flex items-center justify-center ${dims.ring}`}>

        {/* Ripple rings — emit while active */}
        <AnimatePresence>
          {isActive && (
            <>
              {[0, 0.38, 0.76].map(delay => (
                <motion.span
                  key={delay}
                  className={`absolute rounded-full border border-blue-400 ${dims.ring}`}
                  initial={{ scale: 1, opacity: 0.7 }}
                  animate={{ scale: 2.6, opacity: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{
                    duration: 1.3,
                    repeat: Infinity,
                    delay,
                    ease: 'easeOut',
                  }}
                />
              ))}
            </>
          )}
        </AnimatePresence>

        {/* The button itself */}
        <motion.button
          whileHover={disabled ? {} : { scale: 1.1 }}
          whileTap={disabled ? {} : { scale: 0.88 }}
          animate={isActive
            ? { scale: [1, 1.06, 1], transition: { duration: 1.2, repeat: Infinity } }
            : { scale: 1 }
          }
          onClick={handleClick}
          disabled={disabled}
          aria-label={isActive ? `Stop ${label} audio` : `Play ${label} audio`}
          className={[
            'relative z-10 rounded-full flex items-center justify-center',
            'transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400',
            dims.btn,
            dims.icon,
            disabled
              ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
              : isActive
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                : 'bg-white border border-gray-200 text-gray-400 hover:border-blue-300 hover:text-blue-600 hover:shadow-sm',
          ].join(' ')}
        >
          {isActive ? '⏸' : '🔊'}
        </motion.button>
      </div>

      {/* Language label */}
      <span
        className={[
          'font-bold tracking-wide',
          dims.tag,
          disabled ? 'text-gray-300' : isActive ? 'text-blue-600' : 'text-gray-400',
        ].join(' ')}
      >
        {label}
      </span>
    </div>
  )
}
