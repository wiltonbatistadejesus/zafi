import { readFile } from 'node:fs/promises'

const root = new URL('../', import.meta.url)
const requiredFiles = [
  'docs/marketing/OE-013-content-factory-premium.md',
  'docs/marketing/benchmarks/oe-013-benchmark-001-v1.md',
  'docs/marketing/brand/identity-asset-audit.md',
  'docs/marketing/social/official-accounts-registry.json',
  'docs/marketing/content-bank/oe-013-initial-bank.json',
  'lib/content-factory/premium.ts',
]

for (const file of requiredFiles) {
  const content = await readFile(new URL(file, root), 'utf8')
  if (!content.trim()) throw new Error(`Arquivo obrigatório vazio: ${file}`)
}

const bank = JSON.parse(
  await readFile(new URL('docs/marketing/content-bank/oe-013-initial-bank.json', root), 'utf8'),
)
const social = JSON.parse(
  await readFile(new URL('docs/marketing/social/official-accounts-registry.json', root), 'utf8'),
)

if (bank.topics.length !== 10) throw new Error('O manifesto deve possuir exatamente 10 pautas iniciais')
if (bank.counts.planned_assets !== 30) throw new Error('O manifesto deve planejar 30 peças')
if (bank.counts.produced_assets !== 0) throw new Error('Planejamento não pode ser contabilizado como produção')
if (social.publication_policy.automatic_publication_enabled !== false) {
  throw new Error('Publicação automática deve permanecer bloqueada')
}
if (social.accounts.some((account) => account.publishing_status !== 'blocked')) {
  throw new Error('Nenhuma rede pode publicar antes da autenticação e autorização')
}

console.log('OE-013 Premium foundation verified: 10 topics, 30 planned assets, no false production, publishing blocked.')
