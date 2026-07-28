import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { buildExecutiveOrderPdf } from '../lib/council/pdf.ts'
import type { ExecutiveOrderDetail } from '../lib/council/types.ts'

const now = new Date().toISOString()
const order: ExecutiveOrderDetail = {
  generated_at: now,
  id: 'order-oe-009-1',
  oe_code: 'OE-009.1',
  created_at: now,
  current: {
    id: 'revision-2',
    order_id: 'order-oe-009-1',
    version: 2,
    title: 'Implantação do Painel do Conselho Estratégico',
    description: 'Centralizar a comunicação entre Estratégia, Engenharia e CEO, mantendo decisões e evidências permanentemente auditáveis.',
    priority: 'maximum',
    status: 'awaiting_council',
    author_name: 'CEO Zafi',
    author_email: 'ceo@example.invalid',
    author_role: 'ceo',
    change_reason: 'Relatório técnico registrado',
    created_at: now,
  },
  revisions: [],
  engineering_reports: [{
    id: 'engineering-report-1',
    order_id: 'order-oe-009-1',
    version: 2,
    implementation_status: 'completed',
    completion_percentage: 100,
    summary: 'Painel implementado com fluxo completo, autenticação por função, histórico imutável e anexos vinculados à Ordem Executiva.',
    evidences: ['Tela da OE disponível em produção', 'Histórico com dois eventos auditáveis'],
    changed_files: ['app/admin/(governance)/council/[oeCode]/page.tsx', 'components/council/ExecutiveOrderDetail.tsx'],
    commits: ['oe-0091-council-panel'],
    tests: ['Build e TypeScript aprovados', 'Fluxo Engenharia validado em produção'],
    risks: ['Acesso externo depende de autenticação ativa'],
    pending_items: ['Parecer final do Conselho'],
    limitations: ['Publicação automática permanece fora do escopo'],
    acceptance_criteria: ['Criar OE', 'Engenharia responder', 'Histórico permanecer rastreável'],
    author_name: 'Engenharia Zafi',
    author_email: 'engineering@example.invalid',
    created_at: now,
  }],
  council_opinions: [],
  ceo_decisions: [],
  attachments: [{
    id: 'attachment-1',
    order_id: 'order-oe-009-1',
    entity_type: 'engineering_report',
    entity_id: 'engineering-report-1',
    attachment_type: 'image',
    file_name: 'evidencia-painel-conselho.png',
    mime_type: 'image/png',
    size_bytes: 245000,
    storage_path: null,
    external_url: 'https://meuzafi.com.br/admin/council/OE-009.1',
    inline_content: null,
    checksum_sha256: null,
    author_name: 'Engenharia Zafi',
    author_email: 'engineering@example.invalid',
    author_role: 'engineering',
    created_at: now,
  }],
  history: [{
    id: 'audit-event-0001',
    order_id: 'order-oe-009-1',
    event_type: 'order_created',
    actor_name: 'CEO Zafi',
    actor_email: 'ceo@example.invalid',
    actor_role: 'ceo',
    entity_type: 'order',
    entity_id: 'order-oe-009-1',
    payload: {},
    created_at: now,
  }, {
    id: 'audit-event-0002',
    order_id: 'order-oe-009-1',
    event_type: 'engineering_report_submitted',
    actor_name: 'Engenharia Zafi',
    actor_email: 'engineering@example.invalid',
    actor_role: 'engineering',
    entity_type: 'engineering_report',
    entity_id: 'engineering-report-1',
    payload: {},
    created_at: now,
  }],
}

const outputDirectory = resolve('tmp', 'pdfs')
await mkdir(outputDirectory, { recursive: true })
const bytes = await buildExecutiveOrderPdf(order)
const outputPath = resolve(outputDirectory, 'Zafi-OE-009.1-v2-sample.pdf')
await writeFile(outputPath, bytes)
process.stdout.write(outputPath)
