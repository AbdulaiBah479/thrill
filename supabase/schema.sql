-- ============================================================================
-- THRILL database: tables, security rules (RLS) and safe check-in functions.
--
-- HOW TO USE: create a NEW Supabase project, open "SQL editor", paste this file, Run.
-- Then make yourself admin (see the end of this file).
--
-- STATUS: written but NOT yet run against a real database. Run it on a fresh test
-- project first and fix anything Supabase reports before using real data.
--
-- THE IDEA: the app (browser) is never trusted. Every rule below is enforced by the
-- database itself, so a clever user cannot give themselves admin, read other people's
-- tickets, or mark a ticket as used twice.
-- ============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- profiles ---
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  role        text not null default 'buyer' check (role in ('buyer', 'organizer', 'admin')),
  full_name   text check (char_length(full_name) <= 80),
  phone       text check (char_length(phone) <= 20),
  created_at  timestamptz not null default now()
);

-- Is the signed-in user a THRILL admin? Used by almost every rule below.
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- Every new sign-up gets a normal buyer profile. Nobody can sign up as admin.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Only an admin (or you, in the SQL editor) can change a role.
create or replace function public.block_role_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.role is distinct from old.role and auth.uid() is not null and not public.is_admin() then
    raise exception 'Only an admin can change roles' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger profiles_block_role_change before update on public.profiles
  for each row execute function public.block_role_change();

alter table public.profiles enable row level security;
create policy "profiles: read own or admin" on public.profiles for select
  using (id = auth.uid() or public.is_admin());
create policy "profiles: update own" on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid());
create policy "profiles: admin all" on public.profiles for all
  using (public.is_admin()) with check (public.is_admin());

-- -------------------------------------------------------------- organizers ---
create table public.organizers (
  user_id        uuid primary key references public.profiles(id) on delete cascade,
  business_name  text not null check (char_length(business_name) between 3 and 80),
  phone          text not null check (char_length(phone) between 8 and 20),
  id_type        text not null,
  id_doc_path    text,                       -- file in the PRIVATE 'id-docs' bucket, never public
  about          text not null check (char_length(about) between 15 and 500),
  status         text not null default 'pending' check (status in ('pending', 'verified', 'rejected')),
  review_note    text,
  reviewed_by    uuid references public.profiles(id),
  reviewed_at    timestamptz,
  created_at     timestamptz not null default now()
);

create or replace function public.organizer_verified(uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.organizers where user_id = uid and status = 'verified');
$$;

alter table public.organizers enable row level security;
create policy "organizers: read own or admin" on public.organizers for select
  using (user_id = auth.uid() or public.is_admin());
-- An applicant can only ever create or re-submit a PENDING application. Only admins verify.
create policy "organizers: apply" on public.organizers for insert
  with check (user_id = auth.uid() and status = 'pending');
create policy "organizers: reapply" on public.organizers for update
  using (user_id = auth.uid() and status in ('pending', 'rejected'))
  with check (user_id = auth.uid() and status = 'pending');
create policy "organizers: admin all" on public.organizers for all
  using (public.is_admin()) with check (public.is_admin());

-- ------------------------------------------------------------------ events ---
create table public.events (
  id           text primary key check (id ~ '^[A-Z0-9]{3,6}$'),   -- ticket code prefix, e.g. SUM
  organizer_id uuid not null references public.organizers(user_id) on delete cascade,
  title        text not null check (char_length(title) between 3 and 60),
  area         text not null check (char_length(area) <= 80),
  city         text not null,
  category     text not null,
  starts_at    timestamptz not null,
  duration_h   int not null default 4 check (duration_h between 1 and 24),
  capacity     int not null check (capacity between 1 and 100000),
  reentry      boolean not null default true,
  blurb        text check (char_length(blurb) <= 300),
  photo_url    text,
  lat          double precision,
  lng          double precision,
  status       text not null default 'draft' check (status in ('draft', 'live', 'suspended', 'cancelled')),
  created_at   timestamptz not null default now()
);

