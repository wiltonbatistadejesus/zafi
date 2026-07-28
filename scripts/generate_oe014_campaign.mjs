import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { resolve } from 'node:path'
import sharp from '../tmp/video-tools/node_modules/sharp/dist/index.mjs'
import ffmpegPath from '../tmp/video-tools/node_modules/ffmpeg-static/index.js'

const root = resolve('public/content-factory/oe-014')
const framesDir = resolve(root, 'frames')
const carouselDir = resolve(root, 'carousel')
const storiesDir = resolve(root, 'stories')
await Promise.all([framesDir, carouselDir, storiesDir].map((directory) => mkdir(directory, { recursive: true })))

const colors = {
  navy: '#0f172a',
  blue: '#1565ff',
  pale: '#e9f0ff',
  white: '#ffffff',
  cyan: '#72e8ff',
  green: '#2dd4a2',
  yellow: '#ffcf5a',
}

const presenter = resolve(root, 'source/presenter.png')
const budget = resolve(root, 'source/budget-table.png')
const interfaceShot = resolve(root, 'source/zafi-interface.png')
const logo = await readFile(resolve('public/brand/zafi-logo.svg'), 'utf8')

function esc(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function lines(value, max = 22) {
  const words = value.split(/\s+/)
  const result = []
  let current = ''
  for (const word of words) {
    if (`${current} ${word}`.trim().length > max && current) {
      result.push(current)
      current = word
    } else current = `${current} ${word}`.trim()
  }
  if (current) result.push(current)
  return result
}

function textBlock(value, { x, y, size, max = 22, color = colors.white, weight = 850, gap = 1.04 }) {
  return lines(value, max)
    .map((line, index) => `<text x="${x}" y="${y + index * size * gap}" fill="${color}" font-family="Inter,Arial,sans-serif" font-size="${size}" font-weight="${weight}" letter-spacing="${size > 60 ? -3 : -1}">${esc(line)}</text>`)
    .join('')
}

function logoMarkup(x, y, width) {
  const encoded = Buffer.from(logo).toString('base64')
  return `<image href="data:image/svg+xml;base64,${encoded}" x="${x}" y="${y}" width="${width}" />`
}

async function photoBackground(path, width, height, position = 'centre') {
  return sharp(path).resize(width, height, { fit: 'cover', position }).png().toBuffer()
}

function sceneOverlay(scene, index) {
  const eyebrow = esc(scene.eyebrow.toUpperCase())
  const title = textBlock(scene.title, { x: 76, y: 1240, size: scene.title.length > 35 ? 76 : 88, max: 20 })
  const body = scene.body ? textBlock(scene.body, { x: 80, y: 1518, size: 38, max: 38, color: '#d8e2f0', weight: 560, gap: 1.18 }) : ''
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920">
    <defs>
      <linearGradient id="shade" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#07101f" stop-opacity=".04"/>
        <stop offset=".45" stop-color="#07101f" stop-opacity=".08"/>
        <stop offset=".68" stop-color="#07101f" stop-opacity=".78"/>
        <stop offset="1" stop-color="#07101f" stop-opacity=".98"/>
      </linearGradient>
    </defs>
    <rect width="1080" height="1920" fill="url(#shade)"/>
    <rect x="76" y="1138" width="220" height="4" rx="2" fill="${scene.accent}"/>
    <text x="78" y="1205" fill="${scene.accent}" font-family="ui-monospace,monospace" font-size="25" font-weight="800" letter-spacing="5">${eyebrow}</text>
    ${title}
    ${body}
    ${logoMarkup(76, 70, 205)}
    <text x="1000" y="118" text-anchor="end" fill="#ffffff" opacity=".7" font-family="ui-monospace,monospace" font-size="22">0${index + 1} / 08</text>
    <rect x="76" y="1810" width="${(index + 1) * 116}" height="7" rx="4" fill="${colors.blue}"/>
    <rect x="76" y="1810" width="928" height="7" rx="4" fill="#ffffff" opacity=".12"/>
  </svg>`)
}

const scenes = [
  { source: presenter, position: 'centre', eyebrow: 'Você já sentiu isso?', title: 'O salário cai. O mês continua.', body: 'E o dinheiro acaba antes.', accent: colors.yellow },
  { source: budget, position: 'centre', eyebrow: 'A pergunta', title: 'Para onde o dinheiro está indo?', body: 'Quando tudo fica espalhado, fica difícil enxergar.', accent: colors.cyan },
  { source: presenter, position: 'centre', eyebrow: 'Sem culpa', title: 'Não é falta de esforço.', body: '�? falta de uma visão simples do todo.', accent: colors.green },
  { source: budget, position: 'centre', eyebrow: 'O que pesa', title: 'Fixos. Dia a dia. Juros.', body: 'Três forças disputando o mesmo salário.', accent: colors.yellow },
  { source: budget, position: 'north', eyebrow: 'O ponto de virada', title: 'Organizar vem antes de cortar.', body: 'Primeiro você entende. Depois decide.', accent: colors.cyan },
  { source: interfaceShot, position: 'north', eyebrow: 'Zafi', title: 'Sua vida financeira em um só lugar.', body: 'Diagnóstico simples, orientação clara.', accent: colors.blue },
  { source: presenter, position: 'centre', eyebrow: 'Próximo passo', title: 'Descubra o que está pesando.', body: 'Sem promessa fácil. Sem julgamento.', accent: colors.green },
  { source: presenter, position: 'centre', eyebrow: 'Diagnóstico gratuito', title: 'Conheça a Zafi.', body: 'meuzafi.com.br', accent: colors.blue },
]

for (const [index, scene] of scenes.entries()) {
  const base = await photoBackground(scene.source, 1080, 1920, scene.position)
  await sharp(base)
    .composite([{ input: sceneOverlay(scene, index), top: 0, left: 0 }])
    .png({ compressionLevel: 9 })
    .toFile(resolve(framesDir, `scene-${String(index + 1).padStart(2, '0')}.png`))
}

const carousel = [
  ['Por que sobra mês', 'no fim do salário?', 'Uma explicação sem culpa.'],
  ['O salário chega.', 'Mas as contas não chegam juntas.', 'E isso esconde o peso real do mês.'],
  ['Gastos fixos', 'ocupam a base.', 'Moradia, energia, transporte e alimentação.'],
  ['Gastos do dia a dia', 'parecem pequenos.', 'Somados, eles mudam o orçamento.'],
  ['Juros', 'fazem o passado consumir o presente.', 'Por isso olhar só o saldo não basta.'],
  ['Organizar vem', 'antes de cortar.', 'Você precisa enxergar o todo para decidir melhor.'],
  ['Sua vida financeira', 'mais leve.', 'Faça o diagnóstico gratuito da Zafi.'],
]

for (const [index, [kicker, title, body]] of carousel.entries()) {
  const dark = index === 0 || index === carousel.length - 1
  const background = dark ? colors.navy : colors.pale
  const foreground = dark ? colors.white : colors.navy
  const accent = [colors.blue, colors.cyan, colors.green, colors.yellow][index % 4]
  const artwork = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350">
    <rect width="1080" height="1350" fill="${background}"/>
    <circle cx="${index % 2 ? 900 : 120}" cy="${index % 2 ? 180 : 1110}" r="260" fill="${accent}" opacity=".16"/>
    ${logoMarkup(70, 55, 190)}
    <text x="1010" y="115" text-anchor="end" fill="${foreground}" opacity=".55" font-family="ui-monospace,monospace" font-size="22">0${index + 1} / 07</text>
    <rect x="72" y="338" width="170" height="5" rx="3" fill="${accent}"/>
    ${textBlock(kicker, { x: 72, y: 430, size: 38, max: 34, color: accent, weight: 780 })}
    ${textBlock(title, { x: 70, y: 610, size: title.length > 25 ? 75 : 92, max: 19, color: foreground })}
    ${textBlock(body, { x: 76, y: 930, size: 36, max: 38, color: dark ? '#d7e2f1' : '#475569', weight: 540, gap: 1.2 })}
    <text x="72" y="1260" fill="${foreground}" opacity=".55" font-family="ui-monospace,monospace" font-size="22">meuzafi.com.br</text>
  </svg>`)
  await sharp(artwork).png({ compressionLevel: 9 }).toFile(resolve(carouselDir, `slide-${index + 1}.png`))
}

