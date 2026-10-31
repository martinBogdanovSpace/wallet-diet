-- Starting balance, year overview and savings goals.
-- Needs 20261101000000_carry_over.sql to have run first.

-- ---------------------------------------------------------------------------
-- Starting balance: money the household had before its first entry
-- ---------------------------------------------------------------------------

alter table public.households add column if not exists starting_balance_cents bigint not null default 0;

-- Income minus expenses of every entry before p_date, plus the starting balance.
create or replace function public.balance_before(p_date date)
returns bigint
language sql stable security definer set search_path = ''
as $$
  select coalesce((
    select starting_balance_cents from public.households where id = public.my_household()
  ), 0) + coalesce((
    select sum(case type when 'income' then amount_cents when 'expense' then -amount_cents else 0 end)
    from public.transactions
    where household_id = public.my_household()
      and occurred_on < p_date
  ), 0)::bigint
$$;

-- ---------------------------------------------------------------------------
-- Year overview: totals per month and per category, summed in the database
-- ---------------------------------------------------------------------------

create or replace function public.year_summary(p_year int)
returns jsonb
language sql stable security definer set search_path = ''
as $$
  with tx as (
    select type, amount_cents, category_id, to_char(occurred_on, 'YYYY-MM') as month
    from public.transactions
    where household_id = public.my_household()
      and occurred_on >= make_date(p_year, 1, 1)
      and occurred_on < make_date(p_year + 1, 1, 1)
      and type in ('income', 'expense')
  )
  select jsonb_build_object(
    'months', coalesce((
      select jsonb_agg(
        jsonb_build_object('month', month, 'income', income, 'expenses', expenses) order by month
      )
      from (
        select month,
          coalesce(sum(amount_cents) filter (where type = 'income'), 0) as income,
          coalesce(sum(amount_cents) filter (where type = 'expense'), 0) as expenses
        from tx group by month
      ) m
    ), '[]'::jsonb),
    'categories', coalesce((
      select jsonb_agg(jsonb_build_object('category_id', category_id, 'expenses', total) order by total desc)
      from (
        select category_id, sum(amount_cents) as total
        from tx where type = 'expense' group by category_id
      ) c
    ), '[]'::jsonb)
  )
$$;

-- ---------------------------------------------------------------------------
-- Savings goals: money set aside from what the household has saved
-- ---------------------------------------------------------------------------

create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  icon text not null default '🎯',
  target_cents bigint not null check (target_cents > 0),
  saved_cents bigint not null default 0 check (saved_cents >= 0),
  created_at timestamptz not null default now()
);
create index if not exists goals_household_idx on public.goals (household_id);

alter table public.goals enable row level security;

drop policy if exists "goals: members all" on public.goals;
create policy "goals: members all" on public.goals
  for all to authenticated
  using (public.is_member(household_id)) with check (public.is_member(household_id));

grant select, insert, update, delete on public.goals to authenticated;

-- Adds to (or, negative, takes from) a goal in one statement, so two phones can't overwrite each other.
-- Runs as the caller, so row level security limits it to the household's goals.
create or replace function public.goal_move(p_goal uuid, p_amount bigint)
returns bigint
language sql set search_path = ''
as $$
  update public.goals
  set saved_cents = greatest(0, saved_cents + p_amount)
  where id = p_goal
  returning saved_cents
$$;

-- ---------------------------------------------------------------------------
-- Grants and realtime
-- ---------------------------------------------------------------------------

revoke execute on function public.year_summary(int), public.goal_move(uuid, bigint) from public, anon;
grant execute on function public.year_summary(int), public.goal_move(uuid, bigint) to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'goals'
  ) then
    alter publication supabase_realtime add table public.goals;
  end if;
end;
$$;
