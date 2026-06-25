// -----------------------------------------------
// AdBanner — Google AdSense banner component
//
// Como usar:
// 1. Crie uma conta em https://adsense.google.com
// 2. Substitua NEXT_PUBLIC_ADSENSE_ID no .env.local pelo seu
//    publisher ID (formato: ca-pub-XXXXXXXXXXXXXXXX)
// 3. Substitua o data-ad-slot pelo ID do seu bloco de anúncio
// -----------------------------------------------
'use client'

import { useEffect, useRef } from 'react'

interface AdBannerProps {
  adSlot: string           // ID do bloco de anúncio do AdSense
  adFormat?: string        // 'auto' | 'rectangle' | 'horizontal'
  fullWidthResponsive?: boolean
  className?: string
}

export default function AdBanner({
  adSlot,
  adFormat = 'auto',
  fullWidthResponsive = true,
  className = '',
}: AdBannerProps) {
  const adRef = useRef<HTMLModElement>(null)
  const publisherId = process.env.NEXT_PUBLIC_ADSENSE_ID

  useEffect(() => {
    // Só inicializa se o publisher ID estiver configurado
    if (!publisherId || publisherId === 'ca-pub-XXXXXXXXXXXXXXXX') return

    try {
      // @ts-ignore
      if (typeof window !== 'undefined' && window.adsbygoogle) {
        // @ts-ignore
        ;(window.adsbygoogle = window.adsbygoogle || []).push({})
      }
    } catch (err) {
      console.error('AdSense error:', err)
    }
  }, [publisherId])

  // Não renderiza nada se o publisher ID não estiver configurado
  if (!publisherId || publisherId === 'ca-pub-XXXXXXXXXXXXXXXX') {
    return null
  }

  return (
    <div className={`w-full overflow-hidden ${className}`}>
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={publisherId}
        data-ad-slot={adSlot}
        data-ad-format={adFormat}
        data-full-width-responsive={fullWidthResponsive ? 'true' : 'false'}
      />
    </div>
  )
}
