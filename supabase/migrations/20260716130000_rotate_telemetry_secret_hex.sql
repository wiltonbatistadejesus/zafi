create or replace function public.telemetry_secret_valid(p_secret text)
returns boolean
language sql
immutable
set search_path = pg_catalog
as $$
  select extensions.digest(coalesce(p_secret, ''), 'sha256') = decode('a7a2227f676beedb8898c210fe894dc7aa5becf0b2e3e4640b2b3127157f69f6', 'hex');
$$;

revoke all on function public.telemetry_secret_valid(text) from public, anon, authenticated;
