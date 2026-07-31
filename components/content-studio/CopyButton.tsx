'use client'

import { useState } from 'react'

export default function CopyButton({ value, label = 'Copiar' }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  return <button type="button" onClick={async () => { await navigator.clipboard.writeText(value); setCopied(true); window.setTimeout(() => setCopied(false), 1600) }}>{copied ? 'Copiado' : label}</button>
}
