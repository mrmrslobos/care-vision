-- Care Visit Log schema (also applied to Supabase project)

create or replace function public.is_circle_member(p_circle_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $fn$
  select exists (
    select 1 from public.circle_members m
    where m.circle_id = p_circle_id and m.user_id = auth.uid()
  );
$fn$;

-- care_circles
create policy "members read circles" on public.care_circles for select
  using (public.is_circle_member(id));
create policy "users create circles" on public.care_circles for insert
  with check (auth.uid() = created_by);
create policy "owners update circles" on public.care_circles for update
  using (created_by = auth.uid());
create policy "authenticated lookup invite" on public.care_circles for select
  using (auth.uid() is not null);

-- circle_members
create policy "members read circle_members" on public.circle_members for select
  using (public.is_circle_member(circle_id));
create policy "users join circle" on public.circle_members for insert
  with check (auth.uid() = user_id);
create policy "users update own member row" on public.circle_members for update
  using (user_id = auth.uid());

-- care_visits
create policy "members read visits" on public.care_visits for select
  using (public.is_circle_member(circle_id));
create policy "members insert visits" on public.care_visits for insert
  with check (public.is_circle_member(circle_id));
create policy "members update visits" on public.care_visits for update
  using (public.is_circle_member(circle_id));
create policy "members delete visits" on public.care_visits for delete
  using (public.is_circle_member(circle_id));

-- visit_photos
create policy "members read photos" on public.visit_photos for select
  using (exists (select 1 from public.care_visits v where v.id = visit_id and public.is_circle_member(v.circle_id)));
create policy "members insert photos" on public.visit_photos for insert
  with check (exists (select 1 from public.care_visits v where v.id = visit_id and public.is_circle_member(v.circle_id)));
create policy "members update photos" on public.visit_photos for update
  using (exists (select 1 from public.care_visits v where v.id = visit_id and public.is_circle_member(v.circle_id)));
create policy "members delete photos" on public.visit_photos for delete
  using (exists (select 1 from public.care_visits v where v.id = visit_id and public.is_circle_member(v.circle_id)));

-- visit_notes
create policy "members read notes" on public.visit_notes for select
  using (exists (select 1 from public.care_visits v where v.id = visit_id and public.is_circle_member(v.circle_id)));
create policy "members insert notes" on public.visit_notes for insert
  with check (exists (select 1 from public.care_visits v where v.id = visit_id and public.is_circle_member(v.circle_id)));
create policy "members update notes" on public.visit_notes for update
  using (exists (select 1 from public.care_visits v where v.id = visit_id and public.is_circle_member(v.circle_id)));
create policy "members delete notes" on public.visit_notes for delete
  using (exists (select 1 from public.care_visits v where v.id = visit_id and public.is_circle_member(v.circle_id)));

-- visit_reminders
create policy "users read own reminders" on public.visit_reminders for select
  using (user_id = auth.uid() and public.is_circle_member(circle_id));
create policy "users insert own reminders" on public.visit_reminders for insert
  with check (user_id = auth.uid() and public.is_circle_member(circle_id));
create policy "users update own reminders" on public.visit_reminders for update
  using (user_id = auth.uid());
create policy "users delete own reminders" on public.visit_reminders for delete
  using (user_id = auth.uid());
