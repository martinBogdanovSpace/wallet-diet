-- Money left over from earlier months, for the carry-over line on the home screen.

-- Income minus expenses of every entry before p_date. ATM withdrawals and cash
-- corrections only move money between pockets, so they don't count.
create or replace function public.balance_before(p_date date)
returns bigint
language sql stable security definer set search_path = ''
as $$
  select coalesce(sum(case type when 'income' then amount_cents when 'expense' then -amount_cents else 0 end), 0)::bigint
  from public.transactions
  where household_id = public.my_household()
    and occurred_on < p_date
$$;

revoke execute on function public.balance_before(date) from public, anon;
grant execute on function public.balance_before(date) to authenticated;
