-- OE-014 — Primeira Campanha Oficial + Inteligência de Eventos
-- Fonte oficial: banco da Zafi. Todos os horários são exibidos em America/Sao_Paulo.

create or replace function public.telemetry_event_intelligence_snapshot(
  p_secret text,
  p_from timestamptz default now() - interval '30 days',
  p_to timestamptz default now(),
  p_channel text default null,
  p_campaign text default null,
  p_source text default null,
  p_event_type text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_timezone constant text := 'America/Sao_Paulo';
  v_from timestamptz := coalesce(p_from, now() - interval '30 days');
  v_to timestamptz := coalesce(p_to, now());
  v_duration interval;
  v_result jsonb;
begin
  if not public.telemetry_secret_valid(p_secret) then
    raise exception 'invalid telemetry secret' using errcode = '42501';
  end if;
  if v_from >= v_to or v_to - v_from > interval '366 days' then
    raise exception 'invalid intelligence period';
  end if;
  v_duration := v_to - v_from;

  with normalized as (
    select
      e.*,
      timezone(v_timezone, e.occurred_at) local_at,
      case
        when nullif(btrim(e.source), '') is null then 'origem_desconhecida'
        when lower(e.source) = 'direct' then 'acesso_direto'
        when lower(e.source) in ('unknown', 'origem_desconhecida') then 'origem_desconhecida'
        when lower(e.source) in ('no_referrer', 'trafego_sem_referencia') then 'trafego_sem_referencia'
        else lower(e.source)
      end origin,
      coalesce(nullif(e.payload #>> '{campaign,utm_campaign}', ''), 'sem_campanha') campaign,
      coalesce(
        nullif(e.payload->>'channel', ''),
        nullif(e.payload #>> '{campaign,utm_medium}', ''),
        case
          when lower(e.source) in ('instagram', 'facebook', 'tiktok', 'youtube', 'social') then 'organic_social'
          when lower(e.source) = 'organic' then 'organic_search'
          when lower(e.source) = 'referral' then 'referral'
          when lower(e.source) = 'direct' then 'direct'
          else 'unknown'
        end
      ) channel,
      coalesce(nullif(e.device->>'category', ''), 'desconhecido') device_category
    from public.telemetry_events e
    where e.source_page not like '/admin%'
      and e.occurred_at >= v_from
      and e.occurred_at < v_to
  ), filtered as (
    select *
    from normalized
    where (p_channel is null or channel = p_channel)
      and (p_campaign is null or campaign = p_campaign)
      and (p_source is null or origin = p_source)
      and (p_event_type is null or event_type = p_event_type)
  ), prior as (
    select
      count(*) filter (where event_type = 'page_view') events,
      count(distinct visitor_id) filter (where event_type = 'page_view') visitors,
      count(*) filter (where event_type = 'analysis_completed') completions
    from public.telemetry_events
    where source_page not like '/admin%'
      and occurred_at >= v_from - v_duration
      and occurred_at < v_from
  ), current_summary as (
    select
      count(*) filter (where event_type = 'page_view') events,
      count(distinct visitor_id) filter (where event_type = 'page_view') visitors,
      count(*) filter (where event_type = 'analysis_completed') completions
    from filtered
  ), visits_weekday as (
    select extract(isodow from local_at)::integer weekday_number,
      case extract(isodow from local_at)::integer
        when 1 then 'segunda-feira' when 2 then 'terça-feira' when 3 then 'quarta-feira'
        when 4 then 'quinta-feira' when 5 then 'sexta-feira' when 6 then 'sábado'
        else 'domingo' end weekday,
      count(*) value
    from filtered where event_type = 'page_view'
    group by 1, 2 order by 1
  ), visits_hour as (
    select extract(hour from local_at)::integer hour, count(*) value
    from filtered where event_type = 'page_view'
    group by 1 order by 1
  ), origin_summary as (
    select origin, count(distinct visitor_id) visitors, count(distinct session_id) sessions,
      count(*) filter (where event_type = 'analysis_completed') completions
    from filtered group by origin order by visitors desc, origin
  ), campaign_summary as (
    select campaign, channel, count(distinct visitor_id) visitors, count(distinct session_id) sessions,
      count(*) filter (where event_type = 'analysis_started') analyses_started,
      count(*) filter (where event_type = 'analysis_completed') analyses_completed,
      count(*) filter (where event_type = 'partner_clicked') partner_clicks
    from filtered group by campaign, channel order by visitors desc, campaign, channel
  ), conversions as (
    select c.*, timezone(v_timezone, coalesce(c.converted_at, c.first_received_at)) local_at,
      coalesce(n.origin, 'origem_desconhecida') origin,
      coalesce(n.campaign, 'sem_campanha') campaign,
      coalesce(n.channel, 'unknown') channel
    from public.affiliate_conversions c
    left join public.affiliate_clicks click on click.id = c.original_click_id
    left join normalized n on n.id = click.telemetry_event_id
    where coalesce(c.converted_at, c.first_received_at) >= v_from
      and coalesce(c.converted_at, c.first_received_at) < v_to
      and (p_channel is null or coalesce(n.channel, 'unknown') = p_channel)
      and (p_campaign is null or coalesce(n.campaign, 'sem_campanha') = p_campaign)
      and (p_source is null or coalesce(n.origin, 'origem_desconhecida') = p_source)
  ), conversion_time as (
    select
      to_char(local_at, 'YYYY-MM-DD') local_date,
      extract(hour from local_at)::integer hour,
      origin, campaign, channel, coalesce(currency, 'BRL') currency,
      count(*) conversions,
      coalesce(sum(commission) filter (where status in ('pending', 'approved', 'paid')), 0) revenue_created,
      coalesce(sum(commission) filter (where status in ('approved', 'paid')), 0) revenue_approved,
      coalesce(sum(commission) filter (where status = 'paid'), 0) revenue_paid
    from conversions
    group by 1, 2, origin, campaign, channel, coalesce(currency, 'BRL')
    order by 1, 2
  ), recent as (
    select
      f.id, f.event_type, f.occurred_at, f.local_at, f.origin, f.campaign, f.channel,
      f.device_category, f.session_id, f.visitor_id, f.source_page,
      c.id conversion_id, c.transaction_id, c.status conversion_status,
      c.commission, c.currency
    from filtered f
    left join public.affiliate_clicks click on click.telemetry_event_id = f.id
    left join public.affiliate_conversions c on c.original_click_id = click.id
    order by f.occurred_at desc
    limit 100
  )
  select jsonb_build_object(
    'generated_at', now(),
    'timezone', v_timezone,
    'period', jsonb_build_object('from', v_from, 'to', v_to),
    'filters', jsonb_build_object(
      'channel', p_channel, 'campaign', p_campaign, 'source', p_source, 'event_type', p_event_type
    ),
    'visits_by_weekday', coalesce((select jsonb_agg(to_jsonb(visits_weekday) order by weekday_number) from visits_weekday), '[]'::jsonb),
    'visits_by_hour', coalesce((select jsonb_agg(to_jsonb(visits_hour) order by hour) from visits_hour), '[]'::jsonb),
    'conversions_revenue_by_time', coalesce((select jsonb_agg(to_jsonb(conversion_time) order by local_date, hour) from conversion_time), '[]'::jsonb),
    'origins', coalesce((select jsonb_agg(to_jsonb(origin_summary) order by visitors desc) from origin_summary), '[]'::jsonb),
    'campaigns', coalesce((select jsonb_agg(to_jsonb(campaign_summary) order by visitors desc) from campaign_summary), '[]'::jsonb),
    'comparison', (
      select jsonb_build_object(
        'current', jsonb_build_object('page_views', c.events, 'visitors', c.visitors, 'analysis_completed', c.completions),
        'previous', jsonb_build_object('page_views', p.events, 'visitors', p.visitors, 'analysis_completed', p.completions)
      ) from current_summary c cross join prior p
    ),
    'recent_events', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', id,
        'event_type', event_type,
        'date', to_char(local_at, 'YYYY-MM-DD'),
        'time', to_char(local_at, 'HH24:MI:SS'),
        'timezone', v_timezone,
        'weekday', case extract(isodow from local_at)::integer
          when 1 then 'segunda-feira' when 2 then 'terça-feira' when 3 then 'quarta-feira'
          when 4 then 'quinta-feira' when 5 then 'sexta-feira' when 6 then 'sábado'
          else 'domingo' end,
        'origin', origin,
        'campaign', campaign,
        'channel', channel,
        'device', device_category,
        'session_id', session_id,
        'visitor_id', visitor_id,
        'source_page', source_page,
        'conversion', case when conversion_id is null then null else jsonb_build_object(
          'id', conversion_id, 'transaction_id', transaction_id, 'status', conversion_status,
          'commission', commission, 'currency', currency
        ) end
      ) order by occurred_at desc) from recent
    ), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function public.telemetry_event_intelligence_snapshot(
  text, timestamptz, timestamptz, text, text, text, text
) from public, authenticated;
grant execute on function public.telemetry_event_intelligence_snapshot(
  text, timestamptz, timestamptz, text, text, text, text
) to anon;

comment on function public.telemetry_event_intelligence_snapshot(
  text, timestamptz, timestamptz, text, text, text, text
) is 'OE-014: inteligência temporal, origem, campanha, canal, dispositivo, sessão e conversão relacionada; fonte oficial banco Zafi.';

do $$
declare
  v_order_id uuid;
  v_revision_id uuid;
  v_version integer;
  v_created boolean := false;
begin
  insert into public.executive_orders (oe_code)
  values ('OE-014')
  on conflict (oe_code) do nothing
  returning id into v_order_id;

  if v_order_id is not null then
    v_created := true;
  else
    select id into v_order_id from public.executive_orders where oe_code = 'OE-014';
  end if;

  if exists (
    select 1 from public.executive_order_revisions
    where order_id = v_order_id
      and title = 'Primeira Campanha Oficial da Zafi'
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
    'Primeira Campanha Oficial da Zafi',
    'Produzir, aprovar e publicar a primeira campanha oficial da Zafi sobre “Por que sobra mês no fim do salário?”, com vídeo, carrossel, arte estática, Stories, analytics auditável e publicação condicionada à aprovação explícita do CEO e autenticação das contas oficiais.',
    'critical', 'in_progress',
    'Conselho Estratégico', 'conselho@meuzafi.com.br', 'council',
    'OE-014 v1.0 aprovada com adendo obrigatório de analytics e inteligência de eventos'
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
      'oe_code', 'OE-014',
      'version', v_version,
      'priority', 'critical',
      'status', 'in_progress',
      'campaign_id', 'oe014-primeira-campanha-v1',
      'benchmark_001', 'https://youtube.com/shorts/O_GuNBjtyp4',
      'deliverables', jsonb_build_array('short_video', 'carousel', 'static_image', 'stories'),
      'official_timezone', 'America/Sao_Paulo',
      'automatic_publication_authorized', false,
      'ceo_approval_required', true
    )
  );
end;
$$;
