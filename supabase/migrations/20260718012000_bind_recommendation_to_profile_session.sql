do $migration$
declare v_definition text;
begin
  select pg_get_functiondef('private.recommendation_execute(uuid,uuid,text)'::regprocedure)
    into v_definition;
  v_definition := replace(
    v_definition,
    $old$if not exists (
    select 1 from public.telemetry_events
    where visitor_id = p_visitor_id and session_id = p_session_id
  ) then
    raise exception 'recommendation session not recognized';
  end if;$old$,
    $new$if v_profile.current_session_id <> p_session_id then
    raise exception 'recommendation session not recognized';
  end if;$new$
  );
  if position('public.telemetry_events' in v_definition) > 0 then
    raise exception 'recommendation engine still depends on telemetry';
  end if;
  execute v_definition;
end;
$migration$;
