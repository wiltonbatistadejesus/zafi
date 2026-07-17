alter function public.telemetry_block_mutation() set search_path = pg_catalog;
revoke all on function public.telemetry_block_mutation() from public, anon, authenticated;

drop policy if exists telemetry_events_deny_direct_access on public.telemetry_events;
create policy telemetry_events_deny_direct_access
on public.telemetry_events
as restrictive
for all
to anon, authenticated
using (false)
with check (false);

drop policy if exists telemetry_deliveries_deny_direct_access on public.telemetry_deliveries;
create policy telemetry_deliveries_deny_direct_access
on public.telemetry_deliveries
as restrictive
for all
to anon, authenticated
using (false)
with check (false);
