-- Thechatbox Supabase schema
-- Apply in Supabase SQL editor, then set environment variables in .env.

create extension if not exists pgcrypto;

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  full_name text,
  avatar_url text,
  bio text default '',
  role text not null default 'user',
  banned boolean not null default false,
  ban_reason text default '',
  theme text default 'matrix',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists servers (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  description text,
  is_public boolean not null default true,
  owner_email text,
  is_main boolean not null default false,
  icon text,
  member_count integer not null default 1,
  invite_token text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists channels (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  description text,
  category text not null default 'text',
  server_id text not null,
  daily_room_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists messages (
  id text primary key default gen_random_uuid()::text,
  channel_id text not null,
  content text not null,
  author_name text,
  author_email text,
  bridge_source text not null default 'chatbox',
  message_type text not null default 'text',
  code_language text,
  file_url text,
  file_name text,
  file_type text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists code_snippets (
  id text primary key default gen_random_uuid()::text,
  title text not null,
  language text not null default 'python',
  code text not null,
  author_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists direct_messages (
  id text primary key default gen_random_uuid()::text,
  conversation_id text not null,
  from_email text not null,
  from_name text,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists friend_requests (
  id text primary key default gen_random_uuid()::text,
  from_email text not null,
  from_name text,
  to_email text not null,
  to_name text,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (from_email, to_email)
);

create table if not exists guest_sessions (
  id text primary key default gen_random_uuid()::text,
  guest_id text not null,
  display_name text not null,
  session_token text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists phone_numbers (
  id text primary key default gen_random_uuid()::text,
  user_email text not null,
  user_name text,
  number text not null,
  real_number text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_email),
  unique (number)
);

create table if not exists phone_calls (
  id text primary key default gen_random_uuid()::text,
  caller_email text not null,
  caller_name text,
  caller_number text,
  callee_email text not null,
  callee_name text,
  callee_number text,
  status text not null default 'ringing',
  offer_sdp text,
  answer_sdp text,
  caller_ice text,
  callee_ice text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists server_members (
  id text primary key default gen_random_uuid()::text,
  server_id text not null,
  user_email text not null,
  display_name text,
  role text not null default 'member',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (server_id, user_email)
);

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace trigger profiles_set_updated_at before update on profiles for each row execute function set_updated_at();
create or replace trigger servers_set_updated_at before update on servers for each row execute function set_updated_at();
create or replace trigger channels_set_updated_at before update on channels for each row execute function set_updated_at();
create or replace trigger messages_set_updated_at before update on messages for each row execute function set_updated_at();
create or replace trigger code_snippets_set_updated_at before update on code_snippets for each row execute function set_updated_at();
create or replace trigger direct_messages_set_updated_at before update on direct_messages for each row execute function set_updated_at();
create or replace trigger friend_requests_set_updated_at before update on friend_requests for each row execute function set_updated_at();
create or replace trigger guest_sessions_set_updated_at before update on guest_sessions for each row execute function set_updated_at();
create or replace trigger phone_numbers_set_updated_at before update on phone_numbers for each row execute function set_updated_at();
create or replace trigger phone_calls_set_updated_at before update on phone_calls for each row execute function set_updated_at();
create or replace trigger server_members_set_updated_at before update on server_members for each row execute function set_updated_at();

-- Development-friendly RLS policies.
-- Tighten these if you need production-grade authorization boundaries.
alter table profiles enable row level security;
alter table servers enable row level security;
alter table channels enable row level security;
alter table messages enable row level security;
alter table code_snippets enable row level security;
alter table direct_messages enable row level security;
alter table friend_requests enable row level security;
alter table guest_sessions enable row level security;
alter table phone_numbers enable row level security;
alter table phone_calls enable row level security;
alter table server_members enable row level security;

drop policy if exists "profiles_all" on profiles;
create policy "profiles_all" on profiles for all using (true) with check (true);

drop policy if exists "servers_all" on servers;
create policy "servers_all" on servers for all using (true) with check (true);

drop policy if exists "channels_all" on channels;
create policy "channels_all" on channels for all using (true) with check (true);

drop policy if exists "messages_all" on messages;
create policy "messages_all" on messages for all using (true) with check (true);

drop policy if exists "code_snippets_all" on code_snippets;
create policy "code_snippets_all" on code_snippets for all using (true) with check (true);

drop policy if exists "direct_messages_all" on direct_messages;
create policy "direct_messages_all" on direct_messages for all using (true) with check (true);

drop policy if exists "friend_requests_all" on friend_requests;
create policy "friend_requests_all" on friend_requests for all using (true) with check (true);

drop policy if exists "guest_sessions_all" on guest_sessions;
create policy "guest_sessions_all" on guest_sessions for all using (true) with check (true);

drop policy if exists "phone_numbers_all" on phone_numbers;
create policy "phone_numbers_all" on phone_numbers for all using (true) with check (true);

drop policy if exists "phone_calls_all" on phone_calls;
create policy "phone_calls_all" on phone_calls for all using (true) with check (true);

drop policy if exists "server_members_all" on server_members;
create policy "server_members_all" on server_members for all using (true) with check (true);

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'guest_sessions'
  ) then
    alter publication supabase_realtime add table guest_sessions;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'phone_calls'
  ) then
    alter publication supabase_realtime add table phone_calls;
  end if;
end $$;