alter table public.events enable row level security;
-- Everyone can see LIVE events from VERIFIED organizers. Nothing else is public.
create policy "events: public sees live" on public.events for select
  using (status = 'live' and public.organizer_verified(organizer_id));
create policy "events: owner reads own" on public.events for select
  using (organizer_id = auth.uid());
create policy "events: verified owner creates" on public.events for insert
  with check (organizer_id = auth.uid() and public.organizer_verified(auth.uid()) and status in ('draft', 'live'));
-- A suspended event cannot be edited or un-suspended by its owner. Only an admin can.
create policy "events: owner edits" on public.events for update
  using (organizer_id = auth.uid() and status <> 'suspended')
  with check (organizer_id = auth.uid() and status in ('draft', 'live', 'cancelled'));
create policy "events: admin all" on public.events for all
  using (public.is_admin()) with check (public.is_admin());

create table public.ticket_types (
  id        uuid primary key default gen_random_uuid(),
  event_id  text not null references public.events(id) on delete cascade,
  name      text not null check (char_length(name) <= 30),
  price_nle int not null check (price_nle >= 0),
  perk      text
);
alter table public.ticket_types enable row level security;
create policy "ticket_types: read with event" on public.ticket_types for select
  using (exists (select 1 from public.events e where e.id = event_id
                 and ((e.status = 'live' and public.organizer_verified(e.organizer_id)) or e.organizer_id = auth.uid())));
create policy "ticket_types: owner writes" on public.ticket_types for all
  using (exists (select 1 from public.events e where e.id = event_id and e.organizer_id = auth.uid() and e.status <> 'suspended'))
  with check (exists (select 1 from public.events e where e.id = event_id and e.organizer_id = auth.uid() and e.status <> 'suspended'));
create policy "ticket_types: admin all" on public.ticket_types for all
  using (public.is_admin()) with check (public.is_admin());

-- Promoters: people an organizer lets scan tickets for one event.
create table public.event_staff (
  event_id text not null references public.events(id) on delete cascade,
  user_id  uuid not null references public.profiles(id) on delete cascade,
  gate     text not null check (gate in ('entry', 'exit')),   -- a promoter works ONE gate only
  primary key (event_id, user_id)
);
alter table public.event_staff enable row level security;
create policy "staff: owner manages" on public.event_staff for all
  using (exists (select 1 from public.events e where e.id = event_id and e.organizer_id = auth.uid()))
  with check (exists (select 1 from public.events e where e.id = event_id and e.organizer_id = auth.uid()));
create policy "staff: read own" on public.event_staff for select using (user_id = auth.uid());
create policy "staff: admin all" on public.event_staff for all
  using (public.is_admin()) with check (public.is_admin());

-- 'manager' = the organizer or an admin, 'entry' / 'exit' = a promoter locked to that gate, null = no access.
create or replace function public.staff_role(p_event text)
returns text language sql stable security definer set search_path = public as $$
  select case
    when public.is_admin() then 'manager'
    when exists (select 1 from public.events e where e.id = p_event and e.organizer_id = auth.uid()) then 'manager'
    else (select s.gate from public.event_staff s where s.event_id = p_event and s.user_id = auth.uid())
  end;
$$;

create or replace function public.is_event_staff(p_event text)
returns boolean language sql stable security definer set search_path = public as $$
  select public.staff_role(p_event) is not null;
$$;

-- ----------------------------------------------------------------- tickets ---
create table public.tickets (
  code          text primary key check (code ~ '^[A-Z0-9]{3,6}-[A-Z0-9]{4}-[A-Z0-9]{4}$'),
  event_id      text not null references public.events(id),
  ticket_type   uuid references public.ticket_types(id),
  buyer_id      uuid references public.profiles(id),          -- null for door sales
  price_nle     int not null check (price_nle >= 0),
  method        text not null,                                -- Afrimoney, Orange Money, Door sale, Free ...
  status        text not null default 'PAID' check (status in ('PAID', 'IN', 'OUT', 'CANCELLED', 'REFUNDED')),
  gift_code     text unique,
  rating        smallint check (rating between 1 and 5),
  entries       int not null default 0,        -- admissions so far (first entry + re-entries)
  first_in_at   timestamptz,
  last_in_at    timestamptz,
  last_out_at   timestamptz,
  created_at    timestamptz not null default now()
);
create index tickets_event_idx on public.tickets(event_id);
create index tickets_buyer_idx on public.tickets(buyer_id);

