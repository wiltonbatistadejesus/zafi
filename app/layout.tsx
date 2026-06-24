// -----------------------------------------------
// Root Layout — wraps every page in the app
// -----------------------------------------------
import type { Metadata } from 'next'
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
  return (
    <html lang="pt-BR">
      <body>
        {children}
      </body>
    </html>
  )
}
