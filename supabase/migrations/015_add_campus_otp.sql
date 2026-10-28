-- ============================================================
-- Campus email OTP verification.
--
-- Recovered from the original project: this table and both functions existed
-- there but were created ad-hoc in the SQL Editor and were never captured in
-- a migration, so they didn't exist anywhere in version control. Recreated
-- here from pg_get_functiondef()/information_schema dumps of the original,
-- with send_campus_otp's previously-unfinished email step now implemented
-- (the original left it as "-- TODO: send v_code ... via pg_net", so the
-- campus-verification step never actually emailed a code to anyone).
--
-- Requires, set up once per project (not committed — never put a real API
-- key in a migration file):
--   select vault.create_secret('<resend api key>', 'resend_api_key');
-- ============================================================

create extension if not exists pg_net with schema extensions;

create table public.campus_otp_verifications (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.users(id) on delete cascade,
  school_email  text not null,
  code          text not null,
  expires_at    timestamptz not null default (now() + interval '10 minutes'),
  used_at       timestamptz,
  created_at    timestamptz default now()
);

alter table public.campus_otp_verifications enable row level security;

create policy "Users manage their own OTPs"
on public.campus_otp_verifications
for all
using (auth.uid() = user_id);

create or replace function public.send_campus_otp(p_user_id uuid, p_school_email text)
returns void
language plpgsql
security definer
as $$
declare
  v_code text;
  v_resend_api_key text;
begin
  v_code := lpad(floor(random() * 1000000)::int::text, 6, '0');

  -- Invalidate existing unused codes
  update campus_otp_verifications
    set used_at = now()
    where user_id = p_user_id and school_email = p_school_email and used_at is null;

  -- Store new code
  insert into campus_otp_verifications (user_id, school_email, code)
    values (p_user_id, p_school_email, v_code);

  select decrypted_secret into v_resend_api_key
    from vault.decrypted_secrets
    where name = 'resend_api_key';

  perform net.http_post(
    url := 'https://api.resend.com/emails',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || v_resend_api_key,
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'from', 'Wearhaus <noreply@wearhausofficial.com>',
      'to', jsonb_build_array(p_school_email),
      'subject', 'Your Wearhaus verification code',
      'html',
        '<div style="font-family:-apple-system,BlinkMacSystemFont,Helvetica,Arial,sans-serif;' ||
        'background:#14120C;padding:40px 16px;">' ||
        '<div style="max-width:420px;margin:0 auto;background:#FDFBF4;border:2px solid #14120C;' ||
        'padding:32px;text-align:center;">' ||
        '<p style="font-family:Helvetica,Arial,sans-serif;font-weight:800;font-size:12px;' ||
        'letter-spacing:1px;text-transform:uppercase;color:#7A7762;margin:0 0 16px;">' ||
        'Wearhaus campus verification</p>' ||
        '<p style="font-family:Helvetica,Arial,sans-serif;font-weight:800;font-size:36px;' ||
        'letter-spacing:6px;color:#14120C;margin:0 0 16px;">' || v_code || '</p>' ||
        '<p style="font-size:13px;color:#7A7762;margin:0;">This code expires in 10 minutes.</p>' ||
        '</div></div>'
    )
  );
end;
$$;

create or replace function public.verify_campus_otp(p_user_id uuid, p_school_email text, p_code text)
returns boolean
language plpgsql
security definer
as $$
declare v_valid boolean;
begin
  update campus_otp_verifications
    set used_at = now()
    where user_id = p_user_id
      and school_email = p_school_email
      and code = p_code
      and used_at is null
      and expires_at > now()
  returning true into v_valid;
  return coalesce(v_valid, false);
end;
$$;
