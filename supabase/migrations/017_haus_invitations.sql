-- ============================================================
-- Haus invitations — the "Add Members" step of Create Haus was a pure UI
-- mockup: typed text became a fake local Member object, never persisted,
-- and the real Haus only ever got the creator as a member. This wires it up
-- for real, as an invite-and-accept flow (same shape as friend requests),
-- not a direct admin insert: haus_memberships only allows a user to insert
-- their own row (002_security_fixes.sql's "self insert" policy, locked to
-- role = 'member'), so an invitee must accept it themselves — exactly the
-- copy-this-shape extension point 014's own comment called out for
-- "haus invites" when haus_invite was added to notification_type unused.
-- ============================================================

alter type notification_type add value if not exists 'haus_accepted';

create table public.haus_invitations (
  id         uuid primary key default uuid_generate_v4(),
  haus_id    uuid not null references public.hauses(id) on delete cascade,
  inviter_id uuid not null references public.users(id)  on delete cascade,
  invitee_id uuid not null references public.users(id)  on delete cascade,
  status     text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  unique (haus_id, invitee_id)
);

create index idx_haus_invitations_invitee_pending
  on public.haus_invitations (invitee_id) where status = 'pending';

alter table public.haus_invitations enable row level security;

create policy "haus_invitations: invitee or inviter read" on public.haus_invitations
  for select using (auth.uid() = invitee_id or auth.uid() = inviter_id);

-- Only a haus admin can invite someone to that haus.
create policy "haus_invitations: admin insert" on public.haus_invitations
  for insert
  with check (
    auth.uid() = inviter_id
    and exists (
      select 1 from public.haus_memberships m
      where m.haus_id = haus_invitations.haus_id
        and m.user_id = auth.uid()
        and m.role = 'admin'
    )
  );

-- Only the invitee can accept/decline their own invitation.
create policy "haus_invitations: invitee respond" on public.haus_invitations
  for update
  using (auth.uid() = invitee_id)
  with check (auth.uid() = invitee_id);

-- Haus invite sent -> notify the invitee.
create or replace function public.notify_haus_invite()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.notifications (user_id, type, payload)
  values (
    new.invitee_id, 'haus_invite',
    jsonb_build_object(
      'invitation_id', new.id,
      'haus_id',       new.haus_id,
      'haus_name',     (select name from public.hauses where id = new.haus_id),
      'inviter_id',    new.inviter_id,
      'inviter_name',  (select display_name from public.users where id = new.inviter_id)
    )
  );
  return new;
end;
$$;

create trigger trg_notify_haus_invite
  after insert on public.haus_invitations
  for each row execute procedure public.notify_haus_invite();

-- Haus invite accepted or declined -> resolve the invitee's notification;
-- on accept, also tell the inviter who joined.
create or replace function public.resolve_haus_invite()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.status = 'pending' and new.status in ('accepted', 'declined') then
    update public.notifications
       set resolved = true
     where type = 'haus_invite' and payload->>'invitation_id' = new.id::text;

    if new.status = 'accepted' then
      insert into public.notifications (user_id, type, payload)
      values (
        new.inviter_id, 'haus_accepted',
        jsonb_build_object(
          'invitation_id', new.id,
          'haus_id',       new.haus_id,
          'haus_name',     (select name from public.hauses where id = new.haus_id),
          'from_user_id',  new.invitee_id,
          'from_name',     (select display_name from public.users where id = new.invitee_id)
        )
      );
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_resolve_haus_invite
  after update of status on public.haus_invitations
  for each row execute procedure public.resolve_haus_invite();
