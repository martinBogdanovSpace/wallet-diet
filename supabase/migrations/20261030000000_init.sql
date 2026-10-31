-- Finance tracker schema: one shared household pot, EUR, amounts in cents.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  name text not null default '',
  created_at timestamptz not null default now()
);

create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  timezone text not null default 'UTC',
  invite_code text not null unique default encode(extensions.gen_random_bytes(6), 'hex'),
  created_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now()
);

-- A user belongs to at most one household.
create table public.members (
  household_id uuid not null references public.households on delete cascade,
  user_id uuid not null unique references auth.users on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (household_id, user_id)
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households on delete cascade,
  name text not null,
  icon text not null default '📦',
  kind text not null check (kind in ('income', 'expense')),
  sort int not null default 0,
  archived boolean not null default false,
  created_at timestamptz not null default now()
);
create index categories_household_idx on public.categories (household_id);

create table public.recurring (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households on delete cascade,
  created_by uuid not null default auth.uid() references auth.users on delete cascade,
  type text not null check (type in ('income', 'expense')),
  amount_cents bigint not null check (amount_cents > 0),
  category_id uuid references public.categories on delete set null,
  method text not null check (method in ('cash', 'card', 'transfer')),
  note text,
  frequency text not null check (frequency in ('weekly', 'monthly')),
  -- For monthly rules: preferred day of month (clamped to month length).
  anchor_day int check (anchor_day between 1 and 31),
  next_date date not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index recurring_household_idx on public.recurring (household_id);

-- type:
--   income / expense : normal entries, counted in monthly totals
--   withdrawal       : ATM withdrawal, moves money into the cash wallet
--   adjustment       : signed correction of the cash wallet (method = cash)
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households on delete cascade,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  type text not null check (type in ('income', 'expense', 'withdrawal', 'adjustment')),
  amount_cents bigint not null,
  category_id uuid references public.categories on delete set null,
  method text not null check (method in ('cash', 'card', 'transfer')),
  occurred_on date not null,
  note text,
  recurring_id uuid references public.recurring on delete set null,
  created_at timestamptz not null default now(),
  constraint amount_sign check (
    (type = 'adjustment' and amount_cents <> 0 and method = 'cash')
    or (type <> 'adjustment' and amount_cents > 0)
  )
);
create index transactions_household_date_idx on public.transactions (household_id, occurred_on desc);

create table public.budgets (
  household_id uuid not null references public.households on delete cascade,
  category_id uuid not null references public.categories on delete cascade,
  monthly_limit_cents bigint not null check (monthly_limit_cents > 0),
  primary key (household_id, category_id)
);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create function public.my_household()
returns uuid
language sql stable security definer set search_path = ''
as $$
  select household_id from public.members where user_id = auth.uid()
$$;

create function public.is_member(hid uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.members where household_id = hid and user_id = auth.uid()
  )
$$;

-- Profile row for every new auth user.
create function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------------

create function public.create_household(p_name text, p_timezone text)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  hid uuid;
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;
  if exists (select 1 from public.members where user_id = auth.uid()) then
    raise exception 'You already belong to a household';
  end if;

  insert into public.households (name, timezone, created_by)
  values (coalesce(nullif(trim(p_name), ''), 'Our household'), coalesce(nullif(p_timezone, ''), 'UTC'), auth.uid())
  returning id into hid;

  insert into public.members (household_id, user_id) values (hid, auth.uid());

  insert into public.categories (household_id, name, icon, kind, sort) values
    (hid, 'Groceries',       '🛒', 'expense', 1),
    (hid, 'Eating out',      '🍽️', 'expense', 2),
    (hid, 'Housing',         '🏠', 'expense', 3),
    (hid, 'Utilities',       '💡', 'expense', 4),
    (hid, 'Transport',       '🚗', 'expense', 5),
    (hid, 'Fuel',            '⛽', 'expense', 6),
    (hid, 'Health',          '💊', 'expense', 7),
    (hid, 'Household',       '🧴', 'expense', 8),
    (hid, 'Clothing',        '👕', 'expense', 9),
    (hid, 'Entertainment',   '🎬', 'expense', 10),
    (hid, 'Subscriptions',   '📱', 'expense', 11),
    (hid, 'Gifts',           '🎁', 'expense', 12),
    (hid, 'Travel',          '✈️', 'expense', 13),
    (hid, 'Other',           '📦', 'expense', 14),
    (hid, 'Salary',          '💼', 'income', 1),
    (hid, 'Bonus',           '💶', 'income', 2),
    (hid, 'Gift received',   '🎁', 'income', 3),
    (hid, 'Other income',    '📈', 'income', 4);

  return hid;
end;
$$;

