// -----------------------------------------------
// Step 1 — Hero / Landing
// -----------------------------------------------
'use client'

import Logo from '@/components/Logo'
import Button from '@/components/Button'

interface HeroProps {
  onStart: () => void
}

export default function Hero({ onStart }: HeroProps) {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(160deg, #e9f0ff 0%, #ffffff 60%)' }}>
      {/* Nav */}
      <header className="flex items-center justify-between px-6 py-4 max-w-5xl mx-auto w-full">
        <Logo size="md" />
        <span className="text-xs font-semibold text-white px-3 py-1 rounded-full"
          style={{ background: 'linear-gradient(135deg, #1565ff, #0d47d9)' }}>
          100% gratuito
        </span>
      </header>

      {/* Hero content */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12 text-center max-w-2xl mx-auto w-full">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold px-4 py-1.5 rounded-full mb-6">
          <span>✦</span>
          <span>Sem custo. Sem pegadinha.</span>
        </div>

        {/* Headline */}
        <h1 className="text-4xl md:text-5xl font-extrabold text-zafi-text leading-tight mb-4">
          Organize, entenda e{' '}
          <span style={{
            background: 'linear-gradient(135deg, #1565ff, #0d47d9)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            saia das suas dívidas
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-zafi-secondary text-lg mb-8 max-w-md leading-relaxed">
          Você informa suas dívidas, a Zafi monta seu diagnóstico, cria um plano de saída e conecta você às melhores opções de renegociação. Em minutos.
        </p>

        {/* CTA */}
        <Button size="lg" onClick={onStart} className="mb-4 px-10">
          Começar meu plano →
        </Button>
        <p className="text-zafi-secondary text-xs">
          Leva menos de 3 minutos · Sem cadastro prévio
        </p>

        {/* Mini-cards */}
        <div className="grid grid-cols-3 gap-3 mt-12 w-full max-w-md">
          {[
            { num: '1', title: 'Organize', desc: 'Cadastre suas dívidas' },
            { num: '2', title: 'Plano', desc: 'Receba seu raio-x' },
            { num: '3', title: 'Negocie', desc: 'Conecte-se a parceiros' },
          ].map((card) => (
            <div
              key={card.num}
              className="bg-white rounded-2xl p-4 border border-zafi-border shadow-sm text-center"
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold mx-auto mb-2"
                style={{ background: 'linear-gradient(135deg, #1565ff, #0d47d9)' }}
              >
                {card.num}
              </div>
              <p className="text-zafi-text font-semibold text-sm">{card.title}</p>
              <p className="text-zafi-secondary text-xs mt-0.5">{card.desc}</p>
            </div>
          ))}
        </div>
      </main>

      {/* Footer tagline */}
      <footer className="text-center pb-6 text-zafi-secondary text-sm">
        Sua vida financeira mais leve. ✦
      </footer>
    </div>
  )
}
