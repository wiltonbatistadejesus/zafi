// -----------------------------------------------
// Card component — white surface with subtle shadow
// -----------------------------------------------
import { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  /** Accent color strip on the left border */
  accent?: 'blue' | 'green' | 'red' | 'yellow' | 'none'
  onClick?: () => void
}

const accentColors = {
  blue: 'border-l-4 border-l-blue-500',
  green: 'border-l-4 border-l-emerald-500',
  red: 'border-l-4 border-l-red-500',
  yellow: 'border-l-4 border-l-amber-400',
  none: '',
}

export default function Card({
  children,
  className = '',
  accent = 'none',
  onClick,
}: CardProps) {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-2xl shadow-sm border border-zafi-border p-5 ${accentColors[accent]} ${
        onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''
      } ${className}`}
    >
      {children}
    </div>
  )
}