create function public.join_household(p_code text)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  hid uuid;
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;

  select id into hid from public.households where invite_code = lower(trim(p_code));
  if hid is null then
    raise exception 'Invalid invite code';
  end if;

  if exists (select 1 from public.members where user_id = auth.uid() and household_id = hid) then
    return hid;
  end if;
  if exists (select 1 from public.members where user_id = auth.uid()) then
    raise exception 'You already belong to another household';
  end if;

  insert into public.members (household_id, user_id) values (hid, auth.uid());
  return hid;
end;
$$;

create function public.regenerate_invite_code()
returns text
language plpgsql security definer set search_path = ''
as $$
declare
  code text := encode(extensions.gen_random_bytes(6), 'hex');
begin
  update public.households set invite_code = code where id = public.my_household();
  return code;
end;
$$;

-- Next occurrence of a recurring rule after `d`.
create function public.recurring_next(d date, freq text, anchor int)
returns date
language plpgsql immutable set search_path = ''
as $$
declare
  first_of_next date;
  last_day int;
begin
  if freq = 'weekly' then
    return d + 7;
  end if;
  first_of_next := (date_trunc('month', d) + interval '1 month')::date;
  last_day := extract(day from (first_of_next + interval '1 month - 1 day'))::int;
  return first_of_next + (least(coalesce(anchor, extract(day from d)::int), last_day) - 1);
end;
$$;

-- Posts every due occurrence of the caller's household's recurring rules.
-- Called lazily when the app loads, so no cron job is required.
create function public.process_recurring(p_today date)
returns int
language plpgsql security definer set search_path = ''
as $$
declare
  hid uuid := public.my_household();
  today date := least(p_today, current_date + 1);
  r public.recurring%rowtype;
  posted int := 0;
begin
  if hid is null then
    return 0;
  end if;

  for r in
    select * from public.recurring
    where household_id = hid and active and next_date <= today
    for update
  loop
    while r.next_date <= today loop
      insert into public.transactions
        (household_id, user_id, type, amount_cents, category_id, method, occurred_on, note, recurring_id)
      values
        (hid, r.created_by, r.type, r.amount_cents, r.category_id, r.method, r.next_date, r.note, r.id);
      posted := posted + 1;
      r.next_date := public.recurring_next(r.next_date, r.frequency, r.anchor_day);
    end loop;
    update public.recurring set next_date = r.next_date where id = r.id;
  end loop;

  return posted;
end;
$$;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.profiles     enable row level security;
alter table public.households   enable row level security;
alter table public.members      enable row level security;
alter table public.categories   enable row level security;
alter table public.recurring    enable row level security;
alter table public.transactions enable row level security;
alter table public.budgets      enable row level security;

create policy "profiles: read self and household members" on public.profiles
  for select to authenticated
  using (
    id = auth.uid()
    or exists (
      select 1 from public.members m
      where m.user_id = profiles.id and m.household_id = public.my_household()
    )
  );
create policy "profiles: update self" on public.profiles
  for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy "households: members read" on public.households
  for select to authenticated using (public.is_member(id));
create policy "households: members update" on public.households
  for update to authenticated using (public.is_member(id)) with check (public.is_member(id));

create policy "members: read own household" on public.members
  for select to authenticated using (public.is_member(household_id));
create policy "members: leave" on public.members
  for delete to authenticated using (user_id = auth.uid());

create policy "categories: members all" on public.categories
  for all to authenticated
  using (public.is_member(household_id)) with check (public.is_member(household_id));

create policy "recurring: members all" on public.recurring
  for all to authenticated
  using (public.is_member(household_id)) with check (public.is_member(household_id));

create policy "budgets: members all" on public.budgets
  for all to authenticated
  using (public.is_member(household_id)) with check (public.is_member(household_id));

create policy "transactions: members read" on public.transactions
  for select to authenticated using (public.is_member(household_id));
create policy "transactions: members insert as self" on public.transactions
  for insert to authenticated
  with check (public.is_member(household_id) and user_id = auth.uid());
create policy "transactions: members update" on public.transactions
  for update to authenticated
  using (public.is_member(household_id)) with check (public.is_member(household_id));
create policy "transactions: members delete" on public.transactions
  for delete to authenticated using (public.is_member(household_id));

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

revoke all on all tables in schema public from anon;
grant select, insert, update, delete on all tables in schema public to authenticated;

revoke execute on all functions in schema public from public, anon;
grant execute on function
  public.my_household(),
  public.is_member(uuid),
  public.create_household(text, text),
  public.join_household(text),
  public.regenerate_invite_code(),
  public.recurring_next(date, text, int),
  public.process_recurring(date)
to authenticated;

-- ---------------------------------------------------------------------------
-- Realtime: both phones refresh when the other person adds something
-- ---------------------------------------------------------------------------

alter publication supabase_realtime add table public.transactions;