alter table public.tickets enable row level security;
-- Buyers see only their own tickets. Organizers see tickets for their events. No one writes directly:
-- tickets are created by the payment webhook (service role) and changed only by the functions below.
create policy "tickets: buyer reads own" on public.tickets for select using (buyer_id = auth.uid());
create policy "tickets: staff read event" on public.tickets for select using (public.is_event_staff(event_id));
create policy "tickets: admin read" on public.tickets for select using (public.is_admin());
-- The only direct change a buyer may make: rate a ticket they own that was used.
create policy "tickets: buyer rates" on public.tickets for update
  using (buyer_id = auth.uid() and status in ('IN', 'OUT'))
  with check (buyer_id = auth.uid());

create table public.scan_log (
  id         bigserial primary key,
  code       text not null,
  event_id   text,
  action     text not null,        -- ADMIT, REENTRY, EXIT, ALREADY_INSIDE, NO_REENTRY, TOO_SOON, STALE, ...
  scanned_by uuid,
  how        text,                 -- live (refreshing phone QR), static (printed/wristband), typed, override
  gate       text,                 -- entry or exit
  note       text,                 -- override reason
  at         timestamptz not null default now()
);
alter table public.scan_log enable row level security;
create policy "scan_log: staff read" on public.scan_log for select
  using (event_id is not null and public.is_event_staff(event_id));
create policy "scan_log: admin read" on public.scan_log for select using (public.is_admin());

-- -------------------------------------------------- wristbands, print orders ---
create table public.print_orders (
  id           text primary key,
  event_id     text not null references public.events(id) on delete cascade,
  qty          int not null check (qty between 1 and 5000),
  style        text not null check (style in ('wristband', 'ticket')),
  status       text not null default 'requested'
               check (status in ('requested', 'approved', 'printing', 'ready', 'delivered', 'declined')),
  requested_by uuid not null references public.profiles(id),
  created_at   timestamptz not null default now()
);
alter table public.print_orders enable row level security;
create policy "orders: owner reads" on public.print_orders for select
  using (exists (select 1 from public.events e where e.id = event_id and e.organizer_id = auth.uid()));
create policy "orders: owner requests" on public.print_orders for insert
  with check (requested_by = auth.uid() and status = 'requested'
              and exists (select 1 from public.events e where e.id = event_id and e.organizer_id = auth.uid()));
create policy "orders: admin all" on public.print_orders for all
  using (public.is_admin()) with check (public.is_admin());

create table public.wristbands (
  code      text primary key check (code ~ '^[A-Z0-9]{3,6}-[A-Z0-9]{4}-[A-Z0-9]{4}$'),
  event_id  text not null references public.events(id) on delete cascade,
  order_id  text not null references public.print_orders(id) on delete cascade,
  state     text not null default 'STOCK' check (state in ('STOCK', 'ACTIVE'))
);
alter table public.wristbands enable row level security;
create policy "wristbands: staff read" on public.wristbands for select using (public.is_event_staff(event_id));
create policy "wristbands: admin all" on public.wristbands for all
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------- reports, audit ---
create table public.reports (
  id         bigserial primary key,
  event_id   text not null references public.events(id) on delete cascade,
  reporter   uuid references public.profiles(id),
  reason     text not null check (reason in ('Looks like a scam', 'Wrong info', 'Event cancelled', 'Unsafe / illegal')),
  created_at timestamptz not null default now()
);
alter table public.reports enable row level security;
create policy "reports: anyone signed in can report" on public.reports for insert
  with check (reporter = auth.uid());
create policy "reports: admin reads" on public.reports for select using (public.is_admin());
create policy "reports: admin deletes" on public.reports for delete using (public.is_admin());

