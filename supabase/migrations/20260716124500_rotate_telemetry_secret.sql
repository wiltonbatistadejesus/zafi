create or replace function public.telemetry_secret_valid(p_secret text)
returns boolean
language sql
immutable
set search_path = pg_catalog
as $$
  select extensions.digest(coalesce(p_secret, ''), 'sha256') = decode('3441677d0573c535eacfed7553808ba78b0db0ec28569f63b92c38db613482c8', 'hex');
$$;

revoke all on function public.telemetry_secret_valid(text) from public, anon, authenticated;
