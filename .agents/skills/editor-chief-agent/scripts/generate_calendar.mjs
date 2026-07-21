import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, relative, resolve } from 'node:path'

const args = Object.fromEntries(process.argv.slice(2).map((arg) => {
  const [key, ...value] = arg.replace(/^--/, '').split('=')
  return [key, value.join('=')]
}))

const start = args.start
if (!/^\d{4}-\d{2}-\d{2}$/.test(start ?? '')) {
  throw new Error('Use --start=AAAA-MM-DD')
}

const output = resolve(args.output ?? `docs/marketing/calendar/editorial-90-days-${start}.md`)
const registryPath = resolve(args.registry ?? 'docs/marketing/asset-registry.json')
const themes = [
  ['qual-divida-pagar-primeiro', 'Qual dívida pagar primeiro?', 'Validar diagnóstico e priorização'],
  ['organizar-dividas', 'Como organizar todas as dívidas', 'Reduzir confusão antes da negociação'],
  ['negociar-divida-itau', 'Como negociar dívida com o Itaú', 'Orientar uma renegociação segura'],
  ['negociar-divida-santander', 'Como negociar dívida com o Santander', 'Orientar uma renegociação segura'],
  ['limpar-o-nome', 'Como começar a limpar o nome', 'Explicar uma jornada realista'],
  ['divida-cartao', 'Como lidar com dívida de cartão', 'Priorizar juros altos com responsabilidade'],
  ['parcela-cabe-orcamento', 'Como saber se a parcela cabe no orçamento', 'Evitar acordos insustentáveis'],
  ['divida-prescreve', 'O que acontece quando uma dívida prescreve?', 'Educar sem criar falsas expectativas'],
  ['aumentar-score', 'Como construir um score melhor com o tempo', 'Combater promessas de resultado rápido'],
  ['serasa-spc', 'Diferença entre Serasa e SPC', 'Esclarecer conceitos básicos'],
  ['acordo-certo', 'Como funciona o Acordo Certo?', 'Explicar um canal sem prometer resultado'],
  ['emprestimo-negativado', 'Empréstimo para negativado vale a pena?', 'Orientar decisão e risco'],
  ['renegociar-sem-cair-golpe', 'Como renegociar sem cair em golpe', 'Aumentar segurança e confiança'],
  ['juros-divida', 'Como comparar os juros das dívidas', 'Melhorar priorização financeira'],
  ['custo-total-acordo', 'Desconto ou custo total: o que comparar?', 'Evitar decisão apenas pelo desconto'],
  ['reserva-antes-acordo', 'Preciso de reserva antes de negociar?', 'Proteger despesas essenciais'],
  ['divida-antiga', 'Como conferir uma dívida antiga', 'Orientar verificação e documentação'],
  ['canais-oficiais-bancos', 'Como reconhecer canais oficiais dos bancos', 'Reduzir fraude'],
  ['nome-negativado', 'O que significa estar negativado?', 'Explicar impactos sem alarmismo'],
  ['orcamento-endividado', 'Orçamento simples para quem está endividado', 'Criar primeiro plano viável'],
  ['dividas-familia', 'Como conversar sobre dívidas em família', 'Reduzir isolamento e melhorar organização'],
  ['renda-irregular', 'Como negociar dívida com renda irregular', 'Adaptar acordo à realidade'],
  ['priorizar-contas-essenciais', 'Quais contas essenciais vêm primeiro?', 'Proteger necessidades básicas'],
  ['entrada-ou-parcelamento', 'Dar entrada ou parcelar?', 'Comparar cenários com cautela'],
  ['acordo-atrasado', 'O que fazer quando o acordo atrasou', 'Orientar retomada sem julgamento'],
  ['comprovante-negociacao', 'Quais comprovantes guardar na negociação', 'Melhorar segurança documental'],
  ['cobranca-indevida', 'Como agir diante de cobrança indevida', 'Orientar verificação e canais formais'],
  ['divida-empresa', 'Dívida pessoal ou da empresa: como separar', 'Organizar contextos financeiros'],
  ['diagnostico-financeiro', 'O que um diagnóstico financeiro deve mostrar', 'Explicar o valor da Zafi'],
  ['plano-30-dias', 'Plano de 30 dias para organizar dívidas', 'Transformar orientação em próximos passos'],
]

