create index if not exists operational_monitor_runs_snapshot_idx
  on public.operational_monitor_runs (snapshot_id)
  where snapshot_id is not null;
