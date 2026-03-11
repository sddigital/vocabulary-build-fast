import { motion } from 'framer-motion'

const variants = {
  primary: {
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    boxShadow: '0 0 24px rgba(99,102,241,0.4)',
    color: 'white',
  },
  secondary: {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.14)',
    color: 'rgba(255,255,255,0.75)',
  },
  ghost: {
    background: 'transparent',
    color: 'rgba(255,255,255,0.5)',
  },
}

export default function GlassButton({ children, onClick, variant = 'primary', className = '', size = 'md' }) {
  const sizeClasses = {
    sm: 'px-5 py-2.5 text-sm rounded-xl',
    md: 'px-8 py-4 text-base rounded-2xl',
    lg: 'px-10 py-5 text-lg rounded-2xl',
  }

  return (
    <motion.button
      whileHover={{
        scale: 1.04,
        y: -2,
        boxShadow: variant === 'primary' ? '0 0 48px rgba(99,102,241,0.55)' : undefined,
      }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      style={variants[variant]}
      className={`font-bold transition-colors duration-200 ${sizeClasses[size]} ${className}`}
    >
      {children}
    </motion.button>
  )
}
