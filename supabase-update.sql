-- Mise à jour d'une installation existante (ajoute catégories et favoris)
alter table places add column if not exists category text not null default 'autre';
alter table places add column if not exists favorite boolean not null default false;

drop function if exists get_shared(text);
create function get_shared(token text)
returns table(id uuid, title text, visited date, descr text, lat double precision, lng double precision, photos text[], category text, favorite boolean)
language sql security definer set search_path = public as $$
  select p.id, p.title, p.visited, p.descr, p.lat, p.lng, p.photos, p.category, p.favorite
  from places p join carnets c on c.owner = p.owner
  where c.share_token = token
  order by p.visited desc nulls last
$$;
grant execute on function get_shared(text) to anon, authenticated;
