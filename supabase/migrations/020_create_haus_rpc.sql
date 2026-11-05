-- ============================================================
-- Creating a haus never made its creator a member. createHaus inserted the
-- hauses row, then the creator's haus_memberships row with role = 'admin' —
-- but 002_security_fixes.sql locks self-inserted memberships to
-- role = 'member', so that second insert was always rejected. Every haus made
-- in the app was left with no members at all, and the app carried on with a
-- local stand-in (a timestamp id), so its invite link, invites and the haus
-- itself (gone after a reload) never worked.
--
-- create_haus does both inserts in one security-definer call, making the
-- caller the admin of the haus they just made, and nothing else.
-- ============================================================

create or replace function public.create_haus(p_name text, p_description text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_haus uuid;
begin
  if v_user is null then
    raise exception 'Not signed in';
  end if;
  if coalesce(btrim(p_name), '') = '' then
    raise exception 'A haus needs a name';
  end if;

  insert into public.hauses (name, description)
  values (btrim(p_name), nullif(btrim(p_description), ''))
  returning id into v_haus;

  -- trg_haus_member_count takes member_count from 0 to 1 here.
  insert into public.haus_memberships (haus_id, user_id, role, joined_at)
  values (v_haus, v_user, 'admin', now());

  return v_haus;
end;
$$;

revoke execute on function public.create_haus(text, text) from public, anon;
grant  execute on function public.create_haus(text, text) to authenticated;
