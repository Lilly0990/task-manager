-- Clients table
create table clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  token uuid unique default gen_random_uuid(),
  created_at timestamptz default now(),
  last_notified_at timestamptz
);

-- Tasks table
create table tasks (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete cascade,
  title text not null,
  description text,
  is_done boolean default false,
  created_at timestamptz default now()
);

-- Settings table (for admin password and other config)
create table settings (
  key text primary key,
  value text not null
);

-- Default admin password
insert into settings (key, value) values ('admin_password', 'qwerty12');
