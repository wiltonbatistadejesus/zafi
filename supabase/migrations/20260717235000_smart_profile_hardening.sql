create index if not exists profile_consents_supersedes_idx
  on public.profile_consents (supersedes_id)
  where supersedes_id is not null;

revoke execute on function public.profile_record_consent(text, uuid, uuid, text, text, text, text) from authenticated;
revoke execute on function public.profile_record_progress(text, text, uuid, uuid, text, text, numeric, numeric, integer, text[], text[], integer, text, text, text) from authenticated;

-- O fluxo novo não grava mais diretamente na tabela legada de leads.
drop policy if exists allow_insert on public.leads;
revoke all on table public.leads from anon, authenticated;

