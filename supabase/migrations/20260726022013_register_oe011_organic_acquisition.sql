-- OE-011 — Máquina de Aquisição Orgânica
-- Registro idempotente e append-only no ledger do Conselho Estratégico.

do $$
declare
  v_order_id uuid;
  v_revision_id uuid;
  v_version integer;
  v_created boolean := false;
  v_description text := $oe$
MISSÃO

Construir um sistema capaz de atrair usuários diariamente de forma previsível, escalável e orientada por dados.

OBJETIVO ESTRATÉGICO

Transformar a aquisição de usuários em um processo contínuo da Zafi, reduzindo a dependência de ações manuais do CEO.

META INICIAL — PRIMEIROS 30 DIAS

- Publicar pelo menos 3 conteúdos por dia.
- Atingir 100 visitantes diários na plataforma.
- Medir quais conteúdos geram maior conversão em cadastro.

ENTREGAS

Engenharia:
- desenvolver módulo de Marketing com calendário editorial
- biblioteca de conteúdos
- acompanhamento de desempenho
- associação entre conteúdo publicado e visitas/cadastros
- dashboard de métricas

Marketing:
- operar diariamente a criação de roteiros
- produção e publicação de vídeos
- adaptação para diferentes plataformas
- testes de títulos, thumbnails e CTAs

Conselho Estratégico:
- avaliar semanalmente alcance
- taxa de retenção dos vídeos
- cliques
- conversão em usuários
- temas com melhor desempenho
- emitir novas recomendações com base nos dados

INDICADORES

- Conteúdos publicados por dia
- Visualizações
- Tempo médio de retenção
- Cliques para a Zafi
- Visitantes
- Cadastros
- Taxa de conversão por conteúdo
- Custo por aquisição, quando houver mídia paga

CRITÉRIO DE SUCESSO

A OE será considerada bem-sucedida quando a Zafi demonstrar capacidade de gerar um fluxo recorrente de visitantes e identificar, com dados, quais formatos e temas trazem os usuários mais qualificados.

ORIENTAÇÃO DO CONSELHO

O conteúdo deixa de ser apenas marketing e passa a ser um ativo estratégico. Cada vídeo, artigo ou publicação é um experimento. O objetivo não é apenas ganhar visualizações, mas descobrir quais mensagens realmente levam pessoas a conhecer e usar a Zafi.

Quando houver alguns dias ou semanas de dados, a Zafi poderá decidir com mais confiança onde investir esforço e quais canais merecem prioridade.
$oe$;
begin
  insert into public.executive_orders (oe_code)
  values ('OE-011')
  on conflict (oe_code) do nothing
  returning id into v_order_id;

  if v_order_id is not null then
    v_created := true;
  else
    select id into v_order_id
    from public.executive_orders
    where oe_code = 'OE-011';
  end if;

  if exists (
    select 1
    from public.executive_order_revisions
    where order_id = v_order_id
      and title = 'Máquina de Aquisição Orgânica'
      and status = 'in_progress'
  ) then
    return;
  end if;

  select coalesce(max(version), 0) + 1
  into v_version
  from public.executive_order_revisions
  where order_id = v_order_id;

  insert into public.executive_order_revisions (
    order_id, version, title, description, priority, status,
    author_name, author_email, author_role, change_reason
  ) values (
    v_order_id,
    v_version,
    'Máquina de Aquisição Orgânica',
    v_description,
    'maximum',
    'in_progress',
    'Conselho Estratégico',
    'conselho@meuzafi.com.br',
    'council',
    'Nova frente autorizada para execução'
  )
  returning id into v_revision_id;

  insert into public.executive_order_audit_events (
    order_id, event_type, actor_name, actor_email, actor_role,
    entity_type, entity_id, payload
  ) values (
    v_order_id,
    case when v_created then 'order_created' else 'order_revised' end,
    'Conselho Estratégico',
    'conselho@meuzafi.com.br',
    'council',
    'order_revision',
    v_revision_id,
    jsonb_build_object(
      'oe_code', 'OE-011',
      'version', v_version,
      'priority', 'maximum',
      'status', 'in_progress',
      'north_star', '100 visitantes diários'
    )
  );
end;
$$;
