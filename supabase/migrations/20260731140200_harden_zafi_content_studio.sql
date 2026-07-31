-- Content Studio é privado: políticas explícitas negam todo acesso do navegador.
create policy content_studio_categories_no_browser on public.content_studio_categories for all to anon,authenticated using(false) with check(false);
create policy content_studio_networks_no_browser on public.content_studio_networks for all to anon,authenticated using(false) with check(false);
create policy content_studio_formats_no_browser on public.content_studio_formats for all to anon,authenticated using(false) with check(false);
create policy content_studio_contents_no_browser on public.content_studio_contents for all to anon,authenticated using(false) with check(false);
create policy content_studio_versions_no_browser on public.content_studio_content_versions for all to anon,authenticated using(false) with check(false);
create policy content_studio_pages_no_browser on public.content_studio_pages for all to anon,authenticated using(false) with check(false);
create policy content_studio_files_no_browser on public.content_studio_files for all to anon,authenticated using(false) with check(false);
create policy content_studio_reviews_no_browser on public.content_studio_reviews for all to anon,authenticated using(false) with check(false);
create policy content_studio_bulk_actions_no_browser on public.content_studio_bulk_actions for all to anon,authenticated using(false) with check(false);
create policy content_studio_bulk_items_no_browser on public.content_studio_bulk_action_items for all to anon,authenticated using(false) with check(false);
create policy content_studio_exports_no_browser on public.content_studio_exports for all to anon,authenticated using(false) with check(false);
create policy content_studio_audit_no_browser on public.content_studio_audit_events for all to anon,authenticated using(false) with check(false);

create index content_studio_contents_current_version_idx on public.content_studio_contents(current_version_id);
create index content_studio_contents_approved_version_idx on public.content_studio_contents(approved_version_id) where approved_version_id is not null;
create index content_studio_versions_based_on_idx on public.content_studio_content_versions(based_on_version_id) where based_on_version_id is not null;
create index content_studio_pages_content_idx on public.content_studio_pages(content_id);
create index content_studio_files_content_idx on public.content_studio_files(content_id);
create index content_studio_files_version_idx on public.content_studio_files(version_id);
create index content_studio_files_page_idx on public.content_studio_files(page_id) where page_id is not null;
create index content_studio_reviews_version_idx on public.content_studio_reviews(version_id);
create index content_studio_bulk_items_action_idx on public.content_studio_bulk_action_items(bulk_action_id);
create index content_studio_bulk_items_content_idx on public.content_studio_bulk_action_items(content_id);
create index content_studio_bulk_items_version_idx on public.content_studio_bulk_action_items(version_id) where version_id is not null;
create index content_studio_audit_version_idx on public.content_studio_audit_events(version_id) where version_id is not null;