const channels = ['Instagram Reels', 'Facebook', 'WhatsApp', 'Blog', 'YouTube Shorts', 'LinkedIn', 'Newsletter']
const angles = ['Explicação direta', 'Checklist prático', 'Erros comuns e como evitar']
const owners = ['Content Factory Agent', 'Video Studio Agent', 'Content Factory Agent', 'SEO Intelligence Agent', 'Video Studio Agent', 'Content Factory Agent', 'Content Factory Agent']

const addDays = (date, days) => {
  const value = new Date(`${date}T12:00:00Z`)
  value.setUTCDate(value.getUTCDate() + days)
  return value.toISOString().slice(0, 10)
}

const rows = Array.from({ length: 90 }, (_, index) => {
  const theme = themes[index % themes.length]
  const channelIndex = index % channels.length
  const cycle = Math.floor(index / themes.length)
  return {
    day: index + 1,
    date: addDays(start, index),
    themeId: theme[0],
    theme: theme[1],
    objective: theme[2],
    angle: angles[cycle],
    channel: channels[channelIndex],
    cta: 'Faça o diagnóstico financeiro gratuito da Zafi.',
    priority: index < 14 ? 'alta' : index < 45 ? 'média' : 'normal',
    stage: 'draft',
    owner: owners[channelIndex],
  }
})

const header = `# Calendário editorial Zafi — 90 dias\n\n- Calendar ID: \`organic-90d-${start}\`\n- Versão: 1\n- Início: ${start}\n- Estado global: \`draft\`\n- Publicação automática: proibida\n- Aprovação humana: obrigatória por ativo\n\n| Dia | Data | Tema | Ângulo | Objetivo | Canal | CTA | Prioridade | Estágio | Responsável |\n|---:|---|---|---|---|---|---|---|---|---|\n`
const body = rows.map((row) => `| ${row.day} | ${row.date} | ${row.theme} | ${row.angle} | ${row.objective} | ${row.channel} | ${row.cta} | ${row.priority} | ${row.stage} | ${row.owner} |`).join('\n')
const footer = `\n\n## Governança\n\nCada linha é uma intenção editorial, não uma publicação. O Editor Chief deve verificar evidência, duplicação e capacidade antes de gerar o briefing. O Agente de Marketing deve validar os gates OE-006C e obter aprovação humana explícita.\n`

mkdirSync(dirname(output), { recursive: true })
writeFileSync(output, `${header}${body}${footer}`, 'utf8')

const registry = existsSync(registryPath)
  ? JSON.parse(readFileSync(registryPath, 'utf8'))
  : { schema_version: 1, updated_at: `${start}T12:00:00-03:00`, assets: [] }
const assetId = `calendar-organic-90d-${start.replaceAll('-', '')}-v1`
const calendarAsset = {
  asset_id: assetId,
  theme_id: 'organic-acquisition-factory',
  brief_id: `oe007-calendar-${start.replaceAll('-', '')}`,
  asset_type: 'editorial_calendar',
  version: 1,
  status: 'draft',
  path: relative(process.cwd(), output).replaceAll('\\', '/'),
  parent_asset_id: null,
  source_ids: ['oe-007'],
  approval_id: null,
  publication_id: null,
  created_at: `${start}T12:00:00-03:00`,
  updated_at: `${start}T12:00:00-03:00`,
}
registry.schema_version = 1
registry.updated_at = `${start}T12:00:00-03:00`
registry.assets = [...registry.assets.filter((asset) => asset.asset_id !== assetId), calendarAsset]
  .sort((a, b) => a.asset_id.localeCompare(b.asset_id))
mkdirSync(dirname(registryPath), { recursive: true })
writeFileSync(registryPath, `${JSON.stringify(registry, null, 2)}\n`, 'utf8')
console.log(`${output}\n${registryPath}`)
