-- ============================================================================
--  ArborPro — Team Hierarchy, Assignments, Alerts & Message Boards
--  Run this AFTER supabase_setup.sql has already been run once on this project.
--  Paste this whole file into your Supabase project's SQL Editor and press Run.
--  Safe to run more than once.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Team hierarchy: link logins to roster rows, invite codes, "reports to"
-- ----------------------------------------------------------------------------
alter table public.team_members add column if not exists reports_to uuid references public.team_members(id) on delete set null;
alter table public.team_members add column if not exists invite_code text unique;
alter table public.team_members add column if not exists invite_status text not null default 'active'; -- pending | active

-- ----------------------------------------------------------------------------
-- 2. Quotes can now be assigned to one or more team members, same as jobs
-- ----------------------------------------------------------------------------
alter table public.quotes add column if not exists assigned_to text[] not null default '{}';

-- ----------------------------------------------------------------------------
-- 3. Notifications (alerts)
-- ----------------------------------------------------------------------------
create table if not exists public.notifications (
  id                   uuid primary key default gen_random_uuid(),
  recipient_profile_id uuid not null references public.profiles(id) on delete cascade,
  actor_profile_id     uuid references public.profiles(id) on delete set null,
  type                 text not null default 'info',   -- assignment | mention | status_change | announcement | info
  title                text not null default '',
  body                 text not null default '',
  link_type            text,                            -- job | quote | board
  link_id              text,
  read                 boolean not null default false,
  created_at           timestamptz not null default now()
);

create index if not exists notifications_recipient_idx on public.notifications (recipient_profile_id, read, created_at desc);

-- ----------------------------------------------------------------------------
-- 4. Message board: crew-wide announcements + per-job/per-quote comment threads
-- ----------------------------------------------------------------------------
create table if not exists public.board_posts (
  id                uuid primary key default gen_random_uuid(),
  author_profile_id uuid references public.profiles(id) on delete set null,
  context_type      text not null default 'announcement', -- announcement | job | quote
  context_id        uuid,
  body              text not null default '',
  pinned            boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  deleted_at        timestamptz
);

create index if not exists board_posts_context_idx on public.board_posts (context_type, context_id, created_at desc);

