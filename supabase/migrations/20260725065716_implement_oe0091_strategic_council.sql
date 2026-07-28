create extension if not exists pgcrypto;

create table if not exists public.executive_orders (
  id uuid primary key default gen_random_uuid(),
  oe_code text not null unique check (oe_code ~ '^OE-[0-9]{3,}(\.[0-9]+)?$'),
  created_at timestamptz not null default now()
);

create table if not exists public.executive_order_revisions (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.executive_orders(id) on delete restrict,
  version integer not null check (version > 0),
  title text not null check (length(title) between 3 and 180),
  description text not null check (length(description) between 10 and 20000),
  priority text not null check (priority in ('maximum', 'high', 'medium', 'low')),
  status text not null check (status in (
    'draft', 'open', 'in_progress', 'awaiting_council', 'awaiting_ceo',
    'adjustments_requested', 'reprioritized', 'blocked', 'approved', 'completed', 'rejected'
  )),
  author_name text not null check (length(author_name) between 2 and 120),
  author_email text not null check (length(author_email) between 3 and 320),
  author_role text not null check (author_role in ('ceo', 'council', 'engineering')),
  change_reason text not null default 'Criação da Ordem Executiva',
  created_at timestamptz not null default now(),
  unique (order_id, version)
);

create table if not exists public.executive_engineering_reports (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.executive_orders(id) on delete restrict,
  version integer not null check (version > 0),
  implementation_status text not null check (implementation_status in ('not_started', 'in_progress', 'blocked', 'completed')),
  completion_percentage integer not null check (completion_percentage between 0 and 100),
  summary text not null check (length(summary) between 10 and 20000),
  evidences jsonb not null default '[]'::jsonb check (jsonb_typeof(evidences) = 'array'),
  changed_files jsonb not null default '[]'::jsonb check (jsonb_typeof(changed_files) = 'array'),
  commits jsonb not null default '[]'::jsonb check (jsonb_typeof(commits) = 'array'),
  tests jsonb not null default '[]'::jsonb check (jsonb_typeof(tests) = 'array'),
  risks jsonb not null default '[]'::jsonb check (jsonb_typeof(risks) = 'array'),
  pending_items jsonb not null default '[]'::jsonb check (jsonb_typeof(pending_items) = 'array'),
  limitations jsonb not null default '[]'::jsonb check (jsonb_typeof(limitations) = 'array'),
  acceptance_criteria jsonb not null default '[]'::jsonb check (jsonb_typeof(acceptance_criteria) = 'array'),
  author_name text not null,
  author_email text not null,
  created_at timestamptz not null default now(),
  unique (order_id, version)
);

create table if not exists public.executive_council_opinions (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.executive_orders(id) on delete restrict,
  version integer not null check (version > 0),
  verdict text not null check (verdict in ('approved', 'approved_with_reservations', 'rejected')),
  justification text not null check (length(justification) between 10 and 20000),
  recommendations jsonb not null default '[]'::jsonb check (jsonb_typeof(recommendations) = 'array'),
  next_actions jsonb not null default '[]'::jsonb check (jsonb_typeof(next_actions) = 'array'),
  author_name text not null,
  author_email text not null,
  created_at timestamptz not null default now(),
  unique (order_id, version)
);

create table if not exists public.executive_ceo_decisions (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.executive_orders(id) on delete restrict,
  version integer not null check (version > 0),
  decision text not null check (decision in ('approve', 'request_adjustments', 'reprioritize')),
  justification text not null check (length(justification) between 5 and 20000),
  decided_by_name text not null,
  decided_by_email text not null,
  created_at timestamptz not null default now(),
  unique (order_id, version)
);

