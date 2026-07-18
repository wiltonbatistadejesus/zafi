create table public.recommendation_runs (
  id uuid primary key,
  request_key text not null unique,
  profile_id uuid not null references public.smart_profiles(id) on delete restrict,
  visitor_id uuid not null,
  session_id uuid not null,
  page_route text not null check (page_route ~ '^/'),
  engine_version text not null,
  atlas_version text not null,
  profile_schema_version integer not null check (profile_schema_version > 0),
  profile_snapshot jsonb not null check (jsonb_typeof(profile_snapshot) = 'object'),
  result_snapshot jsonb not null check (jsonb_typeof(result_snapshot) = 'object'),
  experiment_key text,
  experiment_variant text,
  created_at timestamptz not null default now()
);

create table public.recommendation_decisions (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.recommendation_runs(id) deferrable initially deferred,
  product_id uuid not null references public.atlas_products(id) on delete restrict,
  partner_id uuid not null references public.atlas_partners(id) on delete restrict,
  campaign_id uuid references public.atlas_campaigns(id) on delete restrict,
  eligible boolean not null,
  score integer not null,
  rank integer check (rank is null or rank > 0),
  recommendation_reasons jsonb not null default '[]'::jsonb check (jsonb_typeof(recommendation_reasons) = 'array'),
  exclusion_reasons jsonb not null default '[]'::jsonb check (jsonb_typeof(exclusion_reasons) = 'array'),
  applied_rules jsonb not null default '[]'::jsonb check (jsonb_typeof(applied_rules) = 'array'),
  decision_snapshot jsonb not null check (jsonb_typeof(decision_snapshot) = 'object'),
  created_at timestamptz not null default now(),
  unique (run_id, product_id)
);

create index recommendation_runs_profile_created_idx on public.recommendation_runs (profile_id, created_at desc);
create index recommendation_runs_session_created_idx on public.recommendation_runs (session_id, created_at desc);
create index recommendation_decisions_run_rank_idx on public.recommendation_decisions (run_id, eligible, rank);
create index recommendation_decisions_product_idx on public.recommendation_decisions (product_id);
create index recommendation_decisions_partner_created_idx on public.recommendation_decisions (partner_id, created_at desc);
create index recommendation_decisions_campaign_idx on public.recommendation_decisions (campaign_id) where campaign_id is not null;

alter table public.recommendation_runs enable row level security;
alter table public.recommendation_decisions enable row level security;

revoke all on table public.recommendation_runs, public.recommendation_decisions from anon, authenticated;

create policy recommendation_runs_deny_direct on public.recommendation_runs
  as restrictive for all to anon, authenticated using (false) with check (false);
create policy recommendation_decisions_deny_direct on public.recommendation_decisions
  as restrictive for all to anon, authenticated using (false) with check (false);

create trigger recommendation_runs_append_only before update or delete on public.recommendation_runs
for each row execute function public.telemetry_block_mutation();
create trigger recommendation_decisions_append_only before update or delete on public.recommendation_decisions
for each row execute function public.telemetry_block_mutation();

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create or replace function private.recommendation_rule_matches(
  p_actual jsonb,
  p_operator text,
  p_expected jsonb
)
returns boolean
language plpgsql
immutable
set search_path = pg_catalog
as $$
declare
  v_actual_number numeric;
  v_expected_number numeric;
