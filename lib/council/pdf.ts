import {
  PDFDocument,
  PageSizes,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage,
} from 'pdf-lib'
import type { ExecutiveOrderDetail } from './types'

const A4 = PageSizes.A4
const MARGIN = 46
const CONTENT_WIDTH = A4[0] - MARGIN * 2
const BOTTOM_LIMIT = 54

const palette = {
  ink: rgb(0.075, 0.098, 0.13),
  muted: rgb(0.34, 0.39, 0.47),
  line: rgb(0.85, 0.86, 0.88),
  paper: rgb(0.985, 0.982, 0.973),
  gold: rgb(0.67, 0.49, 0.22),
  burgundy: rgb(0.48, 0.09, 0.14),
}

const statusLabels: Record<string, string> = {
  draft: 'Rascunho', open: 'Aberta', in_progress: 'Em implementação',
  awaiting_council: 'Aguardando Conselho', awaiting_ceo: 'Aguardando CEO',
  adjustments_requested: 'Ajustes solicitados', reprioritized: 'Repriorizada',
  blocked: 'Bloqueada', approved: 'Aprovada', completed: 'Concluída', rejected: 'Rejeitada',
}
const priorityLabels: Record<string, string> = { maximum: 'Máxima', high: 'Alta', medium: 'Média', low: 'Baixa' }
const implementationLabels: Record<string, string> = {
  not_started: 'Não iniciada', in_progress: 'Em andamento', blocked: 'Bloqueada', completed: 'Concluída',
}
const verdictLabels: Record<string, string> = {
  approved: 'Aprovado', approved_with_reservations: 'Aprovado com ressalvas', rejected: 'Rejeitado',
}
const decisionLabels: Record<string, string> = {
  approve: 'Aprovar', request_adjustments: 'Solicitar ajustes', reprioritize: 'Repriorizar',
}
const eventLabels: Record<string, string> = {
  order_created: 'Ordem criada',
  order_revised: 'Ordem revisada',
  engineering_report_submitted: 'Relatório da Engenharia',
  council_opinion_submitted: 'Parecer do Conselho',
  ceo_decision_recorded: 'Decisão do CEO',
  attachment_registered: 'Evidência anexada',
}

function clean(value: unknown) {
  return String(value ?? '')
    .replace(/\u00a0/g, ' ')
    .replace(/[–—]/g, '-')
    .replace(/→/g, '->')
    .replace(/←/g, '<-')
    .replace(/…/g, '...')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[•·]/g, '-')
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, '')
    .trim()
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
  }).format(new Date(value))
}

function wrap(text: string, font: PDFFont, size: number, width: number) {
  const lines: string[] = []
  for (const paragraph of clean(text).split(/\r?\n/)) {
    if (!paragraph) {
      lines.push('')
      continue
    }
    const words = paragraph.split(/\s+/)
    let current = ''
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word
      if (font.widthOfTextAtSize(candidate, size) <= width) {
        current = candidate
        continue
      }
      if (current) lines.push(current)
      if (font.widthOfTextAtSize(word, size) <= width) {
        current = word
        continue
      }
      let fragment = ''
      for (const character of word) {
        const next = fragment + character
        if (font.widthOfTextAtSize(next, size) > width && fragment) {
          lines.push(fragment)
          fragment = character
        } else {
          fragment = next
        }
      }
      current = fragment
    }
    if (current) lines.push(current)
  }
  return lines.length ? lines : ['']
}