create table if not exists public.executive_order_attachments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.executive_orders(id) on delete restrict,
  entity_type text not null check (entity_type in ('order', 'engineering_report', 'council_opinion', 'ceo_decision')),
  entity_id uuid,
  attachment_type text not null check (attachment_type in ('pdf', 'image', 'video', 'log', 'document', 'link')),
  file_name text not null check (length(file_name) between 1 and 240),
  mime_type text not null check (length(mime_type) between 3 and 160),
  size_bytes bigint not null default 0 check (size_bytes >= 0),
  storage_path text,
  external_url text,
  inline_content text,
  checksum_sha256 text,
  author_name text not null,
  author_email text not null,
  author_role text not null check (author_role in ('ceo', 'council', 'engineering')),
  created_at timestamptz not null default now(),
  check (
    (storage_path is not null and external_url is null and inline_content is null)
    or (storage_path is null and external_url is not null and inline_content is null)
    or (storage_path is null and external_url is null and inline_content is not null)
  )
);

create table if not exists public.executive_order_audit_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.executive_orders(id) on delete restrict,
  event_type text not null check (event_type in (
    'order_created', 'order_revised', 'engineering_report_submitted',
    'council_opinion_submitted', 'ceo_decision_recorded', 'attachment_registered'
  )),
  actor_name text not null,
  actor_email text not null,
  actor_role text not null check (actor_role in ('ceo', 'council', 'engineering')),
  entity_type text not null,
  entity_id uuid not null,
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  created_at timestamptz not null default now()
);

create index if not exists executive_order_revisions_latest_idx
  on public.executive_order_revisions (order_id, version desc);
create index if not exists executive_engineering_reports_latest_idx
  on public.executive_engineering_reports (order_id, version desc);
create index if not exists executive_council_opinions_latest_idx
  on public.executive_council_opinions (order_id, version desc);
create index if not exists executive_ceo_decisions_latest_idx
  on public.executive_ceo_decisions (order_id, version desc);
create index if not exists executive_order_audit_timeline_idx
  on public.executive_order_audit_events (order_id, created_at desc);
create index if not exists executive_order_attachments_order_idx
  on public.executive_order_attachments (order_id, created_at desc);

alter table public.executive_orders enable row level security;
alter table public.executive_order_revisions enable row level security;
alter table public.executive_engineering_reports enable row level security;
alter table public.executive_council_opinions enable row level security;
alter table public.executive_ceo_decisions enable row level security;
alter table public.executive_order_attachments enable row level security;
alter table public.executive_order_audit_events enable row level security;

revoke all on table
  public.executive_orders,
  public.executive_order_revisions,
  public.executive_engineering_reports,
  public.executive_council_opinions,
  public.executive_ceo_decisions,
  public.executive_order_attachments,
  public.executive_order_audit_events
from anon, authenticated;

drop policy if exists executive_orders_deny_direct on public.executive_orders;
drop policy if exists executive_order_revisions_deny_direct on public.executive_order_revisions;
drop policy if exists executive_engineering_reports_deny_direct on public.executive_engineering_reports;
drop policy if exists executive_council_opinions_deny_direct on public.executive_council_opinions;
drop policy if exists executive_ceo_decisions_deny_direct on public.executive_ceo_decisions;
drop policy if exists executive_order_attachments_deny_direct on public.executive_order_attachments;
drop policy if exists executive_order_audit_events_deny_direct on public.executive_order_audit_events;

create policy executive_orders_deny_direct on public.executive_orders
  as restrictive for all to anon, authenticated using (false) with check (false);
create policy executive_order_revisions_deny_direct on public.executive_order_revisions
  as restrictive for all to anon, authenticated using (false) with check (false);
create policy executive_engineering_reports_deny_direct on public.executive_engineering_reports
  as restrictive for all to anon, authenticated using (false) with check (false);
create policy executive_council_opinions_deny_direct on public.executive_council_opinions
  as restrictive for all to anon, authenticated using (false) with check (false);
create policy executive_ceo_decisions_deny_direct on public.executive_ceo_decisions
  as restrictive for all to anon, authenticated using (false) with check (false);
create policy executive_order_attachments_deny_direct on public.executive_order_attachments
  as restrictive for all to anon, authenticated using (false) with check (false);
create policy executive_order_audit_events_deny_direct on public.executive_order_audit_events
  as restrictive for all to anon, authenticated using (false) with check (false);

