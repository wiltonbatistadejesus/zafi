-- OE-010 — Operação Primeiros Usuários
-- Registro idempotente e append-only no ledger do Conselho Estratégico.

do $$
declare
  v_order_id uuid;
  v_revision_id uuid;
  v_version integer;
  v_created boolean := false;
  v_description text := $oe$
MISSÃO

Validar a Zafi com usuários reais e transformar aprendizado em evolução do produto.

NORTH STAR

100 usuários cadastrados utilizando a plataforma.

Não buscamos apenas cadastros. Buscamos evidências de que a Zafi resolve um problema real.

OBJETIVOS ESTRATÉGICOS

1. Aquisição

Levar pessoas para a Zafi diariamente.

Meta inicial:
- 100 visitantes/dia.

2. Conversão

Medir:
- Visitantes
- Cadastros
- Taxa de conversão
- Origem do tráfego

3. Ativação

Confirmar que o usuário utiliza a plataforma após o cadastro.

Eventos mínimos:
- Cadastro concluído
- Primeiro acesso
- Primeira utilização
- Conclusão do fluxo principal

4. Feedback

Registrar:
- dúvidas
- dificuldades
- sugestões
- funcionalidades solicitadas

Todo feedback deverá ficar vinculado ao usuário e à versão da plataforma.

RESPONSABILIDADES

Engenharia:
- manter estabilidade
- corrigir bugs críticos
- instrumentar métricas
- responder rapidamente aos problemas encontrados

Marketing:
- executar diariamente vídeos curtos, conteúdo educativo, distribuição orgânica, testes de criativos e acompanhamento das métricas

Conselho Estratégico:
- analisar continuamente crescimento, retenção, feedback, gargalos e oportunidades
- emitir novas Ordens Executivas somente quando justificadas pelos dados

CEO:
- definir prioridades estratégicas
- aprovar novas Ordens Executivas

INDICADORES OBRIGATÓRIOS

- Visitantes por dia
- Usuários cadastrados
- Usuários ativos
- Taxa de conversão
- Retenção
- Origem dos usuários
- Tempo médio até ativação
- Feedback recebido

CRITÉRIO DE ENCERRAMENTO

A OE-010 será considerada concluída quando houver:
- usuários reais utilizando a Zafi
- métricas confiáveis do funil
- evidências suficientes para definir a próxima estratégia de crescimento

DETERMINAÇÃO DO CONSELHO ESTRATÉGICO

A partir desta Ordem Executiva, toda decisão de produto deverá ser orientada por dados reais de usuários.

Entramos oficialmente na fase de validação de mercado da Zafi. O sucesso agora será medido pelo uso do produto, não pela quantidade de funcionalidades desenvolvidas.
$oe$;
begin
  insert into public.executive_orders (oe_code)
  values ('OE-010')
  on conflict (oe_code) do nothing
  returning id into v_order_id;

  if v_order_id is not null then
    v_created := true;
  else
    select id into v_order_id
    from public.executive_orders
    where oe_code = 'OE-010';
  end if;

  if exists (
    select 1
    from public.executive_order_revisions
    where order_id = v_order_id
      and title = 'Operação Primeiros Usuários'
      and status = 'in_progress'
  ) then
    return;
  end if;

  select coalesce(max(version), 0) + 1
  into v_version
  from public.executive_order_revisions
  where order_id = v_order_id;

  insert into public.executive_order_revisions (
    order_id,
    version,
    title,
    description,
    priority,
    status,
    author_name,
    author_email,
    author_role,
    change_reason
  ) values (
    v_order_id,
    v_version,
    'Operação Primeiros Usuários',
    v_description,
    'maximum',
    'in_progress',
    'Conselho Estratégico',
    'conselho@meuzafi.com.br',
    'council',
    'Ordem Executiva aprovada para execução'
  )
  returning id into v_revision_id;

  insert into public.executive_order_audit_events (
    order_id,
    event_type,
    actor_name,
    actor_email,
    actor_role,
    entity_type,
    entity_id,
    payload
  ) values (
    v_order_id,
    case when v_created then 'order_created' else 'order_revised' end,
    'Conselho Estratégico',
    'conselho@meuzafi.com.br',
    'council',
    'order_revision',
    v_revision_id,
    jsonb_build_object(
      'oe_code', 'OE-010',
      'version', v_version,
      'priority', 'maximum',
      'status', 'in_progress',
      'north_star', '100 usuários cadastrados utilizando a plataforma'
    )
  );
end;
$$;
