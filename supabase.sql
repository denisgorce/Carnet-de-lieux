-- Installation complète : à coller dans Supabase → SQL Editor → Run
-- (si vous aviez déjà installé la première version, utilisez plutôt supabase-update.sql)

create table if not exists carnets(
  owner uuid primary key references auth.users on delete cascade,
  share_token text not null unique default replace(gen_random_uuid()::text,'-','')
);
create table if not exists places(
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references carnets(owner) on delete cascade default auth.uid(),
  title text not null,
  visited date,
  descr text not null default '',
  lat double precision not null,
  lng double precision not null,
  photos text[] not null default '{}',
  category text not null default 'autre',
  favorite boolean not null default false,
  created_at timestamptz not null default now()
);
alter table carnets enable row level security;
alter table places enable row level security;

create policy "carnet: propriétaire" on carnets for all
  using (owner = auth.uid()) with check (owner = auth.uid());
create policy "lieux: propriétaire" on places for all
  using (owner = auth.uid()) with check (owner = auth.uid());

-- Lecture partagée : accessible uniquement avec le jeton du lien
create or replace function get_shared(token text)
returns table(id uuid, title text, visited date, descr text, lat double precision, lng double precision, photos text[], category text, favorite boolean)
language sql security definer set search_path = public as $$
  select p.id, p.title, p.visited, p.descr, p.lat, p.lng, p.photos, p.category, p.favorite
  from places p join carnets c on c.owner = p.owner
  where c.share_token = token
  order by p.visited desc nulls last
$$;
grant execute on function get_shared(text) to anon, authenticated;

-- Photos : lecture publique par adresse (non devinable), écriture réservée au propriétaire
insert into storage.buckets(id, name, public) values ('photos','photos',true) on conflict do nothing;
create policy "photos: envoi" on storage.objects for insert to authenticated
  with check (bucket_id='photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "photos: suppression" on storage.objects for delete to authenticated
  using (bucket_id='photos' and (storage.foldername(name))[1] = auth.uid()::text);