export async function buildExecutiveOrderPdf(order: ExecutiveOrderDetail) {
  const document = await PDFDocument.create()
  const regular = await document.embedFont(StandardFonts.Helvetica)
  const bold = await document.embedFont(StandardFonts.HelveticaBold)
  const mono = await document.embedFont(StandardFonts.Courier)
  const generatedAt = new Date().toISOString()
  let page!: PDFPage
  let y = 0

  const addPage = () => {
    page = document.addPage(A4)
    page.drawRectangle({ x: 0, y: 0, width: A4[0], height: A4[1], color: palette.paper })
    page.drawRectangle({ x: 0, y: A4[1] - 10, width: A4[0], height: 10, color: palette.burgundy })
    page.drawText('ZAFI  /  CONSELHO ESTRATÉGICO', {
      x: MARGIN, y: A4[1] - 35, size: 8, font: bold, color: palette.ink,
    })
    page.drawText(`${order.oe_code}  ·  v${order.current.version}`, {
      x: A4[0] - MARGIN - 90, y: A4[1] - 35, size: 8, font: mono, color: palette.muted,
    })
    y = A4[1] - 64
  }
  const ensure = (height: number) => {
    if (y - height < BOTTOM_LIMIT) addPage()
  }
  const divider = () => {
    ensure(14)
    page.drawLine({
      start: { x: MARGIN, y }, end: { x: A4[0] - MARGIN, y },
      thickness: 0.6, color: palette.line,
    })
    y -= 14
  }
  const label = (text: string) => {
    ensure(24)
    page.drawText(clean(text).toUpperCase(), {
      x: MARGIN, y, size: 7.5, font: bold, color: palette.gold,
    })
    y -= 17
  }
  const heading = (text: string, size = 17) => {
    const lines = wrap(text, bold, size, CONTENT_WIDTH)
    ensure(lines.length * (size + 3) + 8)
    for (const line of lines) {
      page.drawText(line, { x: MARGIN, y, size, font: bold, color: palette.ink })
      y -= size + 3
    }
    y -= 5
  }
  const paragraph = (text: string, options?: { muted?: boolean; size?: number; indent?: number }) => {
    const size = options?.size ?? 9.5
    const indent = options?.indent ?? 0
    const lines = wrap(text, regular, size, CONTENT_WIDTH - indent)
    ensure(lines.length * (size + 4) + 8)
    for (const line of lines) {
      if (!line) {
        y -= size
      } else {
        page.drawText(line, {
          x: MARGIN + indent, y, size, font: regular,
          color: options?.muted ? palette.muted : palette.ink,
        })
        y -= size + 4
      }
    }
    y -= 5
  }
  const keyValue = (key: string, value: string) => {
    ensure(24)
    page.drawText(clean(key).toUpperCase(), {
      x: MARGIN, y, size: 7, font: bold, color: palette.muted,
    })
    const lines = wrap(value, regular, 9, CONTENT_WIDTH - 142)
    lines.forEach((line, index) => {
      page.drawText(line, {
        x: MARGIN + 142, y: y - index * 12, size: 9,
        font: index === 0 ? bold : regular, color: palette.ink,
      })
    })
    y -= Math.max(18, lines.length * 12 + 4)
  }
  const list = (title: string, items: string[]) => {
    label(title)
    if (!items.length) {
      paragraph('Nenhum item registrado.', { muted: true, size: 8.5 })
      return
    }
    for (const item of items) {
      const lines = wrap(item, regular, 8.5, CONTENT_WIDTH - 14)
      ensure(lines.length * 12 + 5)
      page.drawCircle({ x: MARGIN + 3, y: y + 3, size: 1.6, color: palette.gold })
      lines.forEach((line, index) => {
        page.drawText(line, {
          x: MARGIN + 14, y: y - index * 12, size: 8.5, font: regular, color: palette.ink,
        })
      })
      y -= lines.length * 12 + 4
    }
    y -= 4
  }

  addPage()
  page.drawText('ORDEM EXECUTIVA', { x: MARGIN, y, size: 9, font: bold, color: palette.gold })
  y -= 35
  page.drawText(clean(order.oe_code), { x: MARGIN, y, size: 33, font: mono, color: palette.burgundy })
  y -= 40
  heading(order.current.title, 25)
  paragraph(order.current.description, { size: 11 })

  y -= 5
  page.drawRectangle({
    x: MARGIN, y: y - 76, width: CONTENT_WIDTH, height: 76,
    color: rgb(0.95, 0.94, 0.9), borderColor: palette.line, borderWidth: 0.6,
  })
  const boxY = y - 22
  const meta = [
    ['STATUS', statusLabels[order.current.status] ?? order.current.status],
    ['PRIORIDADE', priorityLabels[order.current.priority] ?? order.current.priority],
    ['VERSÃO', `v${order.current.version}`],
    ['PROGRESSO', `${order.engineering_reports[0]?.completion_percentage ?? 0}%`],
  ]
  meta.forEach(([key, value], index) => {
    const x = MARGIN + 18 + index * (CONTENT_WIDTH / 4)
    page.drawText(key, { x, y: boxY, size: 6.5, font: bold, color: palette.muted })
    page.drawText(clean(value), { x, y: boxY - 19, size: 10, font: bold, color: palette.ink })
  })
  y -= 96
  keyValue('Autor', `${order.current.author_name} · ${order.current.author_role}`)
  keyValue('Criada em', formatDate(order.created_at))
  keyValue('Documento gerado em', formatDate(generatedAt))
  paragraph('Documento confidencial para avaliação estratégica. Confirme o código e a versão antes de deliberar.', {
    muted: true, size: 8.5,
  })

  divider()
  label('01 · Relatório da Engenharia')
  const engineering = order.engineering_reports[0]
  if (engineering) {
    heading('Entrega técnica', 17)
    keyValue('Status', implementationLabels[engineering.implementation_status] ?? engineering.implementation_status)
    keyValue('Percentual concluído', `${engineering.completion_percentage}%`)
    keyValue('Responsável', `${engineering.author_name} · ${formatDate(engineering.created_at)}`)
    paragraph(engineering.summary)
    list('Evidências', engineering.evidences)
    list('Arquivos alterados', engineering.changed_files)
    list('Commits relacionados', engineering.commits)
    list('Testes executados', engineering.tests)
    list('Riscos', engineering.risks)
    list('Pendências', engineering.pending_items)
    list('Limitações', engineering.limitations)
    list('Critérios de aceite atendidos', engineering.acceptance_criteria)
  } else {
    paragraph('Aguardando relatório da Engenharia.', { muted: true })
  }

  divider()
  label('02 · Parecer do Conselho')
  const opinion = order.council_opinions[0]
  if (opinion) {
    keyValue('Parecer', verdictLabels[opinion.verdict] ?? opinion.verdict)
    keyValue('Responsável', `${opinion.author_name} · ${formatDate(opinion.created_at)}`)
    paragraph(opinion.justification)
    list('Recomendações', opinion.recommendations)
    list('Próximas ações', opinion.next_actions)
  } else {
    paragraph('Aguardando parecer do Conselho Estratégico.', { muted: true })
  }

  divider()
  label('03 · Decisão do CEO')
  const decision = order.ceo_decisions[0]
  if (decision) {
    keyValue('Decisão', decisionLabels[decision.decision] ?? decision.decision)
    keyValue('Responsável', `${decision.decided_by_name} · ${formatDate(decision.created_at)}`)
    paragraph(decision.justification)
  } else {
    paragraph('Aguardando decisão do CEO.', { muted: true })
  }

  divider()
  label(`Anexos registrados · ${order.attachments.length}`)
  if (order.attachments.length) {
    for (const attachment of order.attachments) {
      keyValue(
        attachment.file_name,
        `${attachment.attachment_type.toUpperCase()} · ${attachment.author_name} · ${formatDate(attachment.created_at)}`,
      )
      if (attachment.external_url) paragraph(attachment.external_url, { muted: true, size: 7.5, indent: 142 })
    }
  } else {
    paragraph('Nenhum anexo registrado.', { muted: true })
  }

  divider()
  label(`Histórico auditável · ${order.history.length} eventos`)
  if (order.history.length) {
    for (const event of order.history) {
      ensure(38)
      page.drawText(clean(eventLabels[event.event_type] ?? event.event_type), {
        x: MARGIN, y, size: 9, font: bold, color: palette.ink,
      })
      y -= 13
      paragraph(`${formatDate(event.created_at)} · ${event.actor_name} (${event.actor_role}) · ID ${event.id}`, {
        muted: true, size: 7.5,
      })
    }
  } else {
    paragraph('Nenhum evento registrado.', { muted: true })
  }

  const pages = document.getPages()
  pages.forEach((currentPage, index) => {
    currentPage.drawLine({
      start: { x: MARGIN, y: 39 }, end: { x: A4[0] - MARGIN, y: 39 },
      thickness: 0.5, color: palette.line,
    })
    currentPage.drawText('Fonte oficial: Conselho Estratégico Zafi', {
      x: MARGIN, y: 24, size: 6.5, font: regular, color: palette.muted,
    })
    currentPage.drawText(`${index + 1} / ${pages.length}`, {
      x: A4[0] - MARGIN - 28, y: 24, size: 6.5, font: mono, color: palette.muted,
    })
  })

  document.setTitle(`${order.oe_code} — ${clean(order.current.title)}`)
  document.setAuthor('Zafi · Conselho Estratégico')
  document.setSubject('Ordem Executiva auditável')
  document.setCreator('Zafi CEO Cockpit')
  document.setProducer('Zafi CEO Cockpit')
  document.setCreationDate(new Date(generatedAt))
  return document.save()
}
