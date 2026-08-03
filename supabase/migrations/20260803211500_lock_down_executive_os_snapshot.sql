-- Executive OS is private end-to-end. Only the server-side service role may execute snapshots.
revoke all on function public.executive_weekly_snapshot(text,timestamptz,timestamptz)
  from public,anon,authenticated;
grant execute on function public.executive_weekly_snapshot(text,timestamptz,timestamptz)
  to service_role;