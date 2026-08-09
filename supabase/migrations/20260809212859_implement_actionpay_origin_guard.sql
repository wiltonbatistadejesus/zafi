create table public.atlas_campaign_traffic_rules (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.atlas_campaigns(id) on delete cascade,
  rule_key text not null check (rule_key ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  origin_group text not null check (origin_group in ('any','social','search','direct','referral','email','unknown')),
  effect text not null check (effect in ('allow','block')),
  reason text not null check (length(reason) between 5 and 1000),
  evidence_reference text not null check (length(evidence_reference) between 5 and 2000),
  evidence_checked_at timestamptz not null,
  priority integer not null default 100 check (priority > 0),
  status text not null default 'active' check (status in ('active','inactive','review')),
  effective_from timestamptz,
  effective_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (campaign_id, rule_key),
  check (effective_until is null or effective_from is null or effective_until > effective_from)
);

create index atlas_campaign_traffic_rules_lookup_idx
  on public.atlas_campaign_traffic_rules (campaign_id, status, origin_group, priority);

alter table public.atlas_campaign_traffic_rules enable row level security;
revoke all on table public.atlas_campaign_traffic_rules from public, anon, authenticated;
create policy atlas_campaign_traffic_rules_deny_direct
  on public.atlas_campaign_traffic_rules as restrictive for all to anon, authenticated
  using (false) with check (false);

create table public.recommendation_policy_evaluations (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.recommendation_runs(id) on delete restrict,
  policy_version text not null,
  traffic_source text not null,
  traffic_medium text not null,
  origin_group text not null,
  result_snapshot jsonb not null check (jsonb_typeof(result_snapshot) = 'object'),
  applied_rule_ids uuid[] not null default array[]::uuid[],
  created_at timestamptz not null default now(),
  unique (run_id, policy_version, traffic_source, traffic_medium, origin_group)
);

create index recommendation_policy_evaluations_run_created_idx
  on public.recommendation_policy_evaluations (run_id, created_at desc);

alter table public.recommendation_policy_evaluations enable row level security;
revoke all on table public.recommendation_policy_evaluations from public, anon, authenticated;
create policy recommendation_policy_evaluations_deny_direct
  on public.recommendation_policy_evaluations as restrictive for all to anon, authenticated
  using (false) with check (false);
create trigger recommendation_policy_evaluations_append_only
before update or delete on public.recommendation_policy_evaluations
for each row execute function public.telemetry_block_mutation();

create or replace function private.traffic_origin_group(p_source text, p_medium text)
returns text language sql immutable set search_path = pg_catalog as $$
  select case
    when lower(coalesce(p_medium, '')) ~ '(^|[_-])(social|social_paid|organic_social|paid_social)([_-]|$)'
      or lower(coalesce(p_source, '')) ~ '(^|[_-])(facebook|fb|instagram|meta|social|tiktok|youtube|linkedin|twitter|whatsapp)([_-]|$)'
      or lower(coalesce(p_source, '')) in ('x','x.com') then 'social'
    when lower(coalesce(p_source, '')) in ('google','bing','yahoo','duckduckgo','organic')
      or lower(coalesce(p_medium, '')) in ('cpc','ppc','paid_search','organic_search') then 'search'
    when lower(coalesce(p_source, '')) in ('direct','') then 'direct'
    when lower(coalesce(p_source, '')) = 'referral' then 'referral'
    when lower(coalesce(p_medium, '')) ~ 'email' then 'email'
    else 'unknown'
  end;
$$;
revoke all on function private.traffic_origin_group(text, text) from public, anon, authenticated;

create or replace function private.session_traffic_context(
  p_session_id uuid, p_visitor_id uuid,
  p_fallback_source text default 'direct', p_fallback_medium text default ''
)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare v_source text; v_medium text;
begin
  select coalesce(nullif(e.source, ''), 'direct'), coalesce(e.payload #>> '{campaign,utm_medium}', '')
  into v_source, v_medium
  from public.telemetry_events e
  where e.session_id = p_session_id and e.visitor_id = p_visitor_id
  order by e.occurred_at, e.created_at, e.id limit 1;
  v_source := coalesce(nullif(v_source, ''), nullif(p_fallback_source, ''), 'direct');
  v_medium := coalesce(nullif(v_medium, ''), p_fallback_medium, '');
  return jsonb_build_object('source', left(v_source, 200), 'medium', left(v_medium, 200),
    'originGroup', private.traffic_origin_group(v_source, v_medium));
end;
$$;
revoke all on function private.session_traffic_context(uuid, uuid, text, text) from public, anon, authenticated;

create or replace function public.atlas_check_campaign_traffic(
  p_secret text, p_campaign_id text, p_session_id uuid, p_visitor_id uuid,
  p_source text default 'direct', p_medium text default ''
)
returns jsonb language plpgsql security definer set search_path = public, private, pg_temp as $$
declare
  v_campaign_uuid uuid; v_context jsonb; v_origin_group text;
  v_has_allow boolean := false; v_allow_match boolean := false; v_block_match boolean := false;
  v_rules jsonb := '[]'::jsonb; v_rule record;
begin
  if not public.telemetry_secret_valid(p_secret) then
    raise exception 'invalid traffic policy secret' using errcode = '42501';
  end if;
  select c.id into v_campaign_uuid from public.atlas_campaigns c
  where c.external_id = p_campaign_id
  order by c.network = 'actionpay' desc, c.updated_at desc limit 1;
  if v_campaign_uuid is null then
    return jsonb_build_object('allowed', false, 'code', 'campaign_not_found',
      'reason', 'Campanha nao localizada no Atlas.');
  end if;
  v_context := private.session_traffic_context(p_session_id, p_visitor_id, p_source, p_medium);
  v_origin_group := v_context->>'originGroup';
  for v_rule in select r.* from public.atlas_campaign_traffic_rules r
    where r.campaign_id = v_campaign_uuid and r.status = 'active'
      and (r.effective_from is null or r.effective_from <= now())
      and (r.effective_until is null or r.effective_until > now())
    order by r.priority, r.rule_key
  loop
    if v_rule.effect = 'allow' then v_has_allow := true; end if;
    if v_rule.origin_group in ('any', v_origin_group) then
      if v_rule.effect = 'allow' then v_allow_match := true; end if;
      if v_rule.effect = 'block' then v_block_match := true; end if;
      v_rules := v_rules || jsonb_build_array(jsonb_build_object(
        'ruleId', v_rule.id, 'key', v_rule.rule_key, 'effect', v_rule.effect,
        'originGroup', v_rule.origin_group, 'reason', v_rule.reason,
        'evidenceReference', v_rule.evidence_reference, 'evidenceCheckedAt', v_rule.evidence_checked_at));
    end if;
  end loop;
  return jsonb_build_object(
    'allowed', not v_block_match and (not v_has_allow or v_allow_match),
    'code', case when v_block_match then 'traffic_origin_blocked'
      when v_has_allow and not v_allow_match then 'traffic_origin_not_allowed'
      else 'traffic_origin_allowed' end,
    'reason', case when v_block_match then 'A origem desta sessao e proibida para a campanha.'
      when v_has_allow and not v_allow_match then 'A origem desta sessao nao esta entre as fontes permitidas.'
      else 'A origem desta sessao e compativel com as regras cadastradas.' end,
    'traffic', v_context, 'matchedRules', v_rules);
end;
$$;
revoke all on function public.atlas_check_campaign_traffic(text, text, uuid, uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.atlas_check_campaign_traffic(text, text, uuid, uuid, text, text)
  to anon, service_role;

create or replace function public.recommendation_apply_traffic_policy(p_secret text, p_run_id uuid)
returns jsonb language plpgsql security definer set search_path = public, private, pg_temp as $$
declare
  v_policy_version constant text := 'traffic-1.0.0';
  v_run public.recommendation_runs%rowtype; v_context jsonb;
  v_source text; v_medium text; v_origin_group text; v_existing jsonb; v_result jsonb;
  v_recommendations jsonb := '[]'::jsonb; v_exclusions jsonb; v_item jsonb; v_rule record;
  v_rules jsonb; v_reasons jsonb; v_applied_rule_ids uuid[] := array[]::uuid[];
  v_blocked boolean; v_has_allow boolean; v_allow_match boolean; v_rank integer := 0;
begin
  if not public.telemetry_secret_valid(p_secret) then
    raise exception 'invalid recommendation traffic policy secret' using errcode = '42501';
  end if;
  select * into v_run from public.recommendation_runs where id = p_run_id;
  if v_run.id is null then raise exception 'recommendation run not found'; end if;
  v_context := private.session_traffic_context(v_run.session_id, v_run.visitor_id);
  v_source := v_context->>'source'; v_medium := v_context->>'medium';
  v_origin_group := v_context->>'originGroup';
  select e.result_snapshot into v_existing from public.recommendation_policy_evaluations e
  where e.run_id = p_run_id and e.policy_version = v_policy_version
    and e.traffic_source = v_source and e.traffic_medium = v_medium and e.origin_group = v_origin_group;
  if v_existing is not null then return v_existing; end if;
  v_exclusions := coalesce(v_run.result_snapshot->'exclusions', '[]'::jsonb);
  for v_item in select value from jsonb_array_elements(coalesce(v_run.result_snapshot->'recommendations', '[]'::jsonb))
  loop
    v_rules := '[]'::jsonb; v_reasons := '[]'::jsonb; v_blocked := false;
    v_has_allow := false; v_allow_match := false;
    for v_rule in select r.* from public.atlas_campaigns c
      join public.atlas_campaign_traffic_rules r on r.campaign_id = c.id
      where c.external_id = v_item->>'campaignId' and r.status = 'active'
        and (r.effective_from is null or r.effective_from <= now())
        and (r.effective_until is null or r.effective_until > now())
      order by r.priority, r.rule_key
    loop
      if v_rule.effect = 'allow' then v_has_allow := true; end if;
      if v_rule.origin_group in ('any', v_origin_group) then
        if v_rule.effect = 'block' then v_blocked := true; end if;
        if v_rule.effect = 'allow' then v_allow_match := true; end if;
        v_applied_rule_ids := array_append(v_applied_rule_ids, v_rule.id);
        v_rules := v_rules || jsonb_build_array(jsonb_build_object(
          'ruleId', v_rule.id, 'key', v_rule.rule_key, 'attribute', 'traffic_origin_group',
          'operator', 'eq', 'actualValue', v_origin_group, 'expectedValue', v_rule.origin_group,
          'effect', case when v_rule.effect = 'block' then 'exclude' else 'require' end,
          'scoreDelta', null, 'matched', true, 'explanation', v_rule.reason, 'priority', v_rule.priority));
        v_reasons := v_reasons || jsonb_build_array(jsonb_build_object(
          'code', v_rule.rule_key, 'detail', v_rule.reason, 'ruleId', v_rule.id));
      end if;
    end loop;
    if v_blocked or (v_has_allow and not v_allow_match) then
      if v_has_allow and not v_allow_match and not v_blocked then
        v_reasons := v_reasons || jsonb_build_array(jsonb_build_object(
          'code', 'traffic-origin-not-allowed',
          'detail', 'A origem desta sessao nao esta entre as fontes permitidas para a campanha.'));
      end if;
      v_item := v_item || jsonb_build_object(
        'eligible', false, 'rank', null,
        'exclusionReasons', coalesce(v_item->'exclusionReasons', '[]'::jsonb) || v_reasons,
        'appliedRules', coalesce(v_item->'appliedRules', '[]'::jsonb) || v_rules);
      v_exclusions := v_exclusions || jsonb_build_array(v_item);
    else
      v_rank := v_rank + 1;
      v_item := jsonb_set(v_item, '{rank}', to_jsonb(v_rank), true);
      v_recommendations := v_recommendations || jsonb_build_array(v_item);
    end if;
  end loop;
  v_result := v_run.result_snapshot || jsonb_build_object(
    'engineVersion', (v_run.result_snapshot->>'engineVersion') || '+' || v_policy_version,
    'trafficPolicyVersion', v_policy_version,
    'dataUsed', coalesce(v_run.result_snapshot->'dataUsed', '{}'::jsonb) || jsonb_build_object('traffic', v_context),
    'recommendations', v_recommendations, 'exclusions', v_exclusions);
  insert into public.recommendation_policy_evaluations(
    run_id, policy_version, traffic_source, traffic_medium, origin_group, result_snapshot, applied_rule_ids)
  values (p_run_id, v_policy_version, v_source, v_medium, v_origin_group, v_result,
    (select coalesce(array_agg(distinct x), array[]::uuid[]) from unnest(v_applied_rule_ids) x))
  on conflict (run_id, policy_version, traffic_source, traffic_medium, origin_group) do nothing;
  select e.result_snapshot into v_result from public.recommendation_policy_evaluations e
  where e.run_id = p_run_id and e.policy_version = v_policy_version
    and e.traffic_source = v_source and e.traffic_medium = v_medium and e.origin_group = v_origin_group;
  return v_result;
end;
$$;
revoke all on function public.recommendation_apply_traffic_policy(text, uuid) from public, anon, authenticated;
grant execute on function public.recommendation_apply_traffic_policy(text, uuid) to anon, service_role;

insert into public.atlas_campaign_traffic_rules(
  campaign_id, rule_key, origin_group, effect, reason, evidence_reference,
  evidence_checked_at, priority, status, effective_from)
select c.id, 'block-social-traffic', 'social', 'block',
  'Bom Pra Credito nao permite trafego originado de Facebook, Instagram ou outras redes sociais.',
  'Auditoria Actionpay de 09/08/2026 fornecida pelo Conselho Estrategico na Ordem de Correcao Actionpay/Zafi.',
  timestamptz '2026-08-09 00:00:00-03', 10, 'active', now()
from public.atlas_campaigns c where c.network = 'actionpay' and c.external_id = '185636'
on conflict (campaign_id, rule_key) do update set
  origin_group = excluded.origin_group, effect = excluded.effect, reason = excluded.reason,
  evidence_reference = excluded.evidence_reference, evidence_checked_at = excluded.evidence_checked_at,
  priority = excluded.priority, status = excluded.status, effective_from = excluded.effective_from,
  effective_until = null, updated_at = now();

comment on table public.atlas_campaign_traffic_rules is
  'Regras parametrizadas de origem permitida ou proibida por campanha, com evidencia e vigencia.';
comment on table public.recommendation_policy_evaluations is
  'Camada append-only que preserva o resultado final apos aplicar as politicas de origem as recomendacoes.';
comment on function public.atlas_check_campaign_traffic(text, text, uuid, uuid, text, text) is
  'Barreira de defesa da rota /go baseada na origem persistida da sessao e nas regras do Atlas.';
comment on function public.recommendation_apply_traffic_policy(text, uuid) is
  'Aplica politicas de origem as recomendacoes, registra motivos de exclusao e preserva o snapshot final.';
