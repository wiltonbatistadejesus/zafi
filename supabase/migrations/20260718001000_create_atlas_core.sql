create table public.atlas_partners (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null check (length(name) between 2 and 200),
  legal_name text,
  partner_kind text not null check (partner_kind in ('affiliate', 'direct', 'educational', 'data_provider', 'other')),
  status text not null check (status in ('active', 'inactive', 'review')),
  operational_status text not null check (operational_status in ('healthy', 'degraded', 'disabled', 'pending_validation')),
  knowledge_entity_id uuid,
  notes text,
  active_from timestamptz,
  active_until timestamptz,
  last_validated_at timestamptz,
  schema_version integer not null default 1 check (schema_version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (active_until is null or active_from is null or active_until > active_from)
);

create table public.atlas_products (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.atlas_partners(id) on delete restrict,
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null,
  product_type text not null check (product_type in ('debt_agreement', 'personal_loan', 'loan_marketplace', 'payroll_loan', 'fgts_advance', 'other')),
  status text not null check (status in ('active', 'inactive', 'review')),
  description text not null,
  recommendation_reason text not null,
  display_tag text not null,
  tag_tone text not null check (tag_tone in ('blue', 'amber', 'sky', 'violet', 'cyan', 'emerald', 'slate')),
  icon text not null check (length(icon) between 1 and 8),
  base_score integer not null default 0 check (base_score between -10000 and 10000),
  is_featured boolean not null default false,
  terms_last_checked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.atlas_campaigns (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.atlas_partners(id) on delete restrict,
  external_id text not null,
  name text not null,
  network text not null check (network in ('actionpay', 'direct', 'other')),
  status text not null check (status in ('active', 'inactive', 'review')),
  starts_at timestamptz,
  ends_at timestamptz,
  last_validated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (network, external_id),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);

create table public.atlas_product_campaigns (
  product_id uuid not null references public.atlas_products(id) on delete cascade,
  campaign_id uuid not null references public.atlas_campaigns(id) on delete restrict,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (product_id, campaign_id)
);

create unique index atlas_product_campaigns_one_primary_idx
  on public.atlas_product_campaigns (product_id) where is_primary;

create table public.atlas_remuneration (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.atlas_campaigns(id) on delete restrict,
  model text not null check (model in ('pending_confirmation', 'cpc', 'cpl', 'cpa', 'revenue_share', 'fixed')),
  amount numeric(14,4) check (amount is null or amount >= 0),
  percentage numeric(7,4) check (percentage is null or percentage between 0 and 100),
  currency text check (currency is null or currency ~ '^[A-Z]{3}$'),
  status text not null check (status in ('pending_confirmation', 'confirmed', 'expired')),
  source_reference text,
  effective_from timestamptz,
  effective_until timestamptz,
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (campaign_id, effective_from),
  check (effective_until is null or effective_from is null or effective_until > effective_from),
  check ((model = 'pending_confirmation' and status = 'pending_confirmation') or model <> 'pending_confirmation')
);

create table public.atlas_integrations (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.atlas_campaigns(id) on delete restrict,
  integration_type text not null check (integration_type in ('redirect', 'postback')),
  destination_url text,
  status text not null check (status in ('active', 'inactive', 'degraded', 'pending_configuration')),
  preserves_network_parameters boolean not null default true,
  click_id_strategy text check (click_id_strategy in ('replace_subaccount_segment', 'query_parameter', 'none')),
  click_id_parameter text,
  configuration jsonb not null default '{}'::jsonb check (jsonb_typeof(configuration) = 'object'),
  last_validated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (campaign_id, integration_type),
  check (integration_type <> 'redirect' or destination_url is not null)
);

create table public.atlas_eligibility_rules (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.atlas_products(id) on delete cascade,
  rule_key text not null,
  attribute text not null check (attribute in ('debt_count', 'total_debt', 'monthly_income', 'debt_to_income_ratio', 'debt_types')),
  operator text not null check (operator in ('eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'in', 'contains_any', 'exists')),
  expected_value jsonb not null,
  effect text not null check (effect in ('require', 'exclude', 'score')),
  score_delta integer check ((effect = 'score' and score_delta is not null) or (effect <> 'score' and score_delta is null)),
  explanation text not null,
  priority integer not null default 100 check (priority > 0),
  status text not null default 'active' check (status in ('active', 'inactive', 'review')),
  effective_from timestamptz,
  effective_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, rule_key),
  check (effective_until is null or effective_from is null or effective_until > effective_from)
);

create table public.atlas_placements (
  product_id uuid not null references public.atlas_products(id) on delete cascade,
  page_route text not null check (page_route ~ '^/'),
  section text not null check (section in ('renegotiation', 'credit', 'education', 'other')),
  display_order integer not null check (display_order > 0),
  status text not null check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (product_id, page_route, section)
);

create index atlas_products_partner_status_idx on public.atlas_products (partner_id, status);
create index atlas_campaigns_partner_status_idx on public.atlas_campaigns (partner_id, status);
create index atlas_product_campaigns_campaign_idx on public.atlas_product_campaigns (campaign_id);
create index atlas_remuneration_campaign_status_idx on public.atlas_remuneration (campaign_id, status);
create unique index atlas_remuneration_current_campaign_idx on public.atlas_remuneration (campaign_id)
  where effective_until is null;
create index atlas_integrations_campaign_status_idx on public.atlas_integrations (campaign_id, status);
create index atlas_eligibility_product_priority_idx on public.atlas_eligibility_rules (product_id, priority) where status = 'active';
create index atlas_placements_route_section_idx on public.atlas_placements (page_route, section, display_order) where status = 'active';

alter table public.atlas_partners enable row level security;
alter table public.atlas_products enable row level security;
alter table public.atlas_campaigns enable row level security;
alter table public.atlas_product_campaigns enable row level security;
alter table public.atlas_remuneration enable row level security;
alter table public.atlas_integrations enable row level security;
alter table public.atlas_eligibility_rules enable row level security;
alter table public.atlas_placements enable row level security;

revoke all on table public.atlas_partners, public.atlas_products, public.atlas_campaigns,
  public.atlas_product_campaigns, public.atlas_remuneration, public.atlas_integrations,
  public.atlas_eligibility_rules, public.atlas_placements from anon, authenticated;

create policy atlas_partners_deny_direct on public.atlas_partners as restrictive for all to anon, authenticated using (false) with check (false);
create policy atlas_products_deny_direct on public.atlas_products as restrictive for all to anon, authenticated using (false) with check (false);
create policy atlas_campaigns_deny_direct on public.atlas_campaigns as restrictive for all to anon, authenticated using (false) with check (false);
create policy atlas_product_campaigns_deny_direct on public.atlas_product_campaigns as restrictive for all to anon, authenticated using (false) with check (false);
create policy atlas_remuneration_deny_direct on public.atlas_remuneration as restrictive for all to anon, authenticated using (false) with check (false);
create policy atlas_integrations_deny_direct on public.atlas_integrations as restrictive for all to anon, authenticated using (false) with check (false);
create policy atlas_eligibility_rules_deny_direct on public.atlas_eligibility_rules as restrictive for all to anon, authenticated using (false) with check (false);
create policy atlas_placements_deny_direct on public.atlas_placements as restrictive for all to anon, authenticated using (false) with check (false);

create or replace view public.atlas_partner_performance
with (security_invoker = true)
as
with clicks as (
  select partner_id, count(*)::bigint clicks,
    count(*) filter (where occurred_at >= now() - interval '30 days')::bigint clicks_30d
  from public.affiliate_clicks group by partner_id
), conversions as (
  select partner_id,
    count(*)::bigint conversions,
    count(*) filter (where status = 'approved')::bigint approved_conversions,
    count(*) filter (where last_received_at >= now() - interval '30 days')::bigint conversions_30d,
    coalesce(sum(commission) filter (where status = 'approved'), 0)::numeric(14,4) revenue,
    max(currency) filter (where status = 'approved') currency
  from public.affiliate_conversions group by partner_id
)
select p.id partner_uuid, p.slug partner_id, p.name partner_name,
  coalesce(c.clicks, 0) clicks,
  coalesce(c.clicks_30d, 0) clicks_30d,
  coalesce(v.conversions, 0) conversions,
  coalesce(v.approved_conversions, 0) approved_conversions,
  coalesce(v.conversions_30d, 0) conversions_30d,
  coalesce(v.revenue, 0)::numeric(14,4) revenue,
  v.currency,
  case when coalesce(c.clicks, 0) > 0 then round(coalesce(v.revenue, 0) / c.clicks, 4) else 0 end::numeric(14,4) epc,
  case when coalesce(c.clicks, 0) > 0 then round(100.0 * coalesce(v.approved_conversions, 0) / c.clicks, 4) else 0 end::numeric(9,4) conversion_rate
from public.atlas_partners p
left join clicks c on c.partner_id = p.slug
left join conversions v on v.partner_id = p.slug;

revoke all on public.atlas_partner_performance from public, anon, authenticated;

with rows(slug, name, partner_kind, status, operational_status, notes, active_from, last_validated_at) as (
  values
    ('acordo-certo', 'Acordo Certo', 'affiliate', 'active', 'healthy', 'A vitrine pública possui mais de uma campanha Acordo Certo.', now(), now()),
    ('super-sim', 'SuperSim', 'affiliate', 'active', 'healthy', null, now(), now()),
    ('financia-tudo', 'FinanciaTudo', 'direct', 'active', 'healthy', null, now(), now()),
    ('juros-baixos', 'Juros Baixos', 'affiliate', 'active', 'healthy', 'Destino validado; meta e remuneração dependem da confirmação oficial.', now(), now()),
    ('finanzero', 'FinanZero', 'affiliate', 'active', 'healthy', null, now(), now()),
    ('bom-pra-credito', 'Bom Pra Crédito', 'affiliate', 'active', 'healthy', 'Link oficial informado pelo afiliado em 17/07/2026.', now(), now()),
    ('consiga-mais', 'ConsigMais', 'affiliate', 'inactive', 'disabled', 'Desativado após erro HTTP/2 no destino durante teste controlado.', now(), now())
)
insert into public.atlas_partners (slug, name, partner_kind, status, operational_status, notes, active_from, last_validated_at)
select * from rows
on conflict (slug) do update set name = excluded.name, partner_kind = excluded.partner_kind,
  status = excluded.status, operational_status = excluded.operational_status, notes = excluded.notes,
  last_validated_at = excluded.last_validated_at, updated_at = now();

with rows(partner_slug, slug, name, product_type, status, description, reason, tag, tone, icon, base_score, featured) as (
  values
    ('acordo-certo', 'acordo-certo-negociacao', 'Negociação Acordo Certo', 'debt_agreement', 'active', 'Uma opção para consultar acordos e negociar dívidas diretamente pela internet.', 'Renegociar pode reduzir juros e encurtar o caminho de saída sem criar uma nova dívida.', 'Recomendado pela Zafi', 'blue', '✓', 80, true),
    ('super-sim', 'super-sim-emprestimo-pessoal', 'SuperSim — Empréstimo Pessoal', 'personal_loan', 'active', 'Alternativa digital para simular uma solução de crédito ou reorganização.', 'Compare condições antes de tomar qualquer decisão e só avance se o custo total diminuir.', 'Aprovação rápida', 'amber', '↗', 45, false),
    ('financia-tudo', 'financia-tudo-comparacao', 'Soluções FinanciaTudo', 'loan_marketplace', 'active', 'Uma opção adicional para consultar soluções financeiras e comparar propostas.', 'Avalie custo total, prazo e se a nova condição realmente reduz os juros atuais.', 'Compare propostas', 'sky', '↗', 40, false),
    ('juros-baixos', 'juros-baixos-emprestimo', 'Juros Baixos — Empréstimo pessoal', 'loan_marketplace', 'active', 'Comparador de crédito para avaliar propostas de diferentes instituições.', 'Só considere crédito se a taxa total for menor que a da dívida atual. Compare o CET.', 'Menor taxa', 'violet', '%', 40, true),
    ('finanzero', 'finanzero-emprestimos', 'FinanZero — Empréstimos', 'loan_marketplace', 'active', 'Plataforma para consultar e comparar ofertas de crédito.', 'Ter mais de uma proposta reduz o risco de aceitar a primeira condição disponível.', 'Compare propostas', 'cyan', '≋', 40, false),
    ('bom-pra-credito', 'bom-pra-credito-emprestimos', 'Bom Pra Crédito — Empréstimos', 'loan_marketplace', 'active', 'Outra alternativa para buscar propostas adequadas ao perfil.', 'Uma opção adicional ajuda a comparar prazo, parcelas e custo total.', 'Análise online', 'emerald', '+', 40, false),
    ('consiga-mais', 'consiga-mais-fgts', 'ConsigMais — FGTS', 'fgts_advance', 'inactive', 'Antecipação vinculada ao FGTS.', 'Produto indisponível até nova validação operacional.', 'Indisponível', 'slate', '↗', 0, false)
)
insert into public.atlas_products (partner_id, slug, name, product_type, status, description, recommendation_reason, display_tag, tag_tone, icon, base_score, is_featured)
select p.id, r.slug, r.name, r.product_type, r.status, r.description, r.reason, r.tag, r.tone, r.icon, r.base_score, r.featured
from rows r join public.atlas_partners p on p.slug = r.partner_slug
on conflict (slug) do update set partner_id = excluded.partner_id, name = excluded.name,
  product_type = excluded.product_type, status = excluded.status, description = excluded.description,
  recommendation_reason = excluded.recommendation_reason, display_tag = excluded.display_tag,
  tag_tone = excluded.tag_tone, icon = excluded.icon, base_score = excluded.base_score,
  is_featured = excluded.is_featured, updated_at = now();

with rows(partner_slug, external_id, name, network, status) as (
  values
    ('acordo-certo', '187558', 'Actionpay ref. 187558 — nome oficial pendente', 'actionpay', 'active'),
    ('super-sim', '177702', 'SuperSim — Empréstimo Pessoal', 'actionpay', 'active'),
    ('financia-tudo', 'financia-tudo-direct', 'Produtos FinanciaTudo — link direto', 'direct', 'active'),
    ('juros-baixos', '179945', 'Juros Baixos — Empréstimo pessoal', 'actionpay', 'active'),
    ('finanzero', '180635', 'FinanZero — Empréstimos', 'actionpay', 'active'),
    ('bom-pra-credito', '185636', 'Bom Pra Crédito — Actionpay ref. 185636', 'actionpay', 'active'),
    ('consiga-mais', '184986', 'ConsigMais — FGTS', 'actionpay', 'inactive')
)
insert into public.atlas_campaigns (partner_id, external_id, name, network, status, last_validated_at)
select p.id, r.external_id, r.name, r.network, r.status, now()
from rows r join public.atlas_partners p on p.slug = r.partner_slug
on conflict (network, external_id) do update set partner_id = excluded.partner_id, name = excluded.name,
  status = excluded.status, last_validated_at = excluded.last_validated_at, updated_at = now();

insert into public.atlas_product_campaigns (product_id, campaign_id, is_primary)
select pr.id, c.id, true
from public.atlas_products pr
join public.atlas_partners p on p.id = pr.partner_id
join public.atlas_campaigns c on c.partner_id = p.id
on conflict (product_id, campaign_id) do update set is_primary = true;

insert into public.atlas_remuneration (campaign_id, model, status, source_reference)
select c.id, 'pending_confirmation', 'pending_confirmation', 'OE-003A: aguardando confirmação oficial de metas e pagamentos.'
from public.atlas_campaigns c
on conflict (campaign_id, effective_from) do nothing;

with rows(network, external_id, destination_url, status, strategy, validated_at) as (
  values
    ('actionpay', '187558', 'https://apretailer.com.br/click/6a3f408e2bfa813aa26ff5b5/187558/359422/subaccount', 'active', 'replace_subaccount_segment', now()),
    ('actionpay', '177702', 'https://apretailer.com.br/click/6a3f408e2bfa813b02188995/177702/359422/subaccount', 'active', 'replace_subaccount_segment', now()),
    ('direct', 'financia-tudo-direct', 'https://financiatudo.com.br/produtos/chave/cadc009df0f513e09ac0d9ec33f3bd5f74b70fd3', 'active', 'none', now()),
    ('actionpay', '179945', 'https://apretailer.com.br/click/6a3f408e2bfa813b0819e8c6/179945/359422/subaccount', 'active', 'replace_subaccount_segment', now()),
    ('actionpay', '180635', 'https://apretailer.com.br/click/6a3f408d2bfa813b0e7707a3/180635/359422/subaccount', 'active', 'replace_subaccount_segment', now()),
    ('actionpay', '185636', 'https://apretailer.com.br/click/6a3f408d2bfa813afc65b8b7/185636/359422/subaccount', 'active', 'replace_subaccount_segment', now()),
    ('actionpay', '184986', 'https://apretailer.com.br/click/6a3f408d2bfa813ab73f7f94/184986/359422/subaccount', 'inactive', 'replace_subaccount_segment', now())
)
insert into public.atlas_integrations (campaign_id, integration_type, destination_url, status, preserves_network_parameters, click_id_strategy, last_validated_at)
select c.id, 'redirect', r.destination_url, r.status, true, r.strategy, r.validated_at
from rows r join public.atlas_campaigns c on c.network = r.network and c.external_id = r.external_id
on conflict (campaign_id, integration_type) do update set destination_url = excluded.destination_url,
  status = excluded.status, preserves_network_parameters = excluded.preserves_network_parameters,
  click_id_strategy = excluded.click_id_strategy, last_validated_at = excluded.last_validated_at,
  updated_at = now();

with placements(product_slug, section, display_order, status) as (
  values
    ('acordo-certo-negociacao', 'renegotiation', 10, 'active'),
    ('super-sim-emprestimo-pessoal', 'renegotiation', 20, 'active'),
    ('financia-tudo-comparacao', 'credit', 10, 'active'),
    ('juros-baixos-emprestimo', 'credit', 20, 'active'),
    ('finanzero-emprestimos', 'credit', 30, 'active'),
    ('bom-pra-credito-emprestimos', 'credit', 40, 'active'),
    ('consiga-mais-fgts', 'credit', 50, 'inactive')
)
insert into public.atlas_placements (product_id, page_route, section, display_order, status)
select p.id, '/', x.section, x.display_order, x.status
from placements x join public.atlas_products p on p.slug = x.product_slug
on conflict (product_id, page_route, section) do update set display_order = excluded.display_order,
  status = excluded.status, updated_at = now();

insert into public.atlas_eligibility_rules (product_id, rule_key, attribute, operator, expected_value, effect, score_delta, explanation, priority)
select p.id, 'has-debt', 'debt_count', 'gte', '1'::jsonb, 'require', null, 'Exige ao menos uma dívida registrada para apresentar a solução.', 10
from public.atlas_products p
on conflict (product_id, rule_key) do update set attribute = excluded.attribute, operator = excluded.operator,
  expected_value = excluded.expected_value, effect = excluded.effect, score_delta = excluded.score_delta,
  explanation = excluded.explanation, priority = excluded.priority, status = 'active', updated_at = now();

with rules(product_slug, rule_key, attribute, operator, expected_value, score_delta, explanation, priority) as (
  values
    ('acordo-certo-negociacao', 'high-interest-priority', 'debt_types', 'contains_any', '["cartao","rotativo","emprestimo","crediario"]'::jsonb, 20, 'Prioriza negociação quando há dívida de juros elevados.', 20),
    ('acordo-certo-negociacao', 'payment-pressure-priority', 'debt_to_income_ratio', 'gte', '4'::jsonb, 20, 'Prioriza negociação quando a dívida supera quatro rendas mensais.', 30),
    ('super-sim-emprestimo-pessoal', 'high-interest-comparison', 'debt_types', 'contains_any', '["cartao","rotativo","emprestimo","crediario"]'::jsonb, 10, 'Eleva a comparação quando existe dívida cara, sem garantir aprovação.', 20),
    ('financia-tudo-comparacao', 'high-interest-comparison', 'debt_types', 'contains_any', '["cartao","rotativo","emprestimo","crediario"]'::jsonb, 25, 'Eleva comparadores quando a troca pode reduzir juros.', 20),
    ('financia-tudo-comparacao', 'payment-pressure-comparison', 'debt_to_income_ratio', 'gte', '4'::jsonb, 10, 'Eleva comparação quando existe pressão relevante sobre a renda.', 30),
    ('juros-baixos-emprestimo', 'high-interest-comparison', 'debt_types', 'contains_any', '["cartao","rotativo","emprestimo","crediario"]'::jsonb, 35, 'Prioriza comparação de CET quando a dívida atual tem juros elevados.', 20),
    ('finanzero-emprestimos', 'high-interest-comparison', 'debt_types', 'contains_any', '["cartao","rotativo","emprestimo","crediario"]'::jsonb, 20, 'Eleva a comparação quando há potencial de reduzir juros.', 20),
    ('bom-pra-credito-emprestimos', 'high-interest-comparison', 'debt_types', 'contains_any', '["cartao","rotativo","emprestimo","crediario"]'::jsonb, 15, 'Eleva a opção adicional quando há dívida cara.', 20)
)
insert into public.atlas_eligibility_rules (product_id, rule_key, attribute, operator, expected_value, effect, score_delta, explanation, priority)
select p.id, r.rule_key, r.attribute, r.operator, r.expected_value, 'score', r.score_delta, r.explanation, r.priority
from rules r join public.atlas_products p on p.slug = r.product_slug
on conflict (product_id, rule_key) do update set attribute = excluded.attribute, operator = excluded.operator,
  expected_value = excluded.expected_value, effect = excluded.effect, score_delta = excluded.score_delta,
  explanation = excluded.explanation, priority = excluded.priority, status = 'active', updated_at = now();

create or replace function public.atlas_catalog_snapshot(p_secret text, p_page_route text default '/')
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_result jsonb;
begin
  if not public.telemetry_secret_valid(p_secret) then raise exception 'invalid atlas secret' using errcode = '42501'; end if;

  select jsonb_build_object(
    'schemaVersion', 1,
    'generatedAt', now(),
    'products', coalesce(jsonb_agg(jsonb_build_object(
      'id', pr.slug,
      'partnerId', pa.slug,
      'name', pa.name,
      'productName', pr.name,
      'productType', pr.product_type,
      'description', pr.description,
      'reason', pr.recommendation_reason,
      'tag', pr.display_tag,
      'tagTone', pr.tag_tone,
      'icon', pr.icon,
      'baseScore', pr.base_score,
      'featured', pr.is_featured,
      'section', pl.section,
      'displayOrder', pl.display_order,
      'campaignId', ca.external_id,
      'campaignName', ca.name,
      'network', ca.network,
      'remuneration', jsonb_build_object('model', re.model, 'status', re.status, 'currency', re.currency),
      'metrics', jsonb_build_object(
        'clicks', pf.clicks, 'clicks30d', pf.clicks_30d, 'conversions', pf.conversions,
        'approvedConversions', pf.approved_conversions, 'revenue', pf.revenue,
        'currency', pf.currency, 'epc', pf.epc, 'conversionRate', pf.conversion_rate
      ),
      'rules', coalesce((
        select jsonb_agg(jsonb_build_object(
          'key', er.rule_key, 'attribute', er.attribute, 'operator', er.operator,
          'expectedValue', er.expected_value, 'effect', er.effect,
          'scoreDelta', er.score_delta, 'explanation', er.explanation, 'priority', er.priority
        ) order by er.priority, er.rule_key)
        from public.atlas_eligibility_rules er
        where er.product_id = pr.id and er.status = 'active'
          and (er.effective_from is null or er.effective_from <= now())
          and (er.effective_until is null or er.effective_until > now())
      ), '[]'::jsonb)
    ) order by pl.section, pl.display_order), '[]'::jsonb)
  ) into v_result
  from public.atlas_products pr
  join public.atlas_partners pa on pa.id = pr.partner_id
  join public.atlas_placements pl on pl.product_id = pr.id and pl.page_route = p_page_route and pl.status = 'active'
  join public.atlas_product_campaigns pc on pc.product_id = pr.id and pc.is_primary
  join public.atlas_campaigns ca on ca.id = pc.campaign_id
  join public.atlas_remuneration re on re.campaign_id = ca.id and re.status in ('pending_confirmation', 'confirmed')
  join public.atlas_partner_performance pf on pf.partner_uuid = pa.id
  where pa.status = 'active' and pa.operational_status in ('healthy', 'degraded')
    and pr.status = 'active' and ca.status = 'active';

  return v_result;
end;
$$;

revoke all on function public.atlas_catalog_snapshot(text, text) from public, authenticated;
grant execute on function public.atlas_catalog_snapshot(text, text) to anon;

create or replace function public.atlas_resolve_partner(p_secret text, p_slug text default null, p_campaign_id text default null)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_result jsonb;
begin
  if not public.telemetry_secret_valid(p_secret) then raise exception 'invalid atlas secret' using errcode = '42501'; end if;
  if nullif(trim(p_slug), '') is null and nullif(trim(p_campaign_id), '') is null then return null; end if;

  select jsonb_build_object(
    'id', pa.slug, 'name', pa.name, 'campaignId', ca.external_id,
    'campaignName', ca.name, 'network', ca.network,
    'active', pa.status = 'active' and pa.operational_status in ('healthy', 'degraded')
      and ca.status = 'active' and i.status in ('active', 'degraded'),
    'operationalStatus', pa.operational_status,
    'destinationUrl', i.destination_url,
    'clickIdStrategy', i.click_id_strategy,
    'remunerationModel', re.model,
    'remunerationStatus', re.status,
    'note', pa.notes
  ) into v_result
  from public.atlas_partners pa
  join public.atlas_campaigns ca on ca.partner_id = pa.id
  join public.atlas_integrations i on i.campaign_id = ca.id and i.integration_type = 'redirect'
  join public.atlas_remuneration re on re.campaign_id = ca.id and re.status in ('pending_confirmation', 'confirmed')
  where (p_slug is not null and pa.slug = p_slug)
     or (p_campaign_id is not null and ca.external_id = p_campaign_id)
  order by ca.status = 'active' desc, ca.updated_at desc
  limit 1;

  return v_result;
end;
$$;

revoke all on function public.atlas_resolve_partner(text, text, text) from public, authenticated;
grant execute on function public.atlas_resolve_partner(text, text, text) to anon;

comment on table public.atlas_partners is 'Atlas Core: fonte oficial de parceiros e status operacional.';
comment on table public.atlas_products is 'Produtos estruturados oferecidos por parceiros.';
comment on table public.atlas_campaigns is 'Campanhas comerciais e identificadores externos.';
comment on table public.atlas_remuneration is 'Modelo de remuneração versionável; valores desconhecidos permanecem nulos.';
comment on table public.atlas_integrations is 'Configuração operacional de redirect e postback, sem exposição direta.';
comment on table public.atlas_eligibility_rules is 'Regras parametrizadas e consultáveis para o futuro Recommendation Engine.';
comment on view public.atlas_partner_performance is 'Métricas reais derivadas de cliques e conversões, sem placeholders.';
