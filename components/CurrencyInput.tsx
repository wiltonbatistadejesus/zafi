// -----------------------------------------------
// CurrencyInput — BRL-masked input field
// -----------------------------------------------
// Formats digits as Brazilian currency while typing:
//   User types "150000" → displays "1.500,00"
// Only digits are stored; the mask is visual only.

'use client'

import { ChangeEvent } from 'react'
import { maskBRL } from '@/lib/calculations'

interface CurrencyInputProps {
  label: string
  value: string           // The displayed (masked) value, e.g. "1.500,00"
  onChange: (masked: string, rawDigits: string) => void
  placeholder?: string
  required?: boolean
  className?: string
  id?: string
}

export default function CurrencyInput({
  label,
  value,
  onChange,
  placeholder = '0,00',
  required = false,
  className = '',
  id,
}: CurrencyInputProps) {
  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    // Strip everything except digits, then re-mask
    const rawDigits = e.target.value.replace(/\D/g, '')
    const masked = maskBRL(rawDigits)
    onChange(masked, rawDigits)
  }

  const inputId = id ?? `currency-${label.toLowerCase().replace(/\s/g, '-')}`

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label htmlFor={inputId} className="text-sm font-medium text-zafi-text">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      <div className="relative">
        {/* R$ prefix */}
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zafi-secondary font-medium text-sm select-none">
          R$
        </span>

        <input
          id={inputId}
          type="text"
          inputMode="numeric"  // Shows numeric keyboard on mobile
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          required={required}
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-zafi-border
                     text-zafi-text placeholder-zafi-secondary
                     focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent
                     bg-white text-base transition-all"
        />
      </div>
    </div>
  )
}
