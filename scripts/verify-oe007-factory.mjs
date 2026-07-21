import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = process.cwd()
const requiredSkills = [
  'seo-intelligence-agent',
  'content-factory-agent',
  'video-studio-agent',
  'creative-intelligence-agent',
  'landing-optimizer-agent',
  'acquisition-analytics-agent',
  'editor-chief-agent',
]
const requiredLibrary = [
  'articles', 'campaigns', 'videos', 'images', 'carousels', 'emails',
  'seo', 'prompts', 'trends', 'reports', 'calendar',
]

const fail = (message) => { throw new Error(message) }
const read = (path) => readFileSync(resolve(root, path), 'utf8')

for (const name of requiredSkills) {
  const skillPath = `.agents/skills/${name}/SKILL.md`
  const contractPath = `.agents/skills/${name}/references/contract.md`
  if (!existsSync(resolve(root, skillPath))) fail(`${name}: SKILL.md ausente`)
  if (!existsSync(resolve(root, contractPath))) fail(`${name}: contrato ausente`)
  const skill = read(skillPath)
  const contract = read(contractPath)
  if (/\[TODO|TODO:/i.test(`${skill}\n${contract}`)) fail(`${name}: placeholder remanescente`)
  if (!/publicar|publicação/i.test(skill)) fail(`${name}: trava de publicação ausente`)
  if (!/entrada obrigatória/i.test(contract) || !/saída obrigatória/i.test(contract)) {
    fail(`${name}: contrato de entrada/saída incompleto`)
  }
}

for (const directory of requiredLibrary) {
  if (!existsSync(resolve(root, `docs/marketing/${directory}`))) fail(`Biblioteca ausente: ${directory}`)
}

const calendarPath = 'docs/marketing/calendar/editorial-90-days-2026-07-21.md'
const calendarRows = read(calendarPath).split(/\r?\n/).filter((line) => /^\| \d+ \|/.test(line)).length
if (calendarRows !== 90) fail(`Calendário possui ${calendarRows} linhas`)

const registry = JSON.parse(read('docs/marketing/asset-registry.json'))
if (registry.schema_version !== 1 || !Array.isArray(registry.assets)) fail('Registro inválido')
for (const asset of registry.assets) {
  for (const key of ['asset_id', 'theme_id', 'asset_type', 'version', 'status', 'path', 'created_at']) {
    if (asset[key] === undefined || asset[key] === null || asset[key] === '') fail(`${asset.asset_id ?? 'asset'}: ${key} ausente`)
  }
  if (!existsSync(resolve(root, asset.path))) fail(`${asset.asset_id}: arquivo ausente`)
  if (asset.status === 'published') fail(`${asset.asset_id}: publicação não autorizada`)
  if (asset.publication_id) fail(`${asset.asset_id}: publication_id não autorizado`)
}

const editor = read('.agents/skills/editor-chief-agent/SKILL.md')
const marketing = read('.agents/skills/zafi-marketing-agent/SKILL.md')
if (!/seo-intelligence-agent/.test(editor) || !/acquisition-analytics-agent/.test(editor)) fail('Editor Chief sem delegação completa')
if (!/Integração OE-007/.test(marketing)) fail('Agente de Marketing sem integração OE-007')

console.log(JSON.stringify({
  valid: true,
  skills: requiredSkills.length,
  contracts: requiredSkills.length,
  library_directories: requiredLibrary.length,
  calendar_rows: calendarRows,
  registered_assets: registry.assets.length,
  published_assets: 0,
}, null, 2))
