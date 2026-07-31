-- OE-016 — Zafi Content Studio
-- Área administrativa privada; acesso somente pelo servidor com service_role.

create table public.content_studio_categories (
  id uuid primary key default gen_random_uuid(), slug text not null unique, label text not null,
  sort_order integer not null default 0, active boolean not null default true, created_at timestamptz not null default now()
);
create table public.content_studio_networks (
  id uuid primary key default gen_random_uuid(), slug text not null unique, label text not null,
  active boolean not null default true, created_at timestamptz not null default now()
);
create table public.content_studio_formats (
  id uuid primary key default gen_random_uuid(), slug text not null unique, label text not null,
  width integer not null check(width between 320 and 4096), height integer not null check(height between 320 and 4096),
  active boolean not null default true, created_at timestamptz not null default now()
);
create table public.content_studio_contents (
  id uuid primary key default gen_random_uuid(), slug text not null unique, internal_title text not null,
  theme text not null, objective text not null,
  category_id uuid not null references public.content_studio_categories(id),
  network_id uuid not null references public.content_studio_networks(id),
  format_id uuid not null references public.content_studio_formats(id),
  status text not null default 'draft' check(status in ('draft','pending_review','approved','rejected','regenerating','revised','exported','archived')),
  current_version_number integer not null default 1 check(current_version_number>0),
  current_version_id uuid, approved_version_id uuid, created_by text not null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), archived_at timestamptz
);
create table public.content_studio_content_versions (
  id uuid primary key default gen_random_uuid(), content_id uuid not null references public.content_studio_contents(id) on delete cascade,
  version_number integer not null check(version_number>0),
  status text not null check(status in ('draft','pending_review','approved','rejected','regenerating','revised','exported','archived')),
  art_text text not null, caption text not null, cta text not null, hashtags text[] not null default '{}',
  sources jsonb not null default '[]'::jsonb check(jsonb_typeof(sources)='array'),
  visual_direction text not null, design_variant text not null,
  author_name text not null, author_type text not null check(author_type in ('agent','human','system')),
  based_on_version_id uuid references public.content_studio_content_versions(id), change_summary text,
  created_at timestamptz not null default now(), unique(content_id,version_number)
);
alter table public.content_studio_contents add constraint content_studio_contents_current_version_id_fkey foreign key(current_version_id) references public.content_studio_content_versions(id);
alter table public.content_studio_contents add constraint content_studio_contents_approved_version_id_fkey foreign key(approved_version_id) references public.content_studio_content_versions(id);
create table public.content_studio_pages (
  id uuid primary key default gen_random_uuid(), content_id uuid not null references public.content_studio_contents(id) on delete cascade,
  version_id uuid not null references public.content_studio_content_versions(id) on delete cascade,
  page_number integer not null check(page_number>0), art_text text not null, alt_text text not null,
  visual_direction text not null, created_at timestamptz not null default now(), unique(version_id,page_number)
);
create table public.content_studio_files (
  id uuid primary key default gen_random_uuid(), content_id uuid not null references public.content_studio_contents(id) on delete cascade,
  version_id uuid not null references public.content_studio_content_versions(id) on delete cascade,
  page_id uuid references public.content_studio_pages(id) on delete cascade,
  asset_kind text not null check(asset_kind in ('image','text','manifest','zip')), mime_type text not null,
  file_name text not null, asset_path text not null, storage_provider text not null default 'deterministic_renderer',
  size_bytes bigint, checksum_sha256 text, created_at timestamptz not null default now()
);
create table public.content_studio_reviews (
  id uuid primary key default gen_random_uuid(), content_id uuid not null references public.content_studio_contents(id),
  version_id uuid not null references public.content_studio_content_versions(id),
  decision text not null check(decision in ('approved','rejected','revision_requested')),
  reason_code text, guidance text, actor_name text not null, actor_email text not null, actor_role text not null,
  created_at timestamptz not null default now()
);
create table public.content_studio_bulk_actions (
  id uuid primary key default gen_random_uuid(), action_type text not null check(action_type in ('approve','reject','export','archive')),
  reason_code text, guidance text, item_count integer not null check(item_count>0), actor_name text not null,
  actor_email text not null, created_at timestamptz not null default now()
);
create table public.content_studio_bulk_action_items (
  id uuid primary key default gen_random_uuid(), bulk_action_id uuid not null references public.content_studio_bulk_actions(id),
  content_id uuid not null references public.content_studio_contents(id), version_id uuid references public.content_studio_content_versions(id),
  outcome text not null, created_at timestamptz not null default now()
);
create table public.content_studio_exports (
  id uuid primary key default gen_random_uuid(), export_type text not null check(export_type in ('individual','batch')),
  content_ids uuid[] not null, version_ids uuid[] not null, file_name text not null,
  status text not null default 'completed' check(status in ('processing','completed','failed')),
  manifest jsonb not null default '{}'::jsonb, requested_by_name text not null, requested_by_email text not null,
  created_at timestamptz not null default now()
);
create table public.content_studio_audit_events (
  id uuid primary key default gen_random_uuid(), content_id uuid references public.content_studio_contents(id),
  version_id uuid references public.content_studio_content_versions(id), event_type text not null,
  actor_name text not null, actor_email text, actor_role text not null, payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index content_studio_contents_status_created_idx on public.content_studio_contents(status,created_at desc);
create index content_studio_contents_category_idx on public.content_studio_contents(category_id);
create index content_studio_contents_network_idx on public.content_studio_contents(network_id);
create index content_studio_contents_format_idx on public.content_studio_contents(format_id);
create index content_studio_versions_content_idx on public.content_studio_content_versions(content_id,version_number desc);
create index content_studio_pages_version_idx on public.content_studio_pages(version_id,page_number);
create index content_studio_reviews_content_idx on public.content_studio_reviews(content_id,created_at desc);
create index content_studio_audit_content_idx on public.content_studio_audit_events(content_id,created_at desc);

alter table public.content_studio_categories enable row level security;
alter table public.content_studio_networks enable row level security;
alter table public.content_studio_formats enable row level security;
alter table public.content_studio_contents enable row level security;
alter table public.content_studio_content_versions enable row level security;
alter table public.content_studio_pages enable row level security;
alter table public.content_studio_files enable row level security;
alter table public.content_studio_reviews enable row level security;
alter table public.content_studio_bulk_actions enable row level security;
alter table public.content_studio_bulk_action_items enable row level security;
alter table public.content_studio_exports enable row level security;
alter table public.content_studio_audit_events enable row level security;

revoke all on public.content_studio_categories,public.content_studio_networks,public.content_studio_formats,
 public.content_studio_contents,public.content_studio_content_versions,public.content_studio_pages,
 public.content_studio_files,public.content_studio_reviews,public.content_studio_bulk_actions,
 public.content_studio_bulk_action_items,public.content_studio_exports,public.content_studio_audit_events
from public,anon,authenticated;
grant select,insert,update,delete on public.content_studio_categories,public.content_studio_networks,
 public.content_studio_formats,public.content_studio_contents,public.content_studio_content_versions,
 public.content_studio_pages,public.content_studio_files,public.content_studio_reviews,
 public.content_studio_bulk_actions,public.content_studio_bulk_action_items,public.content_studio_exports,
 public.content_studio_audit_events to service_role;

create function public.content_studio_approve(p_content_id uuid,p_actor_name text,p_actor_email text,p_actor_role text)
returns uuid language plpgsql security invoker set search_path=public,pg_temp as $$
declare c public.content_studio_contents%rowtype; review_id uuid;
begin
 if p_actor_role<>'ceo' then raise exception 'only CEO can approve content' using errcode='42501'; end if;
 select * into c from public.content_studio_contents where id=p_content_id for update;
 if c.id is null or c.status='archived' then raise exception 'content unavailable'; end if;
 update public.content_studio_content_versions set status='approved' where id=c.current_version_id;
 update public.content_studio_contents set status='approved',approved_version_id=current_version_id,updated_at=now() where id=p_content_id;
 insert into public.content_studio_reviews(content_id,version_id,decision,actor_name,actor_email,actor_role)
 values(p_content_id,c.current_version_id,'approved',p_actor_name,p_actor_email,p_actor_role) returning id into review_id;
 insert into public.content_studio_audit_events(content_id,version_id,event_type,actor_name,actor_email,actor_role,payload)
 values(p_content_id,c.current_version_id,'content_approved',p_actor_name,p_actor_email,p_actor_role,jsonb_build_object('review_id',review_id,'version',c.current_version_number));
 return review_id;
end $$;

create function public.content_studio_create_revision(
 p_content_id uuid,p_art_text text,p_caption text,p_cta text,p_hashtags text[],p_visual_direction text,
 p_design_variant text,p_pages jsonb,p_change_summary text,p_actor_name text,p_actor_email text,p_actor_role text
) returns uuid language plpgsql security invoker set search_path=public,pg_temp as $$
declare c public.content_studio_contents%rowtype; old_v public.content_studio_content_versions%rowtype;
 new_id uuid; page jsonb; page_id uuid; next_v integer;
begin
 if p_actor_role<>'ceo' then raise exception 'only CEO can edit content' using errcode='42501'; end if;
 select * into c from public.content_studio_contents where id=p_content_id for update;
 select * into old_v from public.content_studio_content_versions where id=c.current_version_id;
 if c.id is null or old_v.id is null then raise exception 'content unavailable'; end if;
 next_v:=c.current_version_number+1;
 if old_v.status in('draft','pending_review','regenerating') then update public.content_studio_content_versions set status='revised' where id=old_v.id; end if;
 insert into public.content_studio_content_versions(content_id,version_number,status,art_text,caption,cta,hashtags,sources,visual_direction,design_variant,author_name,author_type,based_on_version_id,change_summary)
 values(p_content_id,next_v,'pending_review',p_art_text,p_caption,p_cta,p_hashtags,old_v.sources,p_visual_direction,p_design_variant,p_actor_name,'human',old_v.id,p_change_summary) returning id into new_id;
 for page in select value from jsonb_array_elements(p_pages) loop
  insert into public.content_studio_pages(content_id,version_id,page_number,art_text,alt_text,visual_direction)
  values(p_content_id,new_id,(page->>'page_number')::integer,page->>'art_text',page->>'alt_text',coalesce(page->>'visual_direction',p_visual_direction)) returning id into page_id;
  insert into public.content_studio_files(content_id,version_id,page_id,asset_kind,mime_type,file_name,asset_path)
  values(p_content_id,new_id,page_id,'image','image/png',format('zafi_%s_v%s_p%s.png',c.slug,next_v,page->>'page_number'),format('/admin/content-studio/assets/%s/%s',new_id,page->>'page_number'));
 end loop;
 update public.content_studio_contents set current_version_id=new_id,current_version_number=next_v,status='pending_review',updated_at=now() where id=p_content_id;
 insert into public.content_studio_audit_events(content_id,version_id,event_type,actor_name,actor_email,actor_role,payload)
 values(p_content_id,new_id,'revision_created',p_actor_name,p_actor_email,p_actor_role,jsonb_build_object('version',next_v,'based_on_version_id',old_v.id,'change_summary',p_change_summary));
 return new_id;
end $$;

create function public.content_studio_reject_and_regenerate(
 p_content_id uuid,p_reason_code text,p_guidance text,p_art_text text,p_caption text,p_cta text,p_hashtags text[],
 p_visual_direction text,p_design_variant text,p_pages jsonb,p_actor_name text,p_actor_email text,p_actor_role text
) returns uuid language plpgsql security invoker set search_path=public,pg_temp as $$
declare c public.content_studio_contents%rowtype; old_v public.content_studio_content_versions%rowtype;
 new_id uuid; review_id uuid; page jsonb; page_id uuid; next_v integer;
begin
 if p_actor_role<>'ceo' then raise exception 'only CEO can reject content' using errcode='42501'; end if;
 if nullif(btrim(p_reason_code),'') is null then raise exception 'rejection reason is required'; end if;
 select * into c from public.content_studio_contents where id=p_content_id for update;
 select * into old_v from public.content_studio_content_versions where id=c.current_version_id;
 if c.id is null or old_v.id is null then raise exception 'content unavailable'; end if;
 next_v:=c.current_version_number+1;
 update public.content_studio_content_versions set status='rejected' where id=old_v.id;
 update public.content_studio_contents set status='regenerating',updated_at=now() where id=p_content_id;
 insert into public.content_studio_reviews(content_id,version_id,decision,reason_code,guidance,actor_name,actor_email,actor_role)
 values(p_content_id,old_v.id,'rejected',p_reason_code,nullif(btrim(p_guidance),''),p_actor_name,p_actor_email,p_actor_role) returning id into review_id;
 insert into public.content_studio_content_versions(content_id,version_number,status,art_text,caption,cta,hashtags,sources,visual_direction,design_variant,author_name,author_type,based_on_version_id,change_summary)
 values(p_content_id,next_v,'pending_review',p_art_text,p_caption,p_cta,p_hashtags,old_v.sources,p_visual_direction,p_design_variant,'Content Studio Refactor Agent','agent',old_v.id,format('Refação automática por %s. %s',p_reason_code,coalesce(nullif(btrim(p_guidance),''),'Sem orientação adicional.'))) returning id into new_id;
 for page in select value from jsonb_array_elements(p_pages) loop
  insert into public.content_studio_pages(content_id,version_id,page_number,art_text,alt_text,visual_direction)
  values(p_content_id,new_id,(page->>'page_number')::integer,page->>'art_text',page->>'alt_text',coalesce(page->>'visual_direction',p_visual_direction)) returning id into page_id;
  insert into public.content_studio_files(content_id,version_id,page_id,asset_kind,mime_type,file_name,asset_path)
  values(p_content_id,new_id,page_id,'image','image/png',format('zafi_%s_v%s_p%s.png',c.slug,next_v,page->>'page_number'),format('/admin/content-studio/assets/%s/%s',new_id,page->>'page_number'));
 end loop;
 update public.content_studio_contents set current_version_id=new_id,current_version_number=next_v,status='pending_review',updated_at=now() where id=p_content_id;
 insert into public.content_studio_audit_events(content_id,version_id,event_type,actor_name,actor_email,actor_role,payload) values
 (p_content_id,old_v.id,'content_rejected',p_actor_name,p_actor_email,p_actor_role,jsonb_build_object('review_id',review_id,'reason_code',p_reason_code,'guidance',p_guidance)),
 (p_content_id,new_id,'content_regenerated','Content Studio Refactor Agent',null,'agent',jsonb_build_object('version',next_v,'based_on_version_id',old_v.id,'reason_code',p_reason_code));
 return new_id;
end $$;

create function public.content_studio_archive(p_content_id uuid,p_actor_name text,p_actor_email text,p_actor_role text)
returns void language plpgsql security invoker set search_path=public,pg_temp as $$
declare v uuid;
begin
 if p_actor_role<>'ceo' then raise exception 'only CEO can archive content' using errcode='42501'; end if;
 update public.content_studio_contents set status='archived',archived_at=now(),updated_at=now() where id=p_content_id returning current_version_id into v;
 if v is null then raise exception 'content not found'; end if;
 insert into public.content_studio_audit_events(content_id,version_id,event_type,actor_name,actor_email,actor_role)
 values(p_content_id,v,'content_archived',p_actor_name,p_actor_email,p_actor_role);
end $$;

create function public.content_studio_record_export(p_content_ids uuid[],p_file_name text,p_manifest jsonb,p_actor_name text,p_actor_email text,p_actor_role text)
returns uuid language plpgsql security invoker set search_path=public,pg_temp as $$
declare export_id uuid; versions uuid[]; c_id uuid; v_id uuid;
begin
 if p_actor_role<>'ceo' then raise exception 'only CEO can export content' using errcode='42501'; end if;
 if coalesce(array_length(p_content_ids,1),0)=0 then raise exception 'no content selected'; end if;
 select array_agg(approved_version_id order by id) into versions from public.content_studio_contents where id=any(p_content_ids) and approved_version_id is not null;
 if coalesce(array_length(versions,1),0)<>array_length(p_content_ids,1) then raise exception 'all exported contents must have an approved version'; end if;
 insert into public.content_studio_exports(export_type,content_ids,version_ids,file_name,manifest,requested_by_name,requested_by_email)
 values(case when array_length(p_content_ids,1)=1 then 'individual' else 'batch' end,p_content_ids,versions,p_file_name,p_manifest,p_actor_name,p_actor_email) returning id into export_id;
 foreach c_id in array p_content_ids loop
  select approved_version_id into v_id from public.content_studio_contents where id=c_id;
  update public.content_studio_contents set status='exported',updated_at=now() where id=c_id;
  insert into public.content_studio_audit_events(content_id,version_id,event_type,actor_name,actor_email,actor_role,payload)
  values(c_id,v_id,'content_exported',p_actor_name,p_actor_email,p_actor_role,jsonb_build_object('export_id',export_id,'file_name',p_file_name));
 end loop;
 return export_id;
end $$;

revoke all on function public.content_studio_approve(uuid,text,text,text) from public,anon,authenticated;
revoke all on function public.content_studio_create_revision(uuid,text,text,text,text[],text,text,jsonb,text,text,text,text) from public,anon,authenticated;
revoke all on function public.content_studio_reject_and_regenerate(uuid,text,text,text,text,text,text[],text,text,jsonb,text,text,text) from public,anon,authenticated;
revoke all on function public.content_studio_archive(uuid,text,text,text) from public,anon,authenticated;
revoke all on function public.content_studio_record_export(uuid[],text,jsonb,text,text,text) from public,anon,authenticated;
grant execute on function public.content_studio_approve(uuid,text,text,text) to service_role;
grant execute on function public.content_studio_create_revision(uuid,text,text,text,text[],text,text,jsonb,text,text,text,text) to service_role;
grant execute on function public.content_studio_reject_and_regenerate(uuid,text,text,text,text,text,text[],text,text,jsonb,text,text,text) to service_role;
grant execute on function public.content_studio_archive(uuid,text,text,text) to service_role;
grant execute on function public.content_studio_record_export(uuid[],text,jsonb,text,text,text) to service_role;

comment on table public.content_studio_contents is 'Identidade e estado atual dos conteúdos do Zafi Content Studio.';
comment on table public.content_studio_content_versions is 'Versões preservadas; edição pós-aprovação sempre cria nova versão.';
comment on table public.content_studio_audit_events is 'Trilha append-only de todas as ações relevantes do Content Studio.';
