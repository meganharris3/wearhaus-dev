-- ============================================================
-- Haus invite links — "Copy Link" used to copy a made-up URL
-- (wearhaus.app/join/<slugified name>) that went nowhere. Each haus now gets
-- a random, unguessable invite code, readable only by its members, and the
-- app serves /join/<code>: anyone signed in who opens it can preview the haus
-- and join it through join_haus_by_invite_code below.
--
-- Also lets any member (not just the admin) send in-app invites, since the
-- haus screen's Invite button is shown to every member and the link they can
-- already copy lets anyone join anyway.
--
-- Campus closets get neither: they're for students who verified a school email
-- (campus OTP), and an invite would be a way in without that.
-- ============================================================

create table public.haus_invite_links (
  haus_id    uuid primary key references public.hauses(id) on delete cascade,
  -- 12 hex chars from gen_random_uuid() (a strong random source), not a slug of the name.
  code       text not null unique default substr(replace(gen_random_uuid()::text, '-', ''), 1, 12),
  created_at timestamptz not null default now()
);

alter table public.haus_invite_links enable row level security;

-- Only members can see (and so share) a haus's link. Everyone else reaches it
-- through the security-definer functions below, by code.
create policy "haus_invite_links: member read" on public.haus_invite_links
  for select using (
    exists (
      select 1 from public.haus_memberships m
      where m.haus_id = haus_invite_links.haus_id and m.user_id = auth.uid()
    )
  );

insert into public.haus_invite_links (haus_id)
select id from public.hauses where haus_type is distinct from 'campus'
on conflict (haus_id) do nothing;

create or replace function public.create_haus_invite_link()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.haus_type is distinct from 'campus' then
    insert into public.haus_invite_links (haus_id) values (new.id) on conflict (haus_id) do nothing;
  end if;
  return new;
end;
$$;

create trigger trg_create_haus_invite_link
  after insert on public.hauses
  for each row execute procedure public.create_haus_invite_link();

-- What the /join/<code> screen shows before the user joins.
create or replace function public.haus_invite_preview(p_code text)
returns table (
  id uuid, name text, description text, cover_url text,
  member_count integer, piece_count integer, is_member boolean
)
language sql stable security definer set search_path = public as $$
  select h.id, h.name, h.description, h.cover_url, h.member_count, h.piece_count,
         exists (
           select 1 from public.haus_memberships m
           where m.haus_id = h.id and m.user_id = auth.uid()
         )
    from public.haus_invite_links l
    join public.hauses h on h.id = l.haus_id
   where l.code = p_code;
$$;

-- Joins the caller to the haus behind p_code and returns its id. Joining a haus
-- you'd also been invited to in-app accepts that invitation (017's trigger then
-- resolves its notification and tells the inviter); otherwise the haus admins
-- get a "joined" notification. Already a member: a no-op.
create or replace function public.join_haus_by_invite_code(p_code text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_user    uuid := auth.uid();
  v_haus    uuid;
  v_joined  integer;
  v_invites integer;
begin
  if v_user is null then
    raise exception 'Not signed in';
  end if;

  select haus_id into v_haus from public.haus_invite_links where code = p_code;
  if v_haus is null then
    raise exception 'This invite link is not valid';
  end if;

  insert into public.haus_memberships (haus_id, user_id, role, joined_at)
  values (v_haus, v_user, 'member', now())
  on conflict (user_id, haus_id) do nothing;
  get diagnostics v_joined = row_count;
  if v_joined = 0 then
    return v_haus;
  end if;

  update public.haus_invitations
     set status = 'accepted'
   where haus_id = v_haus and invitee_id = v_user and status = 'pending';
  get diagnostics v_invites = row_count;

  if v_invites = 0 then
    insert into public.notifications (user_id, type, payload)
    select m.user_id, 'haus_accepted',
           jsonb_build_object(
             'haus_id',      v_haus,
             'haus_name',    (select name from public.hauses where id = v_haus),
             'from_user_id', v_user,
             'from_name',    (select display_name from public.users where id = v_user)
           )
      from public.haus_memberships m
     where m.haus_id = v_haus and m.role = 'admin' and m.user_id <> v_user;
  end if;

  return v_haus;
end;
$$;

revoke execute on function public.haus_invite_preview(text)      from public, anon;
revoke execute on function public.join_haus_by_invite_code(text) from public, anon;
grant  execute on function public.haus_invite_preview(text)      to authenticated;
grant  execute on function public.join_haus_by_invite_code(text) to authenticated;

-- Any member can invite, not only the admin — except to a campus closet.
drop policy if exists "haus_invitations: admin insert" on public.haus_invitations;
create policy "haus_invitations: member insert" on public.haus_invitations
  for insert
  with check (
    auth.uid() = inviter_id
    and exists (
      select 1 from public.haus_memberships m
      where m.haus_id = haus_invitations.haus_id
        and m.user_id = auth.uid()
    )
    and not exists (
      select 1 from public.hauses h
      where h.id = haus_invitations.haus_id and h.haus_type = 'campus'
    )
  );
