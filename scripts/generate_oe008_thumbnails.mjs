import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = resolve('public/content-factory/oe-008')

const pilots = [
  {
    slug: 'institucional',
    eyebrow: 'ZAFI / DIAGNÓSTICO',
    lines: ['Entenda', 'antes de', 'decidir'],
    accent: '#72e8ff',
    variants: ['ink', 'split', 'signal'],
  },
  {
    slug: 'educacional',
    eyebrow: 'QUAL DÍVIDA',
    lines: ['Qual pagar', 'primeiro?'],
    accent: '#2dd4a2',
    variants: ['blue', 'cards', 'light'],
  },
  {
    slug: 'viral',
    eyebrow: 'JUROS ALTOS',
    lines: ['Ela cresce', 'escondida'],
    accent: '#ffcf5a',
    variants: ['signal', 'counter', 'ink'],
  },
]

const palettes = {
  ink: ['#07101f', '#102447', '#f8fbff'],
  split: ['#0b2557', '#1565ff', '#ffffff'],
  signal: ['#ffcf5a', '#f4ad29', '#07101f'],
  blue: ['#0b56e8', '#0a2e83', '#ffffff'],
  cards: ['#07101f', '#15366f', '#ffffff'],
  light: ['#eef4ff', '#cfe0ff', '#07101f'],
  counter: ['#2b1524', '#a33352', '#ffffff'],
}

function esc(value) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
}

function svg(pilot, variant, index) {
  const [background, glow, foreground] = palettes[variant]
  const lineMarkup = pilot.lines
    .map((line, lineIndex) => `<text x="62" y="${385 + lineIndex * 112}" fill="${foreground}" font-family="Inter,Arial,sans-serif" font-size="${line.length > 11 ? 75 : 91}" font-weight="850" letter-spacing="-5">${esc(line)}</text>`)
    .join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="540" height="960" viewBox="0 0 540 960" role="img" aria-label="${esc(pilot.lines.join(' '))}">
  <defs>
    <radialGradient id="g" cx="90%" cy="5%" r="90%"><stop offset="0" stop-color="${glow}"/><stop offset=".62" stop-color="${background}"/></radialGradient>
    <filter id="blur"><feGaussianBlur stdDeviation="35"/></filter>
  </defs>
  <rect width="540" height="960" rx="28" fill="url(#g)"/>
  <circle cx="${index === 1 ? 85 : 470}" cy="${index === 2 ? 700 : 250}" r="170" fill="${pilot.accent}" opacity=".16" filter="url(#blur)"/>
  <text x="48" y="76" fill="${foreground}" opacity=".72" font-family="ui-monospace,monospace" font-size="17" font-weight="700" letter-spacing="4">${esc(pilot.eyebrow)}</text>
  <text x="48" y="140" fill="${foreground}" font-family="Inter,Arial,sans-serif" font-size="45" font-weight="900" letter-spacing="-3">zafi</text>
  <circle cx="128" cy="113" r="6" fill="${pilot.accent}"/>
  <path d="M48 190H492" stroke="${foreground}" opacity=".18"/>
  ${lineMarkup}
  <g transform="translate(48 760)">
    <rect width="444" height="92" rx="17" fill="${foreground}" opacity=".09"/>
    <circle cx="47" cy="46" r="22" fill="${pilot.accent}"/>
    <path d="m40 46 6 6 10-13" fill="none" stroke="${background}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
    <text x="84" y="39" fill="${foreground}" opacity=".68" font-family="ui-monospace,monospace" font-size="14" font-weight="700">DIAGNÓSTICO GRATUITO</text>
    <text x="84" y="64" fill="${foreground}" font-family="Inter,Arial,sans-serif" font-size="17" font-weight="750">meuzafi.com.br</text>
  </g>
  <text x="48" y="911" fill="${foreground}" opacity=".46" font-family="ui-monospace,monospace" font-size="12" letter-spacing="2">OE-008 · OPÇÃO ${index + 1} · DRAFT</text>
</svg>`
}

await Promise.all(pilots.flatMap((pilot) => pilot.variants.map(async (variant, index) => {
  const directory = resolve(root, pilot.slug)
  await mkdir(directory, { recursive: true })
  const suffix = ['a', 'b', 'c'][index]
  await writeFile(resolve(directory, `thumbnail-${suffix}.svg`), svg(pilot, variant, index), 'utf8')
})))

const brandDirectory = resolve('public/brand')
await mkdir(brandDirectory, { recursive: true })
await writeFile(resolve(brandDirectory, 'zafi-logo.svg'), `<svg xmlns="http://www.w3.org/2000/svg" width="500" height="190" viewBox="0 0 500 190" role="img" aria-label="Zafi">
  <text x="8" y="154" fill="#0f172a" font-family="Inter,Arial,sans-serif" font-size="178" font-weight="850" letter-spacing="-11">zafı</text>
  <circle cx="397" cy="31" r="15" fill="#1565ff"/>
</svg>`, 'utf8')

console.log('OE-008 thumbnails generated: 9')
