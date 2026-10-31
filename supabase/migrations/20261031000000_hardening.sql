-- Hardening and speed-ups after the first review.
-- Run this once in the Supabase SQL editor after 20261030000000_init.sql.

-- ---------------------------------------------------------------------------
-- Recurring entries: post them once a day, and never in unbounded batches
-- ---------------------------------------------------------------------------

alter table public.households add column if not exists recurring_checked_on date;

-- Same as before, but each rule posts at most 60 occurrences per call, so a
-- mistyped start date can't flood the table. Any rest follows on the next call.
create or replace function public.process_recurring(p_today date)
returns int
language plpgsql security definer set search_path = ''
as $$
declare
  hid uuid := public.my_household();
  today date := least(p_today, current_date + 1);
  r public.recurring%rowtype;
  posted int := 0;
  n int;
begin
  if hid is null then
    return 0;
  end if;

  for r in
    select * from public.recurring
    where household_id = hid and active and next_date <= today
    for update
  loop
    n := 0;
    while r.next_date <= today and n < 60 loop
      insert into public.transactions
        (household_id, user_id, type, amount_cents, category_id, method, occurred_on, note, recurring_id)
      values
        (hid, r.created_by, r.type, r.amount_cents, r.category_id, r.method, r.next_date, r.note, r.id);
      posted := posted + 1;
      n := n + 1;
      r.next_date := public.recurring_next(r.next_date, r.frequency, r.anchor_day);
    end loop;
    update public.recurring set next_date = r.next_date where id = r.id;
  end loop;

  return posted;
end;
$$;

-- ---------------------------------------------------------------------------
-- One round trip for what every page needs
-- ---------------------------------------------------------------------------

-- The caller's household, its members and today's date in the household's
-- timezone; null when the caller has no household yet. Posts due recurring
-- entries the first time it runs on a given day.
create or replace function public.app_context()
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  h public.households%rowtype;
  today date;
begin
  select hh.* into h
  from public.households hh
  join public.members m on m.household_id = hh.id
  where m.user_id = auth.uid();
  if not found then
    return null;
  end if;

  today := (now() at time zone h.timezone)::date;
  if h.recurring_checked_on is distinct from today then
    perform public.process_recurring(today);
    update public.households set recurring_checked_on = today where id = h.id;
  end if;

  return jsonb_build_object(
    'household', jsonb_build_object(
      'id', h.id, 'name', h.name, 'timezone', h.timezone, 'invite_code', h.invite_code
    ),
    'today', today,
    'members', coalesce((
      select jsonb_agg(jsonb_build_object('id', p.id, 'name', p.name) order by m.joined_at)
      from public.members m
      join public.profiles p on p.id = m.user_id
      where m.household_id = h.id
    ), '[]'::jsonb)
  );
end;
$$;

-- Cash on hand: cash income + ATM withdrawals + adjustments − cash expenses.
-- Summed here because the API returns at most 1000 rows per request.
create or replace function public.cash_balance()
returns bigint
language sql stable security definer set search_path = ''
as $$
  select coalesce(sum(case when type = 'expense' then -amount_cents else amount_cents end), 0)::bigint
  from public.transactions
  where household_id = public.my_household()
    and (method = 'cash' or type = 'withdrawal')
$$;

-- ---------------------------------------------------------------------------
-- Categories must belong to the same household as the row using them
-- ---------------------------------------------------------------------------

create or replace function public.check_category_household()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.category_id is not null and not exists (
    select 1 from public.categories c
    where c.id = new.category_id and c.household_id = new.household_id
  ) then
    raise exception 'Category does not belong to this household';
  end if;
  return new;
end;
$$;

drop trigger if exists transactions_category_household on public.transactions;
create trigger transactions_category_household
  before insert or update of category_id, household_id on public.transactions
  for each row execute function public.check_category_household();

drop trigger if exists recurring_category_household on public.recurring;
create trigger recurring_category_household
  before insert or update of category_id, household_id on public.recurring
  for each row execute function public.check_category_household();

drop trigger if exists budgets_category_household on public.budgets;
create trigger budgets_category_household
  before insert or update of category_id, household_id on public.budgets
  for each row execute function public.check_category_household();

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

revoke execute on function
  public.app_context(),
  public.cash_balance(),
  public.check_category_household()
from public, anon;
grant execute on function public.app_context(), public.cash_balance() to authenticated;

-- ---------------------------------------------------------------------------
-- Realtime: categories, budgets and recurring rules sync between phones too
-- ---------------------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array['categories', 'budgets', 'recurring'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end;
$$;
