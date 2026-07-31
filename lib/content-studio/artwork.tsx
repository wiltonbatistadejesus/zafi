import { ImageResponse } from 'next/og'
import type { StudioContent, StudioPage, StudioVersion } from './types'

type ArtworkInput = {
  content: StudioContent
  version: StudioVersion
  page: StudioPage
  logoDataUri: string
}

const colors = {
  blue: '#1565ff',
  navy: '#0f172a',
  light: '#e9f0ff',
  white: '#ffffff',
  cyan: '#72e8ff',
  signal: '#ffcf5a',
  success: '#2dd4a2',
}

function decoration(variant: string, portrait: boolean) {
  const base = portrait ? 450 : 350
  if (variant === 'signal') {
    return <div style={{ position: 'absolute', right: -90, top: 120, width: base, height: base, borderRadius: '50%', background: colors.signal, opacity: .92 }} />
  }
  if (variant === 'grid') {
    return <div style={{ position: 'absolute', right: 70, top: 100, width: base, height: base, display: 'flex', flexWrap: 'wrap', gap: 18, opacity: .9 }}>
      {[0, 1, 2, 3].map((item) => <div key={item} style={{ width: '46%', height: '46%', borderRadius: 28, border: `5px solid ${item === 0 ? colors.blue : '#b8caff'}`, background: item === 0 ? colors.blue : 'transparent' }} />)}
    </div>
  }
  if (variant === 'path') {
    return <div style={{ position: 'absolute', right: 40, top: 90, width: base, height: base, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '92%', height: 16, borderRadius: 20, background: colors.blue, transform: 'rotate(-24deg)' }} />
      <div style={{ position: 'absolute', right: 40, top: 50, width: 68, height: 68, borderRadius: '50%', background: colors.cyan, border: `12px solid ${colors.white}` }} />
    </div>
  }
  if (variant === 'split') {
    return <div style={{ position: 'absolute', right: 0, top: 0, width: '38%', height: '100%', background: colors.navy, display: 'flex' }}>
      <div style={{ width: 150, height: 150, borderRadius: '50%', border: `24px solid ${colors.cyan}`, margin: '110px auto 0' }} />
    </div>
  }
  if (variant === 'ledger') {
    return <div style={{ position: 'absolute', right: 68, top: 90, width: base, display: 'flex', flexDirection: 'column', gap: 24 }}>
      {[74, 96, 56, 84].map((width, index) => <div key={index} style={{ display: 'flex', alignItems: 'center', gap: 16 }}><span style={{ width: 34, fontSize: 22, color: colors.blue }}>0{index + 1}</span><i style={{ display: 'flex', width: `${width}%`, height: 16, borderRadius: 12, background: index === 2 ? colors.cyan : colors.blue }} /></div>)}
    </div>
  }
  return <div style={{ position: 'absolute', right: -120, top: -80, width: base + 120, height: base + 120, borderRadius: '50%', background: 'radial-gradient(circle at 35% 35%, #ffffff, #cddcff 52%, #72e8ff)', opacity: .95 }} />
}

export function renderStudioArtwork({ content, version, page, logoDataUri }: ArtworkInput) {
  const portrait = content.format.height > 1500
  const dark = version.design_variant === 'split'
  const headlineSize = page.art_text.length > 78 ? 62 : page.art_text.length > 48 ? 76 : portrait ? 102 : 92
  const width = content.format.width
  const height = content.format.height
  const proof = `${content.network.slug.toUpperCase()} / ${content.format.slug.toUpperCase()} / V${version.version_number} / P${String(page.page_number).padStart(2, '0')}`

  return new ImageResponse(
    <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: portrait ? '78px 78px 72px' : '64px 68px 58px', color: colors.navy, background: dark ? colors.light : colors.white, fontFamily: 'Inter, Arial, sans-serif' }}>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', opacity: .55, backgroundImage: 'linear-gradient(rgba(21,101,255,.055) 1px, transparent 1px), linear-gradient(90deg, rgba(21,101,255,.055) 1px, transparent 1px)', backgroundSize: '54px 54px' }} />
      {decoration(version.design_variant, portrait)}

      <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 3 }}>
        <img src={logoDataUri} width="190" height="72" alt="Zafi" style={{ objectFit: 'contain' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px', borderRadius: 999, background: dark ? colors.white : colors.light, color: colors.blue, fontSize: 20, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 2 }}>{content.category.label}</div>
      </div>

      <div style={{ position: 'relative', zIndex: 3, width: dark ? '58%' : '72%', marginTop: portrait ? 340 : 250, display: 'flex', flexDirection: 'column' }}>
        <span style={{ color: colors.blue, fontSize: 24, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 4 }}>{content.theme}</span>
        <div style={{ width: 96, height: 12, margin: '30px 0 34px', borderRadius: 20, background: colors.blue, display: 'flex' }} />
        <h1 style={{ margin: 0, color: colors.navy, fontSize: headlineSize, lineHeight: 1.02, letterSpacing: -4, fontWeight: 900 }}>{page.art_text}</h1>
      </div>

      <div style={{ position: 'relative', zIndex: 3, marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 28, borderTop: `4px solid ${dark ? '#cad7ef' : colors.navy}` }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <strong style={{ fontSize: 25, fontWeight: 850 }}>Zafi. O seu bolso agradece.</strong>
            <span style={{ color: '#52637d', fontSize: 19 }}>Diagnóstico financeiro gratuito em meuzafi.com.br</span>
          </div>
          <span style={{ width: 58, height: 58, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', background: colors.blue, color: colors.white, fontSize: 30 }}>→</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#718096', fontSize: 15, fontFamily: 'ui-monospace, monospace', letterSpacing: 1.4 }}>
          <span>{proof}</span><span>APROVAÇÃO HUMANA OBRIGATÓRIA</span>
        </div>
      </div>
    </div>,
    { width, height },
  )
}
