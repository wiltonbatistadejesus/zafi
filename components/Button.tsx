// -----------------------------------------------
// Button component — primary / secondary variants
// -----------------------------------------------
import { ReactNode } from 'react'

interface ButtonProps {
  children: ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  type?: 'button' | 'submit'
  className?: string
  fullWidth?: boolean
}

export default function Button({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled = false,
  type = 'button',
  className = '',
  fullWidth = false,
}: ButtonProps) {
  const base =
    'inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed'

  const variants = {
    primary:
      'text-white shadow-md hover:shadow-lg active:scale-95',
    secondary:
      'bg-zafi-bg text-zafi-blue border border-zafi-border hover:bg-blue-100 active:scale-95',
    outline:
      'bg-transparent text-zafi-blue border-2 border-zafi-blue hover:bg-zafi-bg active:scale-95',
  }

  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
  }

  // Primary gradient applied inline (Tailwind can't interpolate arbitrary gradient stops easily)
  const primaryStyle =
    variant === 'primary'
      ? { background: 'linear-gradient(135deg, #1565ff, #0d47d9)' }
      : {}

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={primaryStyle}
      className={`${base} ${variants[variant]} ${sizes[size]} ${
        fullWidth ? 'w-full' : ''
      } ${className}`}
    >
      {children}
    </button>
  )
}
