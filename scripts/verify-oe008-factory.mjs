import { existsSync, readFileSync } from 'node:fs'

const root = process.cwd()
const read = (path) => readFileSync(`${root}/${path}`, 'utf8')
const failures = []

const skills = [
  'trend-hunter-agent',
  'content-strategist-agent',
  'script-writer-agent',
  'avatar-director-agent',
  'video-producer-agent',
  'thumbnail-producer-agent',
  'quality-reviewer-agent',
  'compliance-reviewer-agent',
  'ceo-review-agent',
]

for (const skill of skills) {
  const base = `.agents/skills/${skill}`
  if (!existsSync(`${base}/SKILL.md`)) failures.push(`${skill}: SKILL.md ausente`)
  if (!existsSync(`${base}/references/contract.md`)) failures.push(`${skill}: contrato ausente`)
  if (!existsSync(`${base}/agents/openai.yaml`)) failures.push(`${skill}: openai.yaml ausente`)
  if (existsSync(`${base}/SKILL.md`) && read(`${base}/SKILL.md`).includes('TODO')) failures.push(`${skill}: TODO remanescente`)
}

const provider = read('lib/content-factory/types.ts')
for (const method of ['generate(', 'status(', 'preview(', 'download(', 'cancel(']) {
  if (!provider.includes(method)) failures.push(`VideoProvider sem ${method}`)
}

const catalog = read('lib/content-factory/pilots.ts')
for (const kind of ['institutional', 'educational', 'viral']) {
  if (!catalog.includes(`kind: '${kind}'`)) failures.push(`piloto ${kind} ausente`)
}

for (const slug of ['institucional', 'educacional', 'viral']) {
  for (const suffix of ['a', 'b', 'c']) {
    const path = `public/content-factory/oe-008/${slug}/thumbnail-${suffix}.svg`
    if (!existsSync(path)) failures.push(`${path} ausente`)
  }
}

const panel = read('components/ceo/ContentFactoryReview.tsx')
for (const control of ['Aprovar', 'Solicitar ajustes', 'Rejeitar']) {
  if (!panel.includes(control)) failures.push(`controle ${control} ausente`)
}
if (!panel.includes('não publica o vídeo')) failures.push('aviso de não publicação ausente')

const registry = JSON.parse(read('docs/marketing/asset-registry.json'))
for (const id of ['oe008-institucional-v1', 'oe008-educacional-v1', 'oe008-viral-v1']) {
  const asset = registry.assets.find((item) => item.asset_id === id)
  if (!asset) failures.push(`registro ${id} ausente`)
  else if (asset.status !== 'pending_approval') failures.push(`${id}: status diferente de pending_approval`)
}

for (const path of [
  'docs/marketing/brand/brand-bible.md',
  'docs/marketing/OE-008-autonomous-content-factory.md',
  'public/brand/zafi-logo.svg',
]) {
  if (!existsSync(path)) failures.push(`${path} ausente`)
}

if (failures.length) {
  console.error(`OE-008: ${failures.length} falha(s)`)
  failures.forEach((failure) => console.error(`- ${failure}`))
  process.exit(1)
}

console.log(`OE-008 validada: ${skills.length} módulos, 3 pilotos, 9 thumbnails, publicação automática desabilitada.`)
