import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import sharp from '../tmp/video-tools/node_modules/sharp/dist/index.mjs'
import ffmpegPath from '../tmp/video-tools/node_modules/ffmpeg-static/index.js'

const root = resolve(import.meta.dirname, '..')
const outputDir = join(root, 'public', 'content-factory', 'oe-012', 't0')
const audioPath = join(outputDir, 'narracao.wav')
const videoPath = join(outputDir, 'zafi-t0-sobra-mes.mp4')
const reportPath = join(outputDir, 'production-metadata.json')

mkdirSync(outputDir, { recursive: true })

const scenes = [
  {
    id: 'gancho',
    duration: 7,
    eyebrow: 'VIDA FINANCEIRA',
    title: 'Você recebe salário todo mês…',
    body: 'Então por que o dinheiro acaba antes do mês terminar?',
    accent: '#72e8ff',
    number: '01',
  },
  {
    id: 'problema',
    duration: 10,
    eyebrow: 'O PROBLEMA',
    title: 'Não é só sobre ganhar pouco.',
    body: 'Muitas vezes, ninguém ensinou você a enxergar para onde o dinheiro está indo.',
    accent: '#ffcf5a',
    number: '02',
  },
  {
    id: 'solucao',
    duration: 13,
    eyebrow: 'CLAREZA PRIMEIRO',
    title: 'Sua vida financeira, de um jeito simples.',
    body: 'A Zafi ajuda você a identificar desperdícios e tomar decisões melhores.',
    accent: '#2dd4a2',
    number: '03',
  },
  {
    id: 'cta',
    duration: 8,
    eyebrow: 'DIAGNÓSTICO GRATUITO',
    title: 'Quer descobrir para onde seu dinheiro está indo?',
    body: 'Conheça a Zafi.',
    accent: '#ffffff',
    number: '04',
    cta: 'meuzafi.com.br',
  },
]

function escapeXml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

function wrap(text, max = 28) {
  const words = text.split(/\s+/)
  const lines = []
  let current = ''
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word
    if (candidate.length > max && current) {
      lines.push(current)
      current = word
    } else {
      current = candidate
    }
  }
  if (current) lines.push(current)
  return lines
}

function textBlock(lines, x, y, size, lineHeight, weight, fill, maxLines = 6) {
  return lines.slice(0, maxLines).map((line, index) =>
    `<text x="${x}" y="${y + index * lineHeight}" fill="${fill}" font-family="Arial, sans-serif" font-size="${size}" font-weight="${weight}" letter-spacing="-1.5">${escapeXml(line)}</text>`,
  ).join('')
}

