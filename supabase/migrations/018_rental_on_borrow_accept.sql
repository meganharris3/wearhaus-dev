-- ============================================================
-- Create the rental when a borrow request is accepted.
--
-- Accepting a request (from Notifications or the chat thread) only ever
-- flipped messages.payload.status to 'accepted' — nothing wrote a rentals
-- row, and the Borrows/Lending dashboard reads only from rentals, so
-- accepted borrows never appeared anywhere. borrowService.createRental()
-- existed but had no callers, and couldn't have worked from the accept
-- path anyway: rentals only allows the *borrower* to insert, while it's the
-- *lender* who accepts.
--
-- A security-definer trigger on the same payload update that already
-- resolves the borrow_request notification (014) fixes both: it runs no
-- matter where the accept came from, and it can write the row for both
-- parties. Requests sent before the app started including startDateISO /
-- endDateISO / itemId are skipped — their dates are display strings like
-- 'Nov 3' with no year, which can't be turned into a real date.
-- ============================================================

create or replace function public.create_rental_on_borrow_accept()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_start    date;
  v_end      date;
  v_item     uuid;
  v_borrower uuid;
  v_lender   uuid;
  v_status   rental_status;
begin
  if new.type <> 'borrow_request'
     or new.payload->>'status' is not distinct from old.payload->>'status'
     or new.payload->>'status' <> 'accepted' then
    return new;
  end if;

  if new.payload->>'startDateISO' is null or new.payload->>'endDateISO' is null then
    return new; -- pre-ISO request: no reliable dates to build a rental from
  end if;

  v_start    := (new.payload->>'startDateISO')::date;
  v_end      := (new.payload->>'endDateISO')::date;
  v_borrower := coalesce((new.payload->>'borrowerId')::uuid, new.sender_id);

  select coalesce((new.payload->>'itemId')::uuid, t.item_id),
         coalesce((new.payload->>'lenderId')::uuid,
                  case when t.user_a = v_borrower then t.user_b else t.user_a end)
    into v_item, v_lender
    from public.threads t
   where t.id = new.thread_id;

  if v_item is null or v_lender is null then
    return new;
  end if;

  -- Idempotent: re-saving an already-accepted payload mustn't create a second rental.
  if exists (
    select 1 from public.rentals
     where thread_id = new.thread_id::text
       and item_id = v_item and start_date = v_start and end_date = v_end
       and status <> 'cancelled'
  ) then
    return new;
  end if;

  v_status := case when v_start <= current_date then 'active' else 'upcoming' end;

  insert into public.rentals (
    item_id, borrower_id, lender_id, status, price_per_day,
    start_date, end_date, thread_id, pickup_method, accepted_at
  ) values (
    v_item, v_borrower, v_lender, v_status,
    round(coalesce((new.payload->>'pricePerDay')::numeric, 0) * 100)::integer,
    v_start, v_end, new.thread_id::text, new.payload->>'pickupMethod', now()
  );

  -- trg_rental_item_status (009) only fires on update, so mirror it for a rental
  -- that starts out active.
  if v_status = 'active' then
    update public.items set status = 'lent', updated_at = now() where id = v_item;
  end if;

  return new;
end;
$$;

create trigger trg_create_rental_on_borrow_accept
  after update of payload on public.messages
  for each row execute procedure public.create_rental_on_borrow_accept();