create table public.audit_log (
  id     bigserial primary key,
  actor  uuid,
  action text not null,
  at     timestamptz not null default now()
);
alter table public.audit_log enable row level security;
create policy "audit: admin reads" on public.audit_log for select using (public.is_admin());
-- no insert/update/delete policy on purpose: only the functions below (and your server) can write it,
-- so nobody can erase their tracks.

-- ============================================================================
-- PASS TOKENS. The QR on a buyer's phone is signed by the database and changes every 30 seconds,
-- so a screenshot, an old photo or an invented code is refused at the gate.
-- One-time setup (SQL editor, as owner):
--   insert into public.app_secrets(key, value) values ('pass_secret', encode(gen_random_bytes(32), 'hex'));
-- ============================================================================
create table public.app_secrets (key text primary key, value text not null);
alter table public.app_secrets enable row level security;   -- no policies: nobody can read it except the functions below

create or replace function public.pass_sig(p_code text, p_slot bigint)
returns text language sql stable security definer set search_path = public, extensions as $$
  select substr(encode(hmac(p_code || ':' || p_slot::text, (select value from public.app_secrets where key = 'pass_secret'), 'sha256'), 'hex'), 1, 12);
$$;
revoke all on function public.pass_sig(text, bigint) from public, anon, authenticated;

-- A buyer asks for a fresh token for THEIR OWN ticket (the app calls this every 30 seconds while online).
create or replace function public.make_pass_token(p_code text)
returns text language plpgsql security definer set search_path = public as $$
declare c text := upper(trim(p_code)); slot bigint := floor(extract(epoch from now()) / 30)::bigint;
begin
  if not exists (select 1 from public.tickets where code = c and buyer_id = auth.uid()) then
    raise exception 'Not your ticket' using errcode = '42501';
  end if;
  return 'THRILL:' || c || ':' || slot || ':' || public.pass_sig(c, slot);
end $$;
revoke all on function public.make_pass_token(text) from public, anon;
grant execute on function public.make_pass_token(text) to authenticated;