const staticOverlay = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350">
  <defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#07101f" stop-opacity=".06"/><stop offset=".55" stop-color="#07101f" stop-opacity=".58"/><stop offset="1" stop-color="#07101f" stop-opacity=".98"/></linearGradient></defs>
  <rect width="1080" height="1350" fill="url(#s)"/>
  ${logoMarkup(70, 55, 190)}
  <rect x="70" y="720" width="210" height="5" rx="3" fill="${colors.yellow}"/>
  ${textBlock('O dinheiro acaba antes do mês?', { x: 68, y: 820, size: 84, max: 18 })}
  ${textBlock('Entenda para onde ele está indo.', { x: 74, y: 1105, size: 38, max: 38, color: '#dbe6f5', weight: 560 })}
  <rect x="70" y="1208" width="512" height="76" rx="38" fill="${colors.blue}"/>
  <text x="326" y="1257" text-anchor="middle" fill="#ffffff" font-family="Inter,Arial,sans-serif" font-size="28" font-weight="800">DIAGN�"STICO GRATUITO</text>
</svg>`)
const staticBase = await photoBackground(presenter, 1080, 1350, 'centre')
await sharp(staticBase).composite([{ input: staticOverlay }]).png({ compressionLevel: 9 }).toFile(resolve(root, 'arte-estatica.png'))

for (const [index, scene] of [scenes[0], scenes[5], scenes[7]].entries()) {
  const base = await photoBackground(scene.source, 1080, 1920, scene.position)
  await sharp(base).composite([{ input: sceneOverlay(scene, index === 0 ? 0 : index === 1 ? 5 : 7) }])
    .png({ compressionLevel: 9 }).toFile(resolve(storiesDir, `story-${index + 1}.png`))
}

const frameDuration = 2.75
const inputs = scenes.flatMap((_, index) => [
  '-loop', '1', '-t', String(frameDuration),
  '-i', resolve(framesDir, `scene-${String(index + 1).padStart(2, '0')}.png`),
])
const filters = scenes.map((_, index) =>
  `[${index}:v]scale=1120:1992,crop=1080:1920:x='(iw-ow)/2+8*sin(t*0.8)':y='(ih-oh)/2+8*cos(t*0.7)',fps=30,format=yuv420p[v${index}]`
)
filters.push(`${scenes.map((_, index) => `[v${index}]`).join('')}concat=n=${scenes.length}:v=1:a=0[video]`)

const silentVideo = resolve(root, 'video-sem-audio.mp4')
await run(ffmpegPath, [
  '-y', ...inputs,
  '-filter_complex', filters.join(';'),
  '-map', '[video]',
  '-c:v', 'libx264', '-preset', 'medium', '-crf', '18',
  '-movflags', '+faststart',
  silentVideo,
])

const narration = resolve(root, 'source/narracao.wav')
const finalVideo = resolve(root, 'oe-014-primeira-campanha.mp4')
await run(ffmpegPath, [
  '-y',
  '-i', silentVideo,
  '-i', narration,
  '-f', 'lavfi', '-t', String(frameDuration * scenes.length),
  '-i', 'aevalsrc=0.12*sin(2*PI*174*t)+0.08*sin(2*PI*220*t)+0.05*sin(2*PI*261.63*t):s=44100',
  '-filter_complex', '[1:a]atempo=1.35,volume=1.25,highpass=f=85[voice];[2:a]lowpass=f=900,volume=0.10[music];[voice][music]amix=inputs=2:duration=longest:dropout_transition=2[audio]',
  '-map', '0:v', '-map', '[audio]',
  '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k',
  '-shortest', '-movflags', '+faststart',
  finalVideo,
])

await writeFile(resolve(root, 'manifest.json'), JSON.stringify({
  schema_version: 1,
  campaign_id: 'oe014-primeira-campanha-v1',
  title: 'Por que sobra mês no fim do salário?',
  status: 'pending_ceo_approval',
  brand_asset_id: 'zafi-logo-master-v1',
  benchmark: {
    url: 'https://youtube.com/shorts/O_GuNBjtyp4',
    title: '3 passos para negociar sua dívida pelo Feirão da Serasa',
    author: 'Serasa Ensina',
    usage: 'technical_reference_only',
  },
  outputs: {
    video: '/content-factory/oe-014/oe-014-primeira-campanha.mp4',
    carousel: carousel.map((_, index) => `/content-factory/oe-014/carousel/slide-${index + 1}.png`),
    static_image: '/content-factory/oe-014/arte-estatica.png',
    stories: [1, 2, 3].map((index) => `/content-factory/oe-014/stories/story-${index}.png`),
  },
  publication: {
    authorized: false,
    instagram: null,
    tiktok: null,
    facebook: null,
    youtube: null,
  },
}, null, 2), 'utf8')

console.log(JSON.stringify({ video: finalVideo, carousel: carousel.length, stories: 3, static: true }))

function run(command, args) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, { stdio: 'inherit' })
    child.once('error', reject)
    child.once('exit', (code) => code === 0 ? resolvePromise() : reject(new Error(`ffmpeg_exit_${code}`)))
  })
}


