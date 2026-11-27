-- Contact form storage (Step 6b). Run once in the Supabase dashboard: SQL Editor → New query →
-- paste → Run. Written for a project with automatic API access OFF and automatic RLS ON, so
-- every permission the website needs is granted explicitly below, and nothing more.
--
-- The website inserts through a Next.js Server Action (app/actions/contact.ts) using the
-- publishable key, which acts as the `anon` role. Visitors can only ADD messages: no select,
-- update or delete through the API. Read your messages in Table Editor → messages.
-- Keep the CHECK limits in sync with lib/contact.ts.

create table public.messages (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  name        text not null check (char_length(btrim(name)) between 1 and 100),
  email       text not null check (char_length(email) between 3 and 254
                                   and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  message     text not null check (char_length(btrim(message)) between 10 and 5000),
  -- A one-way hash of the sender's IP address (never the address itself), for rate limiting.
  sender_hash text check (sender_hash ~ '^[0-9a-f]{32}$')
);

create index messages_created_at_idx on public.messages (created_at desc);
create index messages_sender_hash_idx on public.messages (sender_hash, created_at desc);

-- Automatic RLS is on in this project; stated explicitly so this file is self-contained.
alter table public.messages enable row level security;

-- Automatic API access is off: grant only what the form needs. The grant is per column, so a
-- visitor can't choose id or created_at. Nothing at all for `authenticated` (no sign-ins here).
revoke all on table public.messages from anon, authenticated;
grant insert (name, email, message, sender_hash) on table public.messages to anon;

-- Insert-only policy. With RLS on and no select/update/delete policies, those stay denied even
-- if a grant were ever added by mistake.
create policy "Visitors can send a message"
  on public.messages
  for insert
  to anon
  with check (true); -- the CHECK constraints above validate each row

-- Spam brake in the database, so it can't be bypassed:
--   * at most 5 messages per sender (hashed IP) per hour,
--   * at most 3 messages per email address per hour,
--   * at most 60 messages per hour overall (a last-resort cap, set high so one spammer can't
--     easily lock everyone else out).
-- A lock makes simultaneous sends wait their turn, so a burst can't slip past the counts. The
-- function runs as its owner (it must count rows anon can't read) and lives in a schema the API
-- doesn't expose.
create schema if not exists private;

create or replace function private.messages_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(hashtext('public.messages rate limit'));

  if new.sender_hash is not null and (select count(*) from public.messages
      where sender_hash = new.sender_hash
        and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  if (select count(*) from public.messages
      where lower(email) = lower(new.email)
        and created_at > now() - interval '1 hour') >= 3 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  if (select count(*) from public.messages
      where created_at > now() - interval '1 hour') >= 60 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

revoke all on function private.messages_rate_limit() from public, anon, authenticated;

create trigger messages_rate_limit
  before insert on public.messages
  for each row execute function private.messages_rate_limit();