-- ============================================================================
-- SAFE CHECK-IN. The browser asks; the database decides.
--
-- The fraud this stops: a dishonest promoter marks a guest as "out" while they are still inside,
-- so the same ticket (or a copy) can bring a second person in. Each rule closes one route:
--   1. Gate lock      Entry promoters cannot record exits. Exit promoters cannot admit. (staff_role)
--   2. Live proof     An exit needs the guest's live phone code or a wristband scan. A typed code is not enough.
--   3. Minimum stay   Nobody can be let out within 2 minutes of entering.
--   4. Cooldown       After leaving, nobody can come back for 2 minutes (stops handing a ticket over the fence).
--   5. Entry cap      A ticket can be admitted at most 4 times.
--   6. Fresh codes    A phone code must be under about a minute old and correctly signed.
--   7. Manager only   Rules 2-4 can only be waived by the organizer or an admin, with a reason. Promoters cannot.
--   8. Row lock       The ticket row is locked while it is checked, so two simultaneous scans cannot both win.
--   9. Everything is written to scan_log with who, how and why, and nobody can edit that log.
-- p_commit = false -> only look.  p_commit = true -> really admit / let out.
-- ============================================================================
create or replace function public.scan_entry(
  p_code text, p_commit boolean default false,
  p_slot bigint default null, p_sig text default null, p_typed boolean default false,
  p_override_reason text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  c text := upper(trim(p_code));
  t public.tickets%rowtype;
  w public.wristbands%rowtype;
  ev public.events%rowtype;
  who text; how text; res text;
  now_slot bigint := floor(extract(epoch from now()) / 30)::bigint;
begin
  if auth.uid() is null then raise exception 'Sign in required' using errcode = '42501'; end if;
  how := case when p_typed then 'typed' when p_slot is null then 'static' else 'live' end;

  select * into t from public.tickets where code = c for update;           -- rule 8
  if not found then
    select * into w from public.wristbands where code = c;
    if found and w.state = 'STOCK' then
      who := public.staff_role(w.event_id);
      if who is null or who = 'exit' then raise exception 'Not allowed' using errcode = '42501'; end if;
      insert into public.scan_log(code, event_id, action, scanned_by, how, gate) values (c, w.event_id, 'NOT_ACTIVATED', auth.uid(), how, 'entry');
      return jsonb_build_object('result', 'NOT_ACTIVATED', 'event_id', w.event_id);
    end if;
    insert into public.scan_log(code, event_id, action, scanned_by, how, gate) values (c, null, 'NOT_FOUND', auth.uid(), how, 'entry');
    return jsonb_build_object('result', 'NOT_FOUND');
  end if;

  who := public.staff_role(t.event_id);
  if who is null then raise exception 'Not allowed' using errcode = '42501'; end if;
  if who = 'exit' then raise exception 'Exit-gate staff cannot admit' using errcode = '42501'; end if;      -- rule 1
  if p_override_reason is not null and who <> 'manager' then
    raise exception 'Only the organizer can override' using errcode = '42501';                               -- rule 7
  end if;

  if how = 'live' and (abs(now_slot - p_slot) > 1 or p_sig is distinct from public.pass_sig(c, p_slot)) then  -- rule 6
    insert into public.scan_log(code, event_id, action, scanned_by, how, gate) values (c, t.event_id, 'STALE', auth.uid(), how, 'entry');
    return jsonb_build_object('result', 'STALE');
  end if;

  select * into ev from public.events where id = t.event_id;
  if t.status = 'PAID' then
    res := 'ADMIT';
  elsif t.status = 'IN' then
    res := 'ALREADY_INSIDE';
  elsif t.status = 'OUT' then
    if not ev.reentry then res := 'NO_REENTRY';
    elsif t.entries >= 4 then res := 'MAX_ENTRIES';                                                          -- rule 5
    elsif p_override_reason is null and now() - t.last_out_at < interval '2 minutes' then res := 'TOO_SOON';  -- rule 4
    elsif p_override_reason is null and how = 'typed' then res := 'MANAGER_APPROVAL';
    else res := 'REENTRY';
    end if;
  else
    res := 'VOID';                                                                                           -- cancelled or refunded
  end if;

  if p_commit and res in ('ADMIT', 'REENTRY') then
    update public.tickets
       set status = 'IN', entries = entries + 1, first_in_at = coalesce(first_in_at, now()), last_in_at = now()
     where code = c;
  end if;
  if p_commit or res not in ('ADMIT', 'REENTRY') then
    insert into public.scan_log(code, event_id, action, scanned_by, how, gate, note)
      values (c, t.event_id, case when p_commit and res in ('ADMIT', 'REENTRY') then res else 'DENIED_' || res end,
              auth.uid(), case when p_override_reason is not null then 'override' else how end, 'entry', p_override_reason);
  end if;
  return jsonb_build_object('result', res, 'event_id', t.event_id, 'tier', t.ticket_type);
end $$;

create or replace function public.scan_exit(
  p_code text, p_commit boolean default false,
  p_slot bigint default null, p_sig text default null, p_typed boolean default false,
  p_override_reason text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  c text := upper(trim(p_code));
  t public.tickets%rowtype;
  who text; how text; res text;
  now_slot bigint := floor(extract(epoch from now()) / 30)::bigint;
begin
  if auth.uid() is null then raise exception 'Sign in required' using errcode = '42501'; end if;
  how := case when p_typed then 'typed' when p_slot is null then 'static' else 'live' end;

  select * into t from public.tickets where code = c for update;
  if not found then return jsonb_build_object('result', 'NOT_FOUND'); end if;

  who := public.staff_role(t.event_id);
  if who is null then raise exception 'Not allowed' using errcode = '42501'; end if;
  if who = 'entry' then raise exception 'Entry-gate staff cannot record exits' using errcode = '42501'; end if;   -- rule 1
  if p_override_reason is not null and who <> 'manager' then
    raise exception 'Only the organizer can override' using errcode = '42501';                                    -- rule 7
  end if;

  if how = 'live' and (abs(now_slot - p_slot) > 1 or p_sig is distinct from public.pass_sig(c, p_slot)) then
    insert into public.scan_log(code, event_id, action, scanned_by, how, gate) values (c, t.event_id, 'STALE', auth.uid(), how, 'exit');
    return jsonb_build_object('result', 'STALE');
  end if;

  if t.status <> 'IN' then
    res := 'NOT_INSIDE';
  elsif p_override_reason is null and how = 'typed' then
    res := 'MANAGER_APPROVAL';                                                                                    -- rule 2
  elsif p_override_reason is null and now() - t.last_in_at < interval '2 minutes' then
    res := 'MANAGER_APPROVAL';                                                                                    -- rule 3
  else
    res := 'LET_OUT';
  end if;

  if p_commit and res = 'LET_OUT' then
    update public.tickets set status = 'OUT', last_out_at = now() where code = c;
  end if;
  if p_commit or res <> 'LET_OUT' then
    insert into public.scan_log(code, event_id, action, scanned_by, how, gate, note)
      values (c, t.event_id, case when p_commit and res = 'LET_OUT' then 'EXIT' else 'DENIED_' || res end,
              auth.uid(), case when p_override_reason is not null then 'override' else how end, 'exit', p_override_reason);
  end if;
  return jsonb_build_object('result', res, 'event_id', t.event_id);
end $$;

-- A blank wristband becomes a real, used ticket only when entry staff or the organizer records a door sale.
create or replace function public.activate_wristband(p_code text, p_ticket_type uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare c text := upper(trim(p_code)); w public.wristbands%rowtype; tt public.ticket_types%rowtype; who text;
begin
  if auth.uid() is null then raise exception 'Sign in required' using errcode = '42501'; end if;
  select * into w from public.wristbands where code = c for update;
  if not found or w.state <> 'STOCK' then return jsonb_build_object('result', 'NOT_AVAILABLE'); end if;
  who := public.staff_role(w.event_id);
  if who is null or who = 'exit' then raise exception 'Not allowed' using errcode = '42501'; end if;
  select * into tt from public.ticket_types where id = p_ticket_type and event_id = w.event_id;
  if not found then raise exception 'Unknown ticket type'; end if;
  update public.wristbands set state = 'ACTIVE' where code = c;
  insert into public.tickets(code, event_id, ticket_type, buyer_id, price_nle, method, status, entries, first_in_at, last_in_at)
    values (c, w.event_id, tt.id, null, tt.price_nle, 'Door sale', 'IN', 1, now(), now());
  insert into public.scan_log(code, event_id, action, scanned_by, how, gate) values (c, w.event_id, 'DOOR_SALE', auth.uid(), 'static', 'entry');
  return jsonb_build_object('result', 'ACTIVATED', 'price_nle', tt.price_nle);
end $$;

-- Only signed-in users may call these. Anonymous visitors may not.
revoke all on function public.scan_entry(text, boolean, bigint, text, boolean, text) from public, anon;
revoke all on function public.scan_exit(text, boolean, bigint, text, boolean, text) from public, anon;
revoke all on function public.activate_wristband(text, uuid) from public, anon;
grant execute on function public.scan_entry(text, boolean, bigint, text, boolean, text) to authenticated;
grant execute on function public.scan_exit(text, boolean, bigint, text, boolean, text) to authenticated;
grant execute on function public.activate_wristband(text, uuid) to authenticated;

-- ============================================================================
-- PRIVATE STORAGE for ID photos. Only the owner can upload to their own folder and only
-- the owner or an admin can read. The bucket is NOT public.
-- ============================================================================
insert into storage.buckets (id, name, public) values ('id-docs', 'id-docs', false)
  on conflict (id) do nothing;
create policy "id-docs: owner uploads to own folder" on storage.objects for insert
  with check (bucket_id = 'id-docs' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "id-docs: owner or admin reads" on storage.objects for select
  using (bucket_id = 'id-docs' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));

-- ============================================================================
-- MAKE YOURSELF ADMIN (do this ONCE, in the SQL editor, after you have signed up in the app):
--   update public.profiles set role = 'admin' where id = (select id from auth.users where email = 'YOUR_EMAIL');
-- Also turn ON two-factor login for your account in Supabase Auth settings.
-- ============================================================================
