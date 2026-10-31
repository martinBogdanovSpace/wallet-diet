-- A name per language for categories, e.g. {"bg": "Детска градина", "en": "Kindergarten"}.
-- `name` stays as the fallback (and as the key for the translated default categories).
alter table public.categories add column if not exists names jsonb not null default '{}'::jsonb;