create or replace function public.executive_governance_block_mutation()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  raise exception 'strategic council records are append-only';
end;
$$;

revoke all on function public.executive_governance_block_mutation() from public, anon, authenticated;

drop trigger if exists executive_orders_append_only on public.executive_orders;
drop trigger if exists executive_order_revisions_append_only on public.executive_order_revisions;
drop trigger if exists executive_engineering_reports_append_only on public.executive_engineering_reports;
drop trigger if exists executive_council_opinions_append_only on public.executive_council_opinions;
drop trigger if exists executive_ceo_decisions_append_only on public.executive_ceo_decisions;
drop trigger if exists executive_order_attachments_append_only on public.executive_order_attachments;
drop trigger if exists executive_order_audit_events_append_only on public.executive_order_audit_events;

create trigger executive_orders_append_only before update or delete on public.executive_orders
for each row execute function public.executive_governance_block_mutation();
create trigger executive_order_revisions_append_only before update or delete on public.executive_order_revisions
for each row execute function public.executive_governance_block_mutation();
create trigger executive_engineering_reports_append_only before update or delete on public.executive_engineering_reports
for each row execute function public.executive_governance_block_mutation();
create trigger executive_council_opinions_append_only before update or delete on public.executive_council_opinions
for each row execute function public.executive_governance_block_mutation();
create trigger executive_ceo_decisions_append_only before update or delete on public.executive_ceo_decisions
for each row execute function public.executive_governance_block_mutation();
create trigger executive_order_attachments_append_only before update or delete on public.executive_order_attachments
for each row execute function public.executive_governance_block_mutation();
create trigger executive_order_audit_events_append_only before update or delete on public.executive_order_audit_events
for each row execute function public.executive_governance_block_mutation();

create or replace function private.executive_assert_access(p_secret text, p_actor_role text, p_allowed_roles text[])
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.telemetry_secret_valid(p_secret) then
    raise exception 'invalid strategic council secret' using errcode = '42501';
  end if;
  if p_actor_role is null or not (p_actor_role = any(p_allowed_roles)) then
    raise exception 'role not allowed for this strategic council action' using errcode = '42501';
  end if;
end;
$$;

revoke all on function private.executive_assert_access(text, text, text[]) from public, anon, authenticated;

