-- OE-011.1 — Departamento Autônomo de Marketing
-- Registro idempotente e append-only no ledger do Conselho Estratégico.

do $$
declare
  v_order_id uuid;
  v_revision_id uuid;
  v_version integer;
  v_created boolean := false;
  v_description text := $oe$
MISSÃO

Criar um departamento formado por agentes de IA capazes de produzir, publicar, medir e otimizar conteúdo de forma contínua, mantendo supervisão humana apenas quando necessário.

ESTRUTURA DO DEPARTAMENTO

Diretor de Marketing (IA):
- definir metas de aquisição
- escolher campanhas
- distribuir tarefas
- analisar resultados
- reportar ao Conselho Estratégico

Agente Pesquisador:
- pesquisar tendências
- identificar dúvidas frequentes
- descobrir palavras-chave
- analisar concorrentes
- sugerir temas
- entrega: pauta diária

Agente Roteirista:
- receber a pauta
- produzir gancho, roteiro, CTA, duração ideal e adaptações por plataforma

Agente de Vídeo:
- produzir automaticamente narração, avatar quando necessário, legendas, imagens, música e vídeo final

Agente Social:
- produzir título, descrição, hashtags, thumbnail, horário recomendado e links rastreáveis

Agente QA (Qualidade):
- verificar ortografia, consistência, conformidade legal, identidade visual, CTA e duração
- retornar automaticamente ao agente responsável quando houver erro

Agente Publicador:
- conectar-se às contas oficiais da Zafi
- agendar publicações
- publicar nos horários definidos
- registrar o ID de cada postagem
- confirmar a publicação
- tentar novamente em caso de falha
- informar erros ao Diretor de Marketing

Plataformas iniciais:
- TikTok
- Instagram Reels
- YouTube Shorts

Agente Analytics:
- coletar visualizações, retenção, comentários, compartilhamentos, cliques, visitantes, cadastros e ativação
- enviar relatório diário ao Diretor de Marketing

FLUXO COMPLETO

1. Conselho define metas.
2. Diretor de Marketing cria a campanha.
3. Pesquisador escolhe os temas.
4. Roteirista escreve.
5. Vídeo produz.
6. Social prepara a publicação.
7. QA revisa.
8. Publicador publica.
9. Analytics mede.
10. Diretor aprende.
11. Conselho decide a próxima estratégia.

AUTONOMIA

Nível 1:
- produz tudo
- humano publica

Nível 2:
- produz tudo
- agenda automaticamente
- humano acompanha

Nível 3:
- publica automaticamente
- monitora resultados
- otimiza campanhas
- escala sozinho

LIMITES

O agente não poderá:
- alterar a estratégia da empresa
- gastar orçamento sem autorização
- responder crises públicas sozinho
- publicar conteúdos classificados como sensíveis
- excluir conteúdos publicados sem registrar o motivo

CRITÉRIO DE SUCESSO

A OE-011.1 será considerada concluída quando o Departamento Autônomo de Marketing operar por pelo menos 30 dias consecutivos, produzindo e publicando conteúdo regularmente, gerando relatórios automáticos e demonstrando aumento do fluxo de visitantes sem depender da atuação diária do CEO.

PARECER DO CONSELHO

Esta ordem representa um marco: a Zafi deixa de tratar marketing como atividade manual e passa a tratá-lo como departamento autônomo, com papéis, responsabilidades e auditoria definidos. Se validado, o modelo poderá servir de referência para Vendas, Suporte e Relacionamento com Clientes.
$oe$;
begin
  insert into public.executive_orders (oe_code)
  values ('OE-011.1')
  on conflict (oe_code) do nothing
  returning id into v_order_id;

  if v_order_id is not null then
    v_created := true;
  else
    select id into v_order_id
    from public.executive_orders
    where oe_code = 'OE-011.1';
  end if;

  if exists (
    select 1
    from public.executive_order_revisions
    where order_id = v_order_id
      and title = 'Departamento Autônomo de Marketing'
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
    'Departamento Autônomo de Marketing',
    v_description,
    'maximum',
    'in_progress',
    'Conselho Estratégico',
    'conselho@meuzafi.com.br',
    'council',
    'Ordem aprovada para implementação'
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
      'oe_code', 'OE-011.1',
      'version', v_version,
      'priority', 'maximum',
      'status', 'in_progress',
      'initial_autonomy_level', 1
    )
  );
end;
$$;