function sceneSvg(scene) {
  const titleLines = wrap(scene.title, 18)
  const bodyLines = wrap(scene.body, 31)
  const bodyY = 640 + titleLines.length * 98

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#071225"/>
        <stop offset="54%" stop-color="#0f2d66"/>
        <stop offset="100%" stop-color="#1565ff"/>
      </linearGradient>
      <radialGradient id="glow">
        <stop offset="0%" stop-color="${scene.accent}" stop-opacity=".44"/>
        <stop offset="100%" stop-color="${scene.accent}" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="1080" height="1920" fill="url(#bg)"/>
    <circle cx="920" cy="250" r="460" fill="url(#glow)"/>
    <circle cx="130" cy="1710" r="520" fill="url(#glow)" opacity=".48"/>
    <path d="M0 1460 C 280 1330, 740 1660, 1080 1470 L1080 1920 L0 1920Z" fill="#071225" opacity=".62"/>
    <rect x="72" y="72" width="936" height="1776" rx="52" fill="none" stroke="#ffffff" stroke-opacity=".13" stroke-width="2"/>

    <text x="88" y="154" fill="#ffffff" font-family="Arial, sans-serif" font-size="88" font-weight="900" letter-spacing="-6">zafi</text>
    <circle cx="245" cy="92" r="9" fill="#72e8ff"/>
    <text x="992" y="142" text-anchor="end" fill="#ffffff" fill-opacity=".48" font-family="Arial, sans-serif" font-size="34" font-weight="700">${scene.number}/04</text>

    <rect x="88" y="350" width="auto" height="56" rx="28" fill="${scene.accent}" fill-opacity=".14"/>
    <text x="116" y="391" fill="${scene.accent}" font-family="Arial, sans-serif" font-size="27" font-weight="800" letter-spacing="3">${scene.eyebrow}</text>

    ${textBlock(titleLines, 88, 530, 78, 94, 850, '#ffffff', 5)}
    ${textBlock(bodyLines, 88, bodyY, 47, 64, 500, '#e9f0ff', 6)}

    ${scene.cta ? `
      <rect x="88" y="1430" width="904" height="142" rx="71" fill="#ffffff"/>
      <text x="540" y="1518" text-anchor="middle" fill="#0f2d66" font-family="Arial, sans-serif" font-size="48" font-weight="850">${scene.cta}</text>
      <text x="540" y="1645" text-anchor="middle" fill="#ffffff" font-family="Arial, sans-serif" font-size="32" font-weight="650">Diagnóstico financeiro gratuito</text>
    ` : `
      <rect x="88" y="1600" width="280" height="10" rx="5" fill="${scene.accent}"/>
      <text x="88" y="1700" fill="#ffffff" fill-opacity=".68" font-family="Arial, sans-serif" font-size="31" font-weight="600">Sua vida financeira mais leve.</text>
    `}
  </svg>`
}

for (const scene of scenes) {
  const pngPath = join(outputDir, `${scene.id}.png`)
  await sharp(Buffer.from(sceneSvg(scene))).png().toFile(pngPath)
}

await sharp(Buffer.from(sceneSvg({
  ...scenes[0],
  eyebrow: 'VOCÊ JÁ SENTIU ISSO?',
  title: 'Por que sobra mês no fim do salário?',
  body: 'Entenda para onde seu dinheiro está indo.',
}))).png().toFile(join(outputDir, 'thumbnail.png'))

const inputArgs = scenes.flatMap((scene) => [
  '-loop', '1',
  '-t', String(scene.duration),
  '-i', join(outputDir, `${scene.id}.png`),
])

const filters = scenes.map((scene, index) => {
  const frames = scene.duration * 30
  return `[${index}:v]scale=1120:1991,crop=1080:1920,zoompan=z='min(zoom+0.00018,1.025)':d=${frames}:s=1080x1920:fps=30,format=yuv420p[v${index}]`
})
filters.push(`${scenes.map((_, index) => `[v${index}]`).join('')}concat=n=${scenes.length}:v=1:a=0[vout]`)

execFileSync(ffmpegPath, [
  '-y',
  ...inputArgs,
  '-i', audioPath,
  '-filter_complex', filters.join(';'),
  '-map', '[vout]',
  '-map', `${scenes.length}:a`,
  '-af', 'atempo=1.2,apad=pad_dur=38,loudnorm=I=-16:TP=-1.5:LRA=11',
  '-t', '38',
  '-c:v', 'libx264',
  '-preset', 'medium',
  '-crf', '18',
  '-profile:v', 'high',
  '-level', '4.1',
  '-pix_fmt', 'yuv420p',
  '-movflags', '+faststart',
  '-c:a', 'aac',
  '-b:a', '192k',
  '-ar', '48000',
  videoPath,
], { stdio: 'inherit' })

const metadata = {
  oe: 'OE-012',
  mission: 'T0 — Primeiro vídeo oficial da Zafi',
  title: 'Por que sobra mês no fim do salário?',
  format: 'vertical 9:16',
  resolution: '1080x1920',
  duration_seconds: 38,
  provider: 'zafi-local-motion-v2',
  estimated_cost_brl: 0,
  narration: 'Microsoft Maria Desktop pt-BR',
  captions: 'burned-in scene captions',
  status: 'rendered',
  video_path: '/content-factory/oe-012/t0/zafi-t0-sobra-mes.mp4',
  thumbnail_path: '/content-factory/oe-012/t0/thumbnail.png',
  sha256: null,
  generated_at: new Date().toISOString(),
}

const { createHash } = await import('node:crypto')
metadata.sha256 = createHash('sha256').update(readFileSync(videoPath)).digest('hex')
writeFileSync(reportPath, `${JSON.stringify(metadata, null, 2)}\n`, 'utf8')

console.log(JSON.stringify(metadata, null, 2))