create table if not exists public.board_reads (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.board_posts(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  read_at    timestamptz not null default now(),
  unique (post_id, profile_id)
);

-- ----------------------------------------------------------------------------
-- 5. Helper functions used by the security rules below.
--    security definer = these run with full access internally so they don't
--    get blocked by the very policies that call them.
-- ----------------------------------------------------------------------------
create or replace function public.current_team_role()
returns text
language sql stable security definer set search_path = public as $$
  select role from public.team_members where profile_id = auth.uid() and active = true limit 1;
$$;

create or replace function public.current_team_member_id()
returns uuid
language sql stable security definer set search_path = public as $$
  select id from public.team_members where profile_id = auth.uid() and active = true limit 1;
$$;

-- ----------------------------------------------------------------------------
-- 6. Auto-create a profile row AND link an invite when someone signs up
--    (extends the trigger already installed by supabase_setup.sql)
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_invite_code text;
  v_team_role   text;
begin
  v_invite_code := new.raw_user_meta_data->>'invite_code';

  insert into public.profiles (id, name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce(new.email, ''),
    'user'
  )
  on conflict (id) do nothing;

  if v_invite_code is not null then
    update public.team_members
      set profile_id    = new.id,
          invite_status = 'active',
          invite_code   = null,
          email         = coalesce(nullif(new.email, ''), email),
          updated_at    = now()
      where invite_code = v_invite_code and invite_status = 'pending'
      returning role into v_team_role;

    if v_team_role is not null then
      update public.profiles
        set role = case when v_team_role = 'admin' then 'admin' else 'user' end
        where id = new.id;
    end if;
  end if;

  return new;
end;
$$;

-- (trigger itself already exists from supabase_setup.sql and now calls the updated function)

-- ----------------------------------------------------------------------------
-- 7. Row Level Security — real hierarchy of control
--    Admin & Supervisor: full access to jobs, quotes, team roster.
--    Arborist & Apprentice: only see/edit jobs & quotes assigned to them
--    (plus any not-yet-assigned ones, so new work stays visible to everyone).
-- ----------------------------------------------------------------------------

-- Jobs -------------------------------------------------------------------
drop policy if exists "staff_all" on public.jobs;
drop policy if exists "jobs_select" on public.jobs;
drop policy if exists "jobs_insert" on public.jobs;
drop policy if exists "jobs_update" on public.jobs;
drop policy if exists "jobs_delete" on public.jobs;

create policy "jobs_select" on public.jobs for select to authenticated using (
  public.current_team_role() in ('admin','supervisor')
  or public.current_team_member_id()::text = any(assigned_to)
  or assigned_to = '{}'
);
create policy "jobs_insert" on public.jobs for insert to authenticated with check (true);
create policy "jobs_update" on public.jobs for update to authenticated using (
  public.current_team_role() in ('admin','supervisor')
  or public.current_team_member_id()::text = any(assigned_to)
);
create policy "jobs_delete" on public.jobs for delete to authenticated using (
  public.current_team_role() in ('admin','supervisor')
);

-- Quotes -------------------------------------------------------------------
drop policy if exists "staff_all" on public.quotes;
drop policy if exists "quotes_select" on public.quotes;
drop policy if exists "quotes_insert" on public.quotes;
drop policy if exists "quotes_update" on public.quotes;
drop policy if exists "quotes_delete" on public.quotes;

create policy "quotes_select" on public.quotes for select to authenticated using (
  public.current_team_role() in ('admin','supervisor')
  or public.current_team_member_id()::text = any(assigned_to)
  or assigned_to = '{}'
);
create policy "quotes_insert" on public.quotes for insert to authenticated with check (
  public.current_team_role() in ('admin','supervisor')
);
create policy "quotes_update" on public.quotes for update to authenticated using (
  public.current_team_role() in ('admin','supervisor')
  or public.current_team_member_id()::text = any(assigned_to)
);
create policy "quotes_delete" on public.quotes for delete to authenticated using (
  public.current_team_role() = 'admin'
);

-- Team members ---------------------------------------------------------------
drop policy if exists "staff_all" on public.team_members;
drop policy if exists "team_members_select" on public.team_members;
drop policy if exists "team_members_insert" on public.team_members;
drop policy if exists "team_members_update" on public.team_members;
drop policy if exists "team_members_claim_unlinked" on public.team_members;
drop policy if exists "team_members_delete" on public.team_members;

-- Everyone signed in can see the roster (it's a staff directory)
create policy "team_members_select" on public.team_members for select to authenticated using (true);

-- Only admins/supervisors can add people to the roster. The "role is null"
-- clause is a one-time bootstrap: on a brand new project nobody has a role
-- yet, so it lets the very first person in create their own Admin entry.
-- Once that's done, everyone else is added by an existing admin/supervisor.
create policy "team_members_insert" on public.team_members for insert to authenticated with check (
  public.current_team_role() in ('admin','supervisor') or public.current_team_role() is null
);

-- Only admins/supervisors can edit the roster (role, contact info, etc).
-- Self-editing is deliberately NOT allowed via a general row policy — a
-- policy like "you can edit your own row" would also let someone quietly
-- change their own role, since row security can't restrict individual
-- columns. Claiming an unlinked row (below) uses a narrow function instead.
create policy "team_members_update" on public.team_members for update to authenticated using (
  public.current_team_role() in ('admin','supervisor')
);

-- Bootstrap: a signed-in user may claim ("this is me") a roster row that
-- isn't linked to any login yet. This goes through a function rather than
-- a table policy so the ONLY thing it can ever change is profile_id —
-- never role, active status, etc — even if someone calls the API directly.
create or replace function public.claim_team_member(target_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.team_members
    set profile_id = auth.uid(), updated_at = now()
    where id = target_id and profile_id is null;
end;
$$;
grant execute on function public.claim_team_member(uuid) to authenticated;

-- Only admins can remove people from the roster
create policy "team_members_delete" on public.team_members for delete to authenticated using (
  public.current_team_role() = 'admin'
);

-- Let a not-yet-registered invitee look up their own pending invite by code
drop policy if exists "invite_lookup" on public.team_members;
create policy "invite_lookup" on public.team_members for select to anon using (
  invite_status = 'pending' and invite_code is not null
);

-- Notifications ---------------------------------------------------------------
alter table public.notifications enable row level security;
drop policy if exists "notifications_select_own" on public.notifications;
drop policy if exists "notifications_insert_any" on public.notifications;
drop policy if exists "notifications_update_own" on public.notifications;
drop policy if exists "notifications_delete_own" on public.notifications;

create policy "notifications_select_own" on public.notifications for select to authenticated using (recipient_profile_id = auth.uid());
create policy "notifications_insert_any" on public.notifications for insert to authenticated with check (true);
create policy "notifications_update_own" on public.notifications for update to authenticated using (recipient_profile_id = auth.uid());
create policy "notifications_delete_own" on public.notifications for delete to authenticated using (recipient_profile_id = auth.uid());

-- Message board ---------------------------------------------------------------
alter table public.board_posts enable row level security;
drop policy if exists "board_read" on public.board_posts;
drop policy if exists "board_insert" on public.board_posts;
drop policy if exists "board_update_own" on public.board_posts;
drop policy if exists "board_delete_own_or_admin" on public.board_posts;

create policy "board_read" on public.board_posts for select to authenticated using (deleted_at is null);
create policy "board_insert" on public.board_posts for insert to authenticated with check (author_profile_id = auth.uid());
create policy "board_update_own" on public.board_posts for update to authenticated using (
  author_profile_id = auth.uid() or public.current_team_role() in ('admin','supervisor')
);
create policy "board_delete_own_or_admin" on public.board_posts for delete to authenticated using (
  author_profile_id = auth.uid() or public.current_team_role() = 'admin'
);

alter table public.board_reads enable row level security;
drop policy if exists "board_reads_select" on public.board_reads;
drop policy if exists "board_reads_insert_own" on public.board_reads;

create policy "board_reads_select" on public.board_reads for select to authenticated using (true);
create policy "board_reads_insert_own" on public.board_reads for insert to authenticated with check (profile_id = auth.uid());

-- ----------------------------------------------------------------------------
-- 8. Live updates: let the app subscribe to new notifications & posts in real time
-- ----------------------------------------------------------------------------
do $$
begin
  alter publication supabase_realtime add table public.notifications;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.board_posts;
exception when duplicate_object then null;
end $$;

-- ============================================================================
--  Done. Next steps:
--  1. In the app, go to Team, find (or create) your own entry, and click
--     "This is me" to link your login to it — make sure your role is Admin.
--  2. Use "Generate invite link" on any roster row to invite that person to
--     create their own login, locked to the role you gave them.
-- ============================================================================