begin
  if p_operator = 'exists' then
    return p_actual is not null and p_actual <> 'null'::jsonb;
  end if;

  if p_actual is null or p_actual = 'null'::jsonb then return false; end if;

  if p_operator = 'eq' then return p_actual = p_expected; end if;
  if p_operator = 'neq' then return p_actual <> p_expected; end if;

  if p_operator = 'contains_any' then
    if jsonb_typeof(p_actual) <> 'array' or jsonb_typeof(p_expected) <> 'array' then return false; end if;
    return exists (
      select 1
      from jsonb_array_elements_text(p_actual) actual(value)
      join jsonb_array_elements_text(p_expected) expected(value) using (value)
    );
  end if;

  if p_operator = 'in' then
    if jsonb_typeof(p_expected) <> 'array' then return false; end if;
    return exists (select 1 from jsonb_array_elements(p_expected) item(value) where item.value = p_actual);
  end if;

  if p_operator in ('gt', 'gte', 'lt', 'lte') then
    if jsonb_typeof(p_actual) <> 'number' or jsonb_typeof(p_expected) <> 'number' then return false; end if;
    v_actual_number := (p_actual #>> '{}')::numeric;
    v_expected_number := (p_expected #>> '{}')::numeric;
    return case p_operator
      when 'gt' then v_actual_number > v_expected_number
      when 'gte' then v_actual_number >= v_expected_number
      when 'lt' then v_actual_number < v_expected_number
      when 'lte' then v_actual_number <= v_expected_number
      else false
    end;
  end if;

  return false;
end;
$$;

revoke all on function private.recommendation_rule_matches(jsonb, text, jsonb) from public, anon, authenticated;

create or replace function private.recommendation_execute(
  p_visitor_id uuid,
  p_session_id uuid,
  p_page_route text default '/'
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_engine_version constant text := 'rules-1.0.0';
  v_profile public.smart_profiles%rowtype;
  v_financial public.profile_financial_context%rowtype;
  v_intelligence public.profile_intelligence%rowtype;
  v_profile_snapshot jsonb;
  v_input jsonb;
  v_atlas_updated_at timestamptz;
  v_atlas_version text;
  v_request_key text;
  v_run_id uuid := gen_random_uuid();
  v_created_at timestamptz := now();
  v_existing jsonb;
  v_work jsonb := '[]'::jsonb;
  v_candidate record;
  v_rule record;
  v_actual jsonb;
  v_matched boolean;
  v_eligible boolean;
  v_score integer;
  v_recommendation_reasons jsonb;
  v_exclusion_reasons jsonb;
  v_applied_rules jsonb;
  v_decision_snapshot jsonb;
  v_result jsonb;
begin
  if p_page_route is null or p_page_route !~ '^/' or length(p_page_route) > 500 then
    raise exception 'invalid recommendation page route';
  end if;

  select * into v_profile
  from public.smart_profiles
  where visitor_id = p_visitor_id and status = 'active';
  if v_profile.id is null then raise exception 'recommendation profile not found'; end if;

  if v_profile.current_session_id <> p_session_id then
    raise exception 'recommendation session not recognized';
  end if;

  select * into v_financial from public.profile_financial_context where profile_id = v_profile.id;
  if v_financial.profile_id is null or v_financial.total_debt is null
     or v_financial.monthly_income is null or v_financial.debt_count is null then
    raise exception 'recommendation financial context incomplete';
  end if;

  select * into v_intelligence from public.profile_intelligence where profile_id = v_profile.id;

  v_input := jsonb_strip_nulls(jsonb_build_object(
    'debt_count', v_financial.debt_count,
    'total_debt', v_financial.total_debt,
    'monthly_income', v_financial.monthly_income,
    'debt_to_income_ratio', case when v_financial.monthly_income > 0 then round(v_financial.total_debt / v_financial.monthly_income, 6) end,
    'debt_types', to_jsonb(coalesce(v_financial.debt_types, array[]::text[])),
    'estimated_months', v_financial.estimated_months,
    'score_zafi', v_intelligence.score_zafi,
    'conversion_probability', v_intelligence.conversion_probability,
    'interests', to_jsonb(v_intelligence.interests),
    'calculated_attributes', v_intelligence.calculated_attributes
  ));

  v_profile_snapshot := jsonb_build_object(
    'schemaVersion', v_financial.schema_version,
    'financialContextUpdatedAt', v_financial.updated_at,
    'intelligenceVersion', v_intelligence.calculation_version,
    'intelligenceCalculatedAt', v_intelligence.calculated_at,
    'attributes', v_input
  );

  select greatest(
    coalesce((select max(updated_at) from public.atlas_partners), '-infinity'::timestamptz),
    coalesce((select max(updated_at) from public.atlas_products), '-infinity'::timestamptz),
    coalesce((select max(updated_at) from public.atlas_campaigns), '-infinity'::timestamptz),
    coalesce((select max(updated_at) from public.atlas_remuneration), '-infinity'::timestamptz),
    coalesce((select max(updated_at) from public.atlas_integrations), '-infinity'::timestamptz),
    coalesce((select max(updated_at) from public.atlas_eligibility_rules), '-infinity'::timestamptz),
    coalesce((select max(updated_at) from public.atlas_placements), '-infinity'::timestamptz)
  ) into v_atlas_updated_at;
  v_atlas_version := 'atlas-1@' || to_char(v_atlas_updated_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"');

  v_request_key := encode(extensions.digest(
    concat_ws('|', p_visitor_id, p_session_id, p_page_route, v_engine_version,
      v_financial.updated_at, coalesce(v_intelligence.updated_at::text, ''), v_atlas_updated_at),
    'sha256'
  ), 'hex');

  perform pg_advisory_xact_lock(hashtextextended(v_request_key, 0));
  select result_snapshot || jsonb_build_object('reused', true)
    into v_existing from public.recommendation_runs where request_key = v_request_key;
  if v_existing is not null then return v_existing; end if;

  for v_candidate in
    select
      pr.id product_uuid, pr.slug product_slug, pr.name product_name, pr.product_type,
      pr.status product_status, pr.description, pr.recommendation_reason, pr.display_tag,
      pr.tag_tone, pr.icon, pr.base_score, pr.is_featured,
      pa.id partner_uuid, pa.slug partner_slug, pa.name partner_name,
      pa.status partner_status, pa.operational_status,
      pl.section, pl.display_order, pl.status placement_status,
      ca.id campaign_uuid, ca.external_id campaign_external_id, ca.name campaign_name,
      ca.network, ca.status campaign_status,
      ai.status integration_status
    from public.atlas_placements pl
    join public.atlas_products pr on pr.id = pl.product_id
    join public.atlas_partners pa on pa.id = pr.partner_id
    left join public.atlas_product_campaigns pc on pc.product_id = pr.id and pc.is_primary
    left join public.atlas_campaigns ca on ca.id = pc.campaign_id
    left join public.atlas_integrations ai on ai.campaign_id = ca.id and ai.integration_type = 'redirect'
    where pl.page_route = p_page_route
    order by pl.section, pl.display_order, pr.slug
  loop
    v_eligible := true;
    v_score := v_candidate.base_score;
    v_recommendation_reasons := '[]'::jsonb;
    v_exclusion_reasons := '[]'::jsonb;
    v_applied_rules := '[]'::jsonb;

    if v_candidate.placement_status <> 'active' then
      v_eligible := false;
      v_exclusion_reasons := v_exclusion_reasons || jsonb_build_array(jsonb_build_object('code', 'placement_inactive', 'detail', 'Posicionamento inativo no Atlas.'));
    end if;
    if v_candidate.product_status <> 'active' then
      v_eligible := false;
      v_exclusion_reasons := v_exclusion_reasons || jsonb_build_array(jsonb_build_object('code', 'product_inactive', 'detail', 'Produto inativo no Atlas.'));
    end if;
    if v_candidate.partner_status <> 'active' then
      v_eligible := false;
      v_exclusion_reasons := v_exclusion_reasons || jsonb_build_array(jsonb_build_object('code', 'partner_inactive', 'detail', 'Parceiro inativo no Atlas.'));
    end if;
    if v_candidate.operational_status not in ('healthy', 'degraded') then
      v_eligible := false;
      v_exclusion_reasons := v_exclusion_reasons || jsonb_build_array(jsonb_build_object('code', 'partner_unavailable', 'detail', 'Parceiro indisponível operacionalmente.'));
    end if;
    if v_candidate.campaign_uuid is null or v_candidate.campaign_status <> 'active' then
      v_eligible := false;
      v_exclusion_reasons := v_exclusion_reasons || jsonb_build_array(jsonb_build_object('code', 'campaign_inactive', 'detail', 'Campanha principal ausente ou inativa.'));
    end if;
    if v_candidate.integration_status is null or v_candidate.integration_status not in ('active', 'degraded') then
      v_eligible := false;
      v_exclusion_reasons := v_exclusion_reasons || jsonb_build_array(jsonb_build_object('code', 'redirect_unavailable', 'detail', 'Redirecionamento indisponível no Atlas.'));
    end if;

    for v_rule in
      select * from public.atlas_eligibility_rules er
      where er.product_id = v_candidate.product_uuid and er.status = 'active'
        and (er.effective_from is null or er.effective_from <= v_created_at)
        and (er.effective_until is null or er.effective_until > v_created_at)
      order by er.priority, er.rule_key
    loop
      v_actual := v_input -> v_rule.attribute;
      v_matched := private.recommendation_rule_matches(v_actual, v_rule.operator, v_rule.expected_value);
      v_applied_rules := v_applied_rules || jsonb_build_array(jsonb_build_object(
        'ruleId', v_rule.id, 'key', v_rule.rule_key, 'attribute', v_rule.attribute,
        'operator', v_rule.operator, 'actualValue', v_actual, 'expectedValue', v_rule.expected_value,
        'effect', v_rule.effect, 'scoreDelta', v_rule.score_delta, 'matched', v_matched,
        'explanation', v_rule.explanation, 'priority', v_rule.priority
      ));

      if v_rule.effect = 'require' and not v_matched then
        v_eligible := false;
        v_exclusion_reasons := v_exclusion_reasons || jsonb_build_array(jsonb_build_object('code', v_rule.rule_key, 'detail', v_rule.explanation, 'ruleId', v_rule.id));
      elsif v_rule.effect = 'exclude' and v_matched then
        v_eligible := false;
        v_exclusion_reasons := v_exclusion_reasons || jsonb_build_array(jsonb_build_object('code', v_rule.rule_key, 'detail', v_rule.explanation, 'ruleId', v_rule.id));
      elsif v_rule.effect = 'score' and v_matched then
        v_score := v_score + v_rule.score_delta;
        v_recommendation_reasons := v_recommendation_reasons || jsonb_build_array(jsonb_build_object('code', v_rule.rule_key, 'detail', v_rule.explanation, 'ruleId', v_rule.id, 'scoreDelta', v_rule.score_delta));
      end if;
    end loop;

    v_decision_snapshot := jsonb_strip_nulls(jsonb_build_object(
      'id', v_candidate.product_slug, 'partnerId', v_candidate.partner_slug,
      'name', v_candidate.partner_name, 'productName', v_candidate.product_name,
      'productType', v_candidate.product_type, 'description', v_candidate.description,
      'reason', v_candidate.recommendation_reason, 'tag', v_candidate.display_tag,
      'tagTone', v_candidate.tag_tone, 'icon', v_candidate.icon,
      'featured', v_candidate.is_featured, 'section', v_candidate.section,
      'displayOrder', v_candidate.display_order, 'campaignId', v_candidate.campaign_external_id,
      'campaignName', v_candidate.campaign_name, 'network', v_candidate.network
    ));

    v_work := v_work || jsonb_build_array(jsonb_build_object(
      'product_id', v_candidate.product_uuid, 'partner_id', v_candidate.partner_uuid,
      'campaign_id', v_candidate.campaign_uuid, 'eligible', v_eligible, 'score', v_score,
      'recommendation_reasons', v_recommendation_reasons, 'exclusion_reasons', v_exclusion_reasons,
      'applied_rules', v_applied_rules, 'snapshot', v_decision_snapshot,
      'display_order', v_candidate.display_order
    ));
  end loop;

  insert into public.recommendation_decisions (
    run_id, product_id, partner_id, campaign_id, eligible, score, rank,
    recommendation_reasons, exclusion_reasons, applied_rules, decision_snapshot, created_at
  )
  select v_run_id, x.product_id, x.partner_id, x.campaign_id, x.eligible, x.score,
    case when x.eligible then row_number() over (partition by x.eligible order by x.score desc, x.display_order, x.product_id)::integer end,
    x.recommendation_reasons, x.exclusion_reasons, x.applied_rules, x.snapshot, v_created_at
  from jsonb_to_recordset(v_work) as x(
    product_id uuid, partner_id uuid, campaign_id uuid, eligible boolean, score integer,
    recommendation_reasons jsonb, exclusion_reasons jsonb, applied_rules jsonb,
    snapshot jsonb, display_order integer
  );

  select jsonb_build_object(
    'schemaVersion', 1, 'runId', v_run_id, 'engineVersion', v_engine_version,
    'atlasVersion', v_atlas_version, 'generatedAt', v_created_at, 'reused', false,
    'dataUsed', v_profile_snapshot,
    'recommendations', coalesce(jsonb_agg(
      d.decision_snapshot || jsonb_build_object(
        'eligible', true, 'score', d.score, 'rank', d.rank,
        'recommendationReasons', d.recommendation_reasons,
        'appliedRules', d.applied_rules
      ) order by d.rank
    ) filter (where d.eligible), '[]'::jsonb),
    'exclusions', coalesce(jsonb_agg(
      d.decision_snapshot || jsonb_build_object(
        'eligible', false, 'score', d.score, 'exclusionReasons', d.exclusion_reasons,
        'appliedRules', d.applied_rules
      ) order by d.decision_snapshot->>'id'
    ) filter (where not d.eligible), '[]'::jsonb)
  ) into v_result
  from public.recommendation_decisions d where d.run_id = v_run_id;

  insert into public.recommendation_runs (
    id, request_key, profile_id, visitor_id, session_id, page_route,
    engine_version, atlas_version, profile_schema_version, profile_snapshot,
    result_snapshot, experiment_key, experiment_variant, created_at
  ) values (
    v_run_id, v_request_key, v_profile.id, p_visitor_id, p_session_id, p_page_route,
    v_engine_version, v_atlas_version, v_financial.schema_version, v_profile_snapshot,
    v_result, null, null, v_created_at
  );

  return v_result;
end;
$$;

revoke all on function private.recommendation_execute(uuid, uuid, text) from public, anon, authenticated;

create or replace function public.recommendation_run(
  p_secret text,
  p_visitor_id uuid,
  p_session_id uuid,
  p_page_route text default '/'
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
begin
  if not public.telemetry_secret_valid(p_secret) then
    raise exception 'invalid recommendation secret' using errcode = '42501';
  end if;
  return private.recommendation_execute(p_visitor_id, p_session_id, p_page_route);
end;
$$;

revoke all on function public.recommendation_run(text, uuid, uuid, text) from public, authenticated;
grant execute on function public.recommendation_run(text, uuid, uuid, text) to anon;

comment on table public.recommendation_runs is 'Execuções append-only do Recommendation Engine, com snapshots para auditoria e experimentos.';
comment on table public.recommendation_decisions is 'Decisão auditável por produto, incluindo elegibilidade, pontuação, regras e motivos.';
comment on function public.recommendation_run(text, uuid, uuid, text) is 'Motor determinístico rules-1.0.0: usa apenas Perfil Inteligente persistido e regras do Atlas Core.';
