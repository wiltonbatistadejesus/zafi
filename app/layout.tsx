// -----------------------------------------------
// Root Layout — wraps every page in the app
// -----------------------------------------------
import type { Metadata } from 'next'
import Script from 'next/script'
import './globals.css'

export const metadata: Metadata = {
  title: 'Zafi · Sua vida financeira mais leve',
  description:
    'Organize suas dívidas, receba um diagnóstico financeiro e descubra o caminho mais inteligente para sair do endividamento. Grátis.',
  keywords: ['dívidas', 'renegociação', 'finanças pessoais', 'sair das dívidas', 'zafi'],
  // og:image and other Open Graph tags — add before launch:
  // openGraph: { images: ['/og-image.png'] },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const adsenseId = process.env.NEXT_PUBLIC_ADSENSE_ID

  return (
    <html lang="pt-BR">
      <head>
        {/* Google AdSense — só carrega quando o publisher ID estiver configurado */}
        {adsenseId && adsenseId !== 'ca-pub-XXXXXXXXXXXXXXXX' && (
          <Script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseId}`}
            crossOrigin="anonymous"
            strategy="afterInteractive"
          />
        )}
      </head>
      <body>
        {children}
      </body>
    </html>
  )
}
