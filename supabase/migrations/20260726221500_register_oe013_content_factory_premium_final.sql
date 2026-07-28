-- OE-013 — Content Factory Premium
-- Registro idempotente e append-only no Conselho Estratégico.

do $$
declare
  v_order_id uuid;
  v_revision_id uuid;
  v_version integer;
  v_created boolean := false;
  v_description text := $oe$
MISSÃO

Implantar a operação profissional da Content Factory da Zafi, com benchmarking contínuo, identidade visual padronizada, produção multimídia e aprendizado baseado em métricas reais.

PROCESSO OBRIGATÓRIO

Tema → 3–5 referências → benchmarking → briefing criativo → aprovação do Diretor de Marketing IA → produção dos três formatos → QA → compliance → CEO → publicação → medição → aprendizado.

GOVERNANÇA

- É proibida a reprodução parcial ou integral dos benchmarks.
- É proibida qualquer alteração automática do logotipo.
- Nenhum planejamento ou placeholder será apresentado como peça produzida.
- Publicação automática somente após autenticação, autorização e auditoria das contas oficiais.
- Horários de publicação serão escolhidos somente com métricas reais.
- Atlas, Recommendation Engine, ranking, pesos, elegibilidade, diagnóstico e lógica financeira permanecem fora do escopo.

CRITÉRIOS DE ACEITE

- identidade visual padronizada e aprovada;
- redes oficiais configuradas;
- três formatos por pauta;
- benchmark integrado ao fluxo;
- aproximadamente 30 peças finais no banco inicial;
- publicação automática auditável nas contas oficiais;
- métricas registradas e usadas para melhoria contínua.
$oe$;
begin
  insert into public.executive_orders (oe_code)
  values ('OE-013')
  on conflict (oe_code) do nothing
  returning id into v_order_id;

  if v_order_id is not null then
    v_created := true;
  else
    select id into v_order_id from public.executive_orders where oe_code = 'OE-013';
  end if;

  if exists (
    select 1 from public.executive_order_revisions
    where order_id = v_order_id
      and title = 'Content Factory Premium — Benchmarking, Identidade Visual e Lançamento das Redes Sociais'
      and status = 'in_progress'
  ) then
    return;
  end if;

  select coalesce(max(version), 0) + 1 into v_version
  from public.executive_order_revisions where order_id = v_order_id;

  insert into public.executive_order_revisions (
    order_id, version, title, description, priority, status,
    author_name, author_email, author_role, change_reason
  ) values (
    v_order_id, v_version,
    'Content Factory Premium — Benchmarking, Identidade Visual e Lançamento das Redes Sociais',
    v_description, 'maximum', 'in_progress',
    'Conselho Estratégico', 'conselho@meuzafi.com.br', 'council',
    'OE-013 v1.0 aprovada para implantação da operação Premium'
  )
  returning id into v_revision_id;

  insert into public.executive_order_audit_events (
    order_id, event_type, actor_name, actor_email, actor_role,
    entity_type, entity_id, payload
  ) values (
    v_order_id,
    case when v_created then 'order_created' else 'order_revised' end,
    'Conselho Estratégico', 'conselho@meuzafi.com.br', 'council',
    'order_revision', v_revision_id,
    jsonb_build_object(
      'oe_code', 'OE-013',
      'version', v_version,
      'priority', 'maximum',
      'status', 'in_progress',
      'benchmark_001', 'https://youtube.com/shorts/O_GuNBjtyp4',
      'initial_content_bank_target', 30,
      'formats_per_topic', jsonb_build_array('short_video', 'carousel', 'static_image'),
      'automatic_publication_requires_authorization', true
    )
  );
end;
$$;
