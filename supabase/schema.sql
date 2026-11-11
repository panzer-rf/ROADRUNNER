-- ROADRUNNER initial schema for Supabase (Postgres)
-- Run in Supabase SQL Editor. RLS is enabled on all application tables.

create extension if not exists pgcrypto;

create type public.app_role as enum ('driver', 'root');
create type public.location_status as enum ('pending', 'approved', 'rejected', 'archived');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  role public.app_role not null default 'driver',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.delivery_locations (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  address_text text,
  locality text not null default 'Campobasso',
  province text not null default 'CB',
  region text not null default 'Molise',
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  access_notes text,
  landmark text,
  status public.location_status not null default 'pending',
  created_by uuid not null references public.profiles(id),
  approved_by uuid references public.profiles(id),
  approved_at timestamptz,
  last_verified_at timestamptz,
  usage_count integer not null default 0 check (usage_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index delivery_locations_geo_idx
  on public.delivery_locations (latitude, longitude);
create index delivery_locations_status_locality_idx
  on public.delivery_locations (status, locality);

create table public.location_photos (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references public.delivery_locations(id) on delete cascade,
  storage_path text not null unique,
  caption text,
  uploaded_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.location_audit (
  id bigint generated always as identity primary key,
  location_id uuid,
  actor_id uuid,
  action text not null,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);

-- Updated-at helper
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger delivery_locations_set_updated_at
before update on public.delivery_locations
for each row execute function public.set_updated_at();

-- Keep audit rows even if a location is later deleted: location_id intentionally has no FK.

-- Create a profile automatically when a user is created.
-- The role is always driver here. ROOT assignment must be a trusted manual action.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1), 'Repartidor'),
    'driver'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Security helper: role checks read the protected profile table.
create or replace function public.is_root()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'root'
      and p.active = true
  );
$$;

create or replace function public.is_active_driver_or_root()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.active = true
  );
$$;

alter table public.profiles enable row level security;
alter table public.delivery_locations enable row level security;
alter table public.location_photos enable row level security;
alter table public.location_audit enable row level security;

-- Profiles: authenticated users can read their own profile; ROOT can read all.
create policy "profiles_read_self_or_root"
on public.profiles for select to authenticated
using (id = (select auth.uid()) or (select public.is_root()));

-- Explicit grants complement RLS: grants allow the operation category;
-- RLS decides which rows each authenticated user may access.
revoke all on public.profiles, public.delivery_locations,
  public.location_photos, public.location_audit from anon;
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.delivery_locations to authenticated;
grant select, insert, update, delete on public.location_photos to authenticated;
grant select on public.location_audit to authenticated;

revoke all on function public.is_root() from public;
revoke all on function public.is_active_driver_or_root() from public;
grant execute on function public.is_root() to authenticated;
grant execute on function public.is_active_driver_or_root() to authenticated;

create policy "root_manage_profiles"
on public.profiles for update to authenticated
using ((select public.is_root()))
with check ((select public.is_root()));

-- Location reads: active drivers see approved records and their own pending/rejected;
-- ROOT sees everything.
create policy "locations_read_visible"
on public.delivery_locations for select to authenticated
using (
  (select public.is_root())
  or (
    (select public.is_active_driver_or_root())
    and (
      status = 'approved'
      or created_by = (select auth.uid())
    )
  )
);

create policy "drivers_create_own_pending_locations"
on public.delivery_locations for insert to authenticated
with check (
  (select public.is_active_driver_or_root())
  and created_by = (select auth.uid())
  and status = 'pending'
  and approved_by is null
  and approved_at is null
  and usage_count = 0
);

create policy "drivers_update_own_pending_locations"
on public.delivery_locations for update to authenticated
using (
  created_by = (select auth.uid())
  and status = 'pending'
  and (select public.is_active_driver_or_root())
)
with check (
  created_by = (select auth.uid())
  and status = 'pending'
  and approved_by is null
  and approved_at is null
);

create policy "root_manage_locations"
on public.delivery_locations for all to authenticated
using ((select public.is_root()))
with check ((select public.is_root()));

-- Photo metadata: drivers can read photos for locations they can read,
-- and upload metadata only for their own pending location. ROOT can manage all.
create policy "photos_read_visible_location"
on public.location_photos for select to authenticated
using (
  (select public.is_root())
  or exists (
    select 1 from public.delivery_locations l
    where l.id = location_id
      and (
        l.status = 'approved'
        or l.created_by = (select auth.uid())
      )
  )
);

create policy "photos_insert_own_pending_location"
on public.location_photos for insert to authenticated
with check (
  uploaded_by = (select auth.uid())
  and storage_path like location_id::text || '/%'
  and exists (
    select 1 from public.delivery_locations l
    where l.id = location_id
      and l.created_by = (select auth.uid())
      and l.status = 'pending'
  )
);

create policy "root_manage_photo_metadata"
on public.location_photos for all to authenticated
using ((select public.is_root()))
with check ((select public.is_root()));

-- Audit log is read-only to drivers; only ROOT can read it.
create policy "root_read_audit"
on public.location_audit for select to authenticated
using ((select public.is_root()));

-- Audit trigger records changes to location records.
create or replace function public.audit_delivery_location()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid;
  v_location_id uuid;
begin
  v_actor := auth.uid();
  if (tg_op = 'INSERT') then
    v_location_id := new.id;
    insert into public.location_audit(location_id, actor_id, action, new_data)
    values (v_location_id, v_actor, 'insert', to_jsonb(new));
    return new;
  elsif (tg_op = 'UPDATE') then
    v_location_id := new.id;
    insert into public.location_audit(location_id, actor_id, action, old_data, new_data)
    values (v_location_id, v_actor, 'update', to_jsonb(old), to_jsonb(new));
    return new;
  elsif (tg_op = 'DELETE') then
    v_location_id := old.id;
    insert into public.location_audit(location_id, actor_id, action, old_data)
    values (v_location_id, v_actor, 'delete', to_jsonb(old));
    return old;
  end if;
  return null;
end;
$$;

create trigger delivery_locations_audit
after insert or update or delete on public.delivery_locations
for each row execute function public.audit_delivery_location();

-- Private Storage bucket for images. Create bucket using Dashboard if preferred.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('location-photos', 'location-photos', false, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set
  public = false,
  file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg','image/png','image/webp'];

-- Storage access policies: paths are <location_uuid>/<filename>.
create policy "photo_storage_read_authorized"
on storage.objects for select to authenticated
using (
  bucket_id = 'location-photos'
  and (
    (select public.is_root())
    or exists (
      select 1 from public.location_photos p
      join public.delivery_locations l on l.id = p.location_id
      where p.storage_path = name
        and (
          l.status = 'approved'
          or l.created_by = (select auth.uid())
        )
    )
  )
);

create policy "photo_storage_insert_own_pending"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'location-photos'
  and exists (
    select 1 from public.delivery_locations l
    where l.id::text = (storage.foldername(name))[1]
      and l.created_by = (select auth.uid())
      and l.status = 'pending'
  )
);

create policy "photo_storage_delete_root"
on storage.objects for delete to authenticated
using (bucket_id = 'location-photos' and (select public.is_root()));

-- After creating the first trusted user, promote it to ROOT manually:
-- update public.profiles set role = 'root' where id = 'AUTH_USER_UUID';
-- Never expose the service_role key in frontend code.
