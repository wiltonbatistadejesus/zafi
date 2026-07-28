-- OE-012 — Primeiro Conteúdo em Produção
-- Registro idempotente e append-only no ledger do Conselho Estratégico.

do $$
declare
  v_order_id uuid;
  v_revision_id uuid;
  v_version integer;
  v_created boolean := false;
  v_description text := $oe$
MISSÃO

Entregar o primeiro conteúdo publicado pela Zafi utilizando o Departamento Autônomo de Marketing.

OBJETIVO

Demonstrar que a arquitetura criada na OE-011 e OE-011.1 funciona na prática.

O objetivo não é viralizar. O objetivo é completar o primeiro ciclo operacional.

CRITÉRIO DE ACEITE

A OE será considerada concluída quando o seguinte fluxo ocorrer sem intervenção do Conselho:

1. O Diretor de Marketing recebe a meta.
2. O Agente Pesquisador escolhe um tema.
3. O Agente Roteirista cria o roteiro.
4. O Agente de Vídeo produz o vídeo.
5. O Agente Social cria legenda, hashtags e CTA.
6. O Agente QA aprova o conteúdo.
7. O Agente Publicador publica nas contas oficiais da Zafi.
8. O Agente Analytics registra as métricas.
9. O Diretor de Marketing apresenta um relatório ao Conselho.

PRIMEIRO DESAFIO

Tema inicial: “Por que sobra mês no fim do salário?”

O tema é simples, universal, fácil de entender, relevante para um público amplo e diretamente relacionado à proposta da Zafi.

META DO PRIMEIRO CICLO

- 1 vídeo produzido.
- 1 vídeo publicado.
- 1 relatório gerado.

Não haverá meta de visualizações neste primeiro ciclo.

GOVERNANÇA OPERACIONAL

- Utilizar exclusivamente TikTok Oficial Zafi, Instagram Oficial Zafi e YouTube Oficial Zafi.
- O Agente Publicador não conhecerá senhas.
- Credenciais serão acessadas somente por integrações autorizadas e armazenadas em cofre administrado pela Engenharia.
- Cada publicação deverá registrar data e hora, plataforma, agente, vídeo, URL, status e motivo de falha quando houver.
- Conteúdos sensíveis, gastos e crises públicas permanecem fora da autonomia do agente.

PARECER DO CONSELHO

Até agora construímos a organização. A partir da OE-012, começamos a validar a operação real. O primeiro vídeo não será importante pelo número de visualizações, mas porque marcará a transição da Zafi de um projeto em planejamento para uma empresa que executa e aprende continuamente.
$oe$;
begin
  insert into public.executive_orders (oe_code)
  values ('OE-012')
  on conflict (oe_code) do nothing
  returning id into v_order_id;

  if v_order_id is not null then
    v_created := true;
  else
    select id into v_order_id
    from public.executive_orders
    where oe_code = 'OE-012';
  end if;

  if exists (
    select 1
    from public.executive_order_revisions
    where order_id = v_order_id
      and title = 'Primeiro Conteúdo em Produção'
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
    'Primeiro Conteúdo em Produção',
    v_description,
    'maximum',
    'in_progress',
    'Conselho Estratégico',
    'conselho@meuzafi.com.br',
    'council',
    'Ordem aprovada para execução do primeiro ciclo operacional em produção'
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
      'oe_code', 'OE-012',
      'version', v_version,
      'priority', 'maximum',
      'status', 'in_progress',
      'depends_on', jsonb_build_array('OE-011', 'OE-011.1'),
      'initial_theme', 'Por que sobra mês no fim do salário?',
      'first_cycle_targets', jsonb_build_object(
        'videos_produced', 1,
        'videos_published', 1,
        'reports_generated', 1
      )
    )
  );
end;
$$;