create or replace function private.executive_append_revision(
  p_order_id uuid,
  p_status text,
  p_priority text,
  p_actor_name text,
  p_actor_email text,
  p_actor_role text,
  p_reason text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_latest public.executive_order_revisions%rowtype;
  v_id uuid;
begin
  select * into v_latest
  from public.executive_order_revisions
  where order_id = p_order_id
  order by version desc
  limit 1;

  if v_latest.id is null then raise exception 'executive order revision not found'; end if;

  insert into public.executive_order_revisions (
    order_id, version, title, description, priority, status,
    author_name, author_email, author_role, change_reason
  ) values (
    p_order_id, v_latest.version + 1, v_latest.title, v_latest.description,
    coalesce(p_priority, v_latest.priority), coalesce(p_status, v_latest.status),
    left(p_actor_name, 120), left(lower(p_actor_email), 320), p_actor_role, left(p_reason, 1000)
  ) returning id into v_id;
  return v_id;
end;
$$;

revoke all on function private.executive_append_revision(uuid,text,text,text,text,text,text)
from public, anon, authenticated;

create or replace function public.executive_create_order(
  p_secret text,
  p_oe_code text,
  p_title text,
  p_description text,
  p_priority text,
  p_actor_name text,
  p_actor_email text,
  p_actor_role text
)
returns uuid
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_order_id uuid;
  v_revision_id uuid;
begin
  perform private.executive_assert_access(p_secret, p_actor_role, array['ceo','council']);
  if p_oe_code !~ '^OE-[0-9]{3,}(\.[0-9]+)?$' then raise exception 'invalid OE identifier'; end if;

  insert into public.executive_orders (oe_code)
  values (upper(p_oe_code))
  returning id into v_order_id;

  insert into public.executive_order_revisions (
    order_id, version, title, description, priority, status,
    author_name, author_email, author_role, change_reason
  ) values (
    v_order_id, 1, left(trim(p_title), 180), left(trim(p_description), 20000),
    p_priority, 'open', left(p_actor_name, 120), left(lower(p_actor_email), 320),
    p_actor_role, 'Criação da Ordem Executiva'
  ) returning id into v_revision_id;

  insert into public.executive_order_audit_events (
    order_id, event_type, actor_name, actor_email, actor_role, entity_type, entity_id, payload
  ) values (
    v_order_id, 'order_created', p_actor_name, lower(p_actor_email), p_actor_role,
    'order_revision', v_revision_id,
    jsonb_build_object('oe_code', upper(p_oe_code), 'version', 1, 'priority', p_priority, 'status', 'open')
  );
  return v_order_id;
end;
$$;

create or replace function public.executive_submit_engineering_report(
  p_secret text,
  p_oe_code text,
  p_implementation_status text,
  p_completion_percentage integer,
  p_summary text,
  p_evidences jsonb,
  p_changed_files jsonb,
  p_commits jsonb,
  p_tests jsonb,
  p_risks jsonb,
  p_pending_items jsonb,
  p_limitations jsonb,
  p_acceptance_criteria jsonb,
  p_actor_name text,
  p_actor_email text,
  p_actor_role text
)
returns uuid
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_order_id uuid;
  v_version integer;
  v_report_id uuid;
  v_revision_id uuid;
  v_status text;
begin
  perform private.executive_assert_access(p_secret, p_actor_role, array['engineering']);
  select id into v_order_id from public.executive_orders where oe_code = upper(p_oe_code);
  if v_order_id is null then raise exception 'executive order not found'; end if;
  select coalesce(max(version), 0) + 1 into v_version
  from public.executive_engineering_reports where order_id = v_order_id;

  insert into public.executive_engineering_reports (
    order_id, version, implementation_status, completion_percentage, summary,
    evidences, changed_files, commits, tests, risks, pending_items, limitations,
    acceptance_criteria, author_name, author_email
  ) values (
    v_order_id, v_version, p_implementation_status, p_completion_percentage, left(trim(p_summary), 20000),
    coalesce(p_evidences, '[]'::jsonb), coalesce(p_changed_files, '[]'::jsonb),
    coalesce(p_commits, '[]'::jsonb), coalesce(p_tests, '[]'::jsonb),
    coalesce(p_risks, '[]'::jsonb), coalesce(p_pending_items, '[]'::jsonb),
    coalesce(p_limitations, '[]'::jsonb), coalesce(p_acceptance_criteria, '[]'::jsonb),
    left(p_actor_name, 120), left(lower(p_actor_email), 320)
  ) returning id into v_report_id;

  v_status := case p_implementation_status
    when 'completed' then 'awaiting_council'
    when 'blocked' then 'blocked'
    else 'in_progress'
  end;
  v_revision_id := private.executive_append_revision(
    v_order_id, v_status, null, p_actor_name, p_actor_email, p_actor_role,
    'Relatório de Engenharia v' || v_version
  );

  insert into public.executive_order_audit_events (
    order_id, event_type, actor_name, actor_email, actor_role, entity_type, entity_id, payload
  ) values (
    v_order_id, 'engineering_report_submitted', p_actor_name, lower(p_actor_email), p_actor_role,
    'engineering_report', v_report_id,
    jsonb_build_object(
      'version', v_version, 'implementation_status', p_implementation_status,
      'completion_percentage', p_completion_percentage, 'resulting_revision_id', v_revision_id
    )
  );
  return v_report_id;
end;
$$;

create or replace function public.executive_submit_council_opinion(
  p_secret text,
  p_oe_code text,
  p_verdict text,
  p_justification text,
  p_recommendations jsonb,
  p_next_actions jsonb,
  p_actor_name text,
  p_actor_email text,
  p_actor_role text
)
returns uuid
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_order_id uuid;
  v_version integer;
  v_opinion_id uuid;
  v_revision_id uuid;
  v_status text;
begin
  perform private.executive_assert_access(p_secret, p_actor_role, array['council']);
  select id into v_order_id from public.executive_orders where oe_code = upper(p_oe_code);
  if v_order_id is null then raise exception 'executive order not found'; end if;
  if not exists (
    select 1
    from public.executive_engineering_reports
    where order_id = v_order_id
      and implementation_status = 'completed'
  ) then
    raise exception 'a completed engineering report is required before council opinion';
  end if;
  select coalesce(max(version), 0) + 1 into v_version
  from public.executive_council_opinions where order_id = v_order_id;

  insert into public.executive_council_opinions (
    order_id, version, verdict, justification, recommendations, next_actions,
    author_name, author_email
  ) values (
    v_order_id, v_version, p_verdict, left(trim(p_justification), 20000),
    coalesce(p_recommendations, '[]'::jsonb), coalesce(p_next_actions, '[]'::jsonb),
    left(p_actor_name, 120), left(lower(p_actor_email), 320)
  ) returning id into v_opinion_id;

  v_status := case when p_verdict = 'rejected' then 'rejected' else 'awaiting_ceo' end;
  v_revision_id := private.executive_append_revision(
    v_order_id, v_status, null, p_actor_name, p_actor_email, p_actor_role,
    'Parecer do Conselho v' || v_version
  );

  insert into public.executive_order_audit_events (
    order_id, event_type, actor_name, actor_email, actor_role, entity_type, entity_id, payload
  ) values (
    v_order_id, 'council_opinion_submitted', p_actor_name, lower(p_actor_email), p_actor_role,
    'council_opinion', v_opinion_id,
    jsonb_build_object('version', v_version, 'verdict', p_verdict, 'resulting_revision_id', v_revision_id)
  );
  return v_opinion_id;
end;
$$;

create or replace function public.executive_record_ceo_decision(
  p_secret text,
  p_oe_code text,
  p_decision text,
  p_justification text,
  p_priority text,
  p_actor_name text,
  p_actor_email text,
  p_actor_role text
)
returns uuid
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_order_id uuid;
  v_version integer;
  v_decision_id uuid;
  v_revision_id uuid;
  v_status text;
begin
  perform private.executive_assert_access(p_secret, p_actor_role, array['ceo']);
  select id into v_order_id from public.executive_orders where oe_code = upper(p_oe_code);
  if v_order_id is null then raise exception 'executive order not found'; end if;
  if not exists (
    select 1
    from public.executive_council_opinions
    where order_id = v_order_id
  ) then
    raise exception 'a council opinion is required before CEO decision';
  end if;
  select coalesce(max(version), 0) + 1 into v_version
  from public.executive_ceo_decisions where order_id = v_order_id;

  insert into public.executive_ceo_decisions (
    order_id, version, decision, justification, decided_by_name, decided_by_email
  ) values (
    v_order_id, v_version, p_decision, left(trim(p_justification), 20000),
    left(p_actor_name, 120), left(lower(p_actor_email), 320)
  ) returning id into v_decision_id;

  v_status := case p_decision
    when 'approve' then 'approved'
    when 'request_adjustments' then 'adjustments_requested'
    when 'reprioritize' then 'reprioritized'
  end;
  v_revision_id := private.executive_append_revision(
    v_order_id, v_status,
    case when p_decision = 'reprioritize' then p_priority else null end,
    p_actor_name, p_actor_email, p_actor_role, 'Decisão do CEO v' || v_version
  );

  insert into public.executive_order_audit_events (
    order_id, event_type, actor_name, actor_email, actor_role, entity_type, entity_id, payload
  ) values (
    v_order_id, 'ceo_decision_recorded', p_actor_name, lower(p_actor_email), p_actor_role,
    'ceo_decision', v_decision_id,
    jsonb_build_object(
      'version', v_version, 'decision', p_decision, 'priority', p_priority,
      'resulting_revision_id', v_revision_id
    )
  );
  return v_decision_id;
end;
$$;

create or replace function public.executive_register_attachment(
  p_secret text,
  p_oe_code text,
  p_entity_type text,
  p_entity_id uuid,
  p_attachment_type text,
  p_file_name text,
  p_mime_type text,
  p_size_bytes bigint,
  p_storage_path text,
  p_external_url text,
  p_inline_content text,
  p_checksum_sha256 text,
  p_actor_name text,
  p_actor_email text,
  p_actor_role text
)
returns uuid
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_order_id uuid;
  v_attachment_id uuid;
begin
  perform private.executive_assert_access(p_secret, p_actor_role, array['ceo','council','engineering']);
  select id into v_order_id from public.executive_orders where oe_code = upper(p_oe_code);
  if v_order_id is null then raise exception 'executive order not found'; end if;

  insert into public.executive_order_attachments (
    order_id, entity_type, entity_id, attachment_type, file_name, mime_type,
    size_bytes, storage_path, external_url, inline_content, checksum_sha256,
    author_name, author_email, author_role
  ) values (
    v_order_id, p_entity_type, p_entity_id, p_attachment_type, left(p_file_name, 240),
    left(p_mime_type, 160), coalesce(p_size_bytes, 0), nullif(p_storage_path, ''),
    nullif(p_external_url, ''), nullif(p_inline_content, ''), nullif(p_checksum_sha256, ''),
    left(p_actor_name, 120), left(lower(p_actor_email), 320), p_actor_role
  ) returning id into v_attachment_id;

  insert into public.executive_order_audit_events (
    order_id, event_type, actor_name, actor_email, actor_role, entity_type, entity_id, payload
  ) values (
    v_order_id, 'attachment_registered', p_actor_name, lower(p_actor_email), p_actor_role,
    'attachment', v_attachment_id,
    jsonb_build_object('attachment_type', p_attachment_type, 'file_name', p_file_name, 'size_bytes', p_size_bytes)
  );
  return v_attachment_id;
end;
$$;

create or replace function public.executive_dashboard_snapshot(p_secret text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_result jsonb;
begin
  if not public.telemetry_secret_valid(p_secret) then
    raise exception 'invalid strategic council secret' using errcode = '42501';
  end if;

  with latest as (
    select distinct on (r.order_id)
      r.order_id, o.oe_code, o.created_at, r.version, r.title, r.description,
      r.priority, r.status, r.author_name, r.author_email, r.author_role, r.created_at as revised_at
    from public.executive_order_revisions r
    join public.executive_orders o on o.id = r.order_id
    order by r.order_id, r.version desc
  ), implementation_time as (
    select o.id,
      extract(epoch from (min(er.created_at) filter (where er.implementation_status = 'completed') - o.created_at)) / 86400 value
    from public.executive_orders o
    left join public.executive_engineering_reports er on er.order_id = o.id
    group by o.id
  ), approval_time as (
    select o.id,
      extract(epoch from (min(cd.created_at) - min(co.created_at))) / 86400 value
    from public.executive_orders o
    left join public.executive_council_opinions co on co.order_id = o.id
    left join public.executive_ceo_decisions cd on cd.order_id = o.id
    group by o.id
  ), summaries as (
    select l.*,
      coalesce((select completion_percentage from public.executive_engineering_reports er where er.order_id = l.order_id order by version desc limit 1), 0) completion_percentage,
      (select created_at from public.executive_engineering_reports er where er.order_id = l.order_id order by version desc limit 1) engineering_updated_at,
      (select verdict from public.executive_council_opinions co where co.order_id = l.order_id order by version desc limit 1) latest_verdict,
      (select decision from public.executive_ceo_decisions cd where cd.order_id = l.order_id order by version desc limit 1) latest_decision,
      (select decided_by_name from public.executive_ceo_decisions cd where cd.order_id = l.order_id order by version desc limit 1) approver_name,
      (select decided_by_email from public.executive_ceo_decisions cd where cd.order_id = l.order_id order by version desc limit 1) approver_email
    from latest l
  )
  select jsonb_build_object(
    'generated_at', now(),
    'metrics', jsonb_build_object(
      'open', (select count(*) from latest where status in ('draft','open','in_progress','awaiting_council','awaiting_ceo','adjustments_requested','reprioritized')),
      'completed', (select count(*) from latest where status in ('approved','completed')),
      'blocked', (select count(*) from latest where status in ('blocked','rejected')),
      'average_implementation_days', (select round(avg(value)::numeric, 1) from implementation_time where value is not null),
      'average_approval_days', (select round(avg(value)::numeric, 1) from approval_time where value is not null),
      'bottlenecks', coalesce((
        select jsonb_agg(jsonb_build_object('status', status, 'count', count) order by count desc)
        from (select status, count(*) count from latest where status not in ('approved','completed') group by status) b
      ), '[]'::jsonb)
    ),
    'orders', coalesce((select jsonb_agg(to_jsonb(summaries) order by
      case priority when 'maximum' then 1 when 'high' then 2 when 'medium' then 3 else 4 end,
      created_at desc
    ) from summaries), '[]'::jsonb)
  ) into v_result;
  return v_result;
end;
$$;

create or replace function public.executive_order_snapshot(p_secret text, p_oe_code text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order public.executive_orders%rowtype;
  v_result jsonb;
begin
  if not public.telemetry_secret_valid(p_secret) then
    raise exception 'invalid strategic council secret' using errcode = '42501';
  end if;
  select * into v_order from public.executive_orders where oe_code = upper(p_oe_code);
  if v_order.id is null then raise exception 'executive order not found'; end if;

  select jsonb_build_object(
    'generated_at', now(),
    'id', v_order.id,
    'oe_code', v_order.oe_code,
    'created_at', v_order.created_at,
    'current', (
      select to_jsonb(r) from public.executive_order_revisions r
      where r.order_id = v_order.id order by version desc limit 1
    ),
    'revisions', coalesce((
      select jsonb_agg(to_jsonb(r) order by version desc)
      from public.executive_order_revisions r where r.order_id = v_order.id
    ), '[]'::jsonb),
    'engineering_reports', coalesce((
      select jsonb_agg(to_jsonb(er) order by version desc)
      from public.executive_engineering_reports er where er.order_id = v_order.id
    ), '[]'::jsonb),
    'council_opinions', coalesce((
      select jsonb_agg(to_jsonb(co) order by version desc)
      from public.executive_council_opinions co where co.order_id = v_order.id
    ), '[]'::jsonb),
    'ceo_decisions', coalesce((
      select jsonb_agg(to_jsonb(cd) order by version desc)
      from public.executive_ceo_decisions cd where cd.order_id = v_order.id
    ), '[]'::jsonb),
    'attachments', coalesce((
      select jsonb_agg(to_jsonb(a) order by created_at desc)
      from public.executive_order_attachments a where a.order_id = v_order.id
    ), '[]'::jsonb),
    'history', coalesce((
      select jsonb_agg(to_jsonb(e) order by created_at desc)
      from public.executive_order_audit_events e where e.order_id = v_order.id
    ), '[]'::jsonb)
  ) into v_result;
  return v_result;
end;
$$;

create or replace function public.executive_attachment_lookup(p_secret text, p_attachment_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_result jsonb;
begin
  if not public.telemetry_secret_valid(p_secret) then
    raise exception 'invalid strategic council secret' using errcode = '42501';
  end if;
  select to_jsonb(a) || jsonb_build_object('oe_code', o.oe_code)
  into v_result
  from public.executive_order_attachments a
  join public.executive_orders o on o.id = a.order_id
  where a.id = p_attachment_id;
  if v_result is null then raise exception 'attachment not found'; end if;
  return v_result;
end;
$$;

revoke all on function public.executive_create_order(text,text,text,text,text,text,text,text) from public, authenticated;
revoke all on function public.executive_submit_engineering_report(text,text,text,integer,text,jsonb,jsonb,jsonb,jsonb,jsonb,jsonb,jsonb,jsonb,text,text,text) from public, authenticated;
revoke all on function public.executive_submit_council_opinion(text,text,text,text,jsonb,jsonb,text,text,text) from public, authenticated;
revoke all on function public.executive_record_ceo_decision(text,text,text,text,text,text,text,text) from public, authenticated;
revoke all on function public.executive_register_attachment(text,text,text,uuid,text,text,text,bigint,text,text,text,text,text,text,text) from public, authenticated;
revoke all on function public.executive_dashboard_snapshot(text) from public, authenticated;
revoke all on function public.executive_order_snapshot(text,text) from public, authenticated;
revoke all on function public.executive_attachment_lookup(text,uuid) from public, authenticated;

grant execute on function public.executive_create_order(text,text,text,text,text,text,text,text) to anon;
grant execute on function public.executive_submit_engineering_report(text,text,text,integer,text,jsonb,jsonb,jsonb,jsonb,jsonb,jsonb,jsonb,jsonb,text,text,text) to anon;
grant execute on function public.executive_submit_council_opinion(text,text,text,text,jsonb,jsonb,text,text,text) to anon;
grant execute on function public.executive_record_ceo_decision(text,text,text,text,text,text,text,text) to anon;
grant execute on function public.executive_register_attachment(text,text,text,uuid,text,text,text,bigint,text,text,text,text,text,text,text) to anon;
grant execute on function public.executive_dashboard_snapshot(text) to anon;
grant execute on function public.executive_order_snapshot(text,text) to anon;
grant execute on function public.executive_attachment_lookup(text,uuid) to anon;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'strategic-council',
  'strategic-council',
  false,
  26214400,
  array[
    'application/pdf', 'image/jpeg', 'image/png', 'image/webp',
    'video/mp4', 'video/webm', 'text/plain', 'application/json',
    'text/csv', 'application/zip', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do nothing;

do $$
declare
  v_order_id uuid;
  v_revision_id uuid;
begin
  insert into public.executive_orders (oe_code)
  values ('OE-009.1')
  on conflict (oe_code) do nothing
  returning id into v_order_id;

  if v_order_id is not null then
    insert into public.executive_order_revisions (
      order_id, version, title, description, priority, status,
      author_name, author_email, author_role, change_reason
    ) values (
      v_order_id,
      1,
      'Implantação do Painel do Conselho Estratégico',
      'Centralizar dentro da Zafi a comunicação auditável entre Conselho Estratégico, Engenharia e CEO, incluindo Ordens Executivas, relatórios, pareceres, decisões, anexos e histórico append-only.',
      'maximum',
      'in_progress',
      'Conselho Estratégico',
      'conselho@meuzafi.com.br',
      'council',
      'Ordem Executiva aprovada para implementação'
    ) returning id into v_revision_id;

    insert into public.executive_order_audit_events (
      order_id, event_type, actor_name, actor_email, actor_role, entity_type, entity_id, payload
    ) values (
      v_order_id, 'order_created', 'Conselho Estratégico', 'conselho@meuzafi.com.br',
      'council', 'order_revision', v_revision_id,
      jsonb_build_object('oe_code', 'OE-009.1', 'version', 1, 'priority', 'maximum', 'status', 'in_progress')
    );
  end if;
end;
$$;

comment on table public.executive_orders is 'Identidade imutável das Ordens Executivas da Zafi.';
comment on table public.executive_order_revisions is 'Versões append-only das OEs; estado atual é sempre a versão mais recente.';
comment on table public.executive_engineering_reports is 'Relatórios versionados e auditáveis da Engenharia por OE.';
comment on table public.executive_council_opinions is 'Pareceres versionados do Conselho Estratégico.';
comment on table public.executive_ceo_decisions is 'Decisões append-only do CEO sobre entregas e prioridades.';
comment on table public.executive_order_audit_events is 'Ledger imutável de todas as alterações do Conselho Estratégico.';
