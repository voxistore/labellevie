-- La Belle Vie: catálogo, usuários administrativos, mídia e políticas de acesso.
create type public.product_status as enum ('draft', 'published', 'out_of_stock', 'archived');
create type public.collection_status as enum ('draft', 'published', 'archived');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'customer' check (role in ('admin', 'customer')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  description text,
  image_path text,
  status text not null default 'published' check (status in ('draft', 'published', 'archived')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.collections (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  description text,
  cover_path text,
  banner_path text,
  launch_date date,
  status public.collection_status not null default 'draft',
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  sku text not null unique,
  description text,
  category_id uuid references public.categories(id) on delete set null,
  brand text,
  status public.product_status not null default 'draft',
  is_featured boolean not null default false,
  is_new boolean not null default false,
  price numeric(12,2) not null check (price >= 0),
  sale_price numeric(12,2) check (sale_price is null or sale_price >= 0),
  material text,
  care_instructions text,
  fit text,
  notes text,
  availability_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.product_collections (
  product_id uuid not null references public.products(id) on delete cascade,
  collection_id uuid not null references public.collections(id) on delete cascade,
  primary key (product_id, collection_id)
);

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  storage_path text not null,
  alt_text text,
  sort_order integer not null default 0,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);
create unique index product_images_one_primary on public.product_images(product_id) where is_primary;

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  size text,
  color text,
  sku text,
  stock integer not null default 0 check (stock >= 0),
  created_at timestamptz not null default now(),
  unique nulls not distinct (product_id, size, color)
);

create table public.product_measurements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  size_label text not null default 'Único',
  measurements jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  unique (product_id, size_label)
);

create index products_status_created_at_idx on public.products(status, created_at desc);
create index products_category_id_idx on public.products(category_id);
create index product_images_product_id_idx on public.product_images(product_id, sort_order);
create index product_variants_product_id_idx on public.product_variants(product_id);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;
create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger categories_updated_at before update on public.categories for each row execute function public.set_updated_at();
create trigger collections_updated_at before update on public.collections for each row execute function public.set_updated_at();
create trigger products_updated_at before update on public.products for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin insert into public.profiles (id, full_name) values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', '')); return new; end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.collections enable row level security;
alter table public.products enable row level security;
alter table public.product_collections enable row level security;
alter table public.product_images enable row level security;
alter table public.product_variants enable row level security;
alter table public.product_measurements enable row level security;

create policy "users read own profile" on public.profiles for select to authenticated using (id = auth.uid());
create policy "admins manage profiles" on public.profiles for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "public reads published categories" on public.categories for select to anon, authenticated using (status = 'published' or public.is_admin());
create policy "admins manage categories" on public.categories for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "public reads published collections" on public.collections for select to anon, authenticated using (status = 'published' or public.is_admin());
create policy "admins manage collections" on public.collections for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "public reads published products" on public.products for select to anon, authenticated using (status = 'published' or public.is_admin());
create policy "admins manage products" on public.products for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "public reads product collections" on public.product_collections for select to anon, authenticated using (exists(select 1 from public.products p where p.id = product_id and p.status = 'published') or public.is_admin());
create policy "admins manage product collections" on public.product_collections for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "public reads product images" on public.product_images for select to anon, authenticated using (exists(select 1 from public.products p where p.id = product_id and p.status = 'published') or public.is_admin());
create policy "admins manage product images" on public.product_images for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "public reads product variants" on public.product_variants for select to anon, authenticated using (exists(select 1 from public.products p where p.id = product_id and p.status = 'published') or public.is_admin());
create policy "admins manage product variants" on public.product_variants for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "public reads product measurements" on public.product_measurements for select to anon, authenticated using (exists(select 1 from public.products p where p.id = product_id and p.status = 'published') or public.is_admin());
create policy "admins manage product measurements" on public.product_measurements for all to authenticated using (public.is_admin()) with check (public.is_admin());

insert into storage.buckets (id, name, public) values ('product-media', 'product-media', true) on conflict (id) do nothing;
create policy "public reads product media" on storage.objects for select to public using (bucket_id = 'product-media');
create policy "admins upload product media" on storage.objects for insert to authenticated with check (bucket_id = 'product-media' and public.is_admin());
create policy "admins update product media" on storage.objects for update to authenticated using (bucket_id = 'product-media' and public.is_admin());
create policy "admins delete product media" on storage.objects for delete to authenticated using (bucket_id = 'product-media' and public.is_admin());

-- Após criar seu primeiro usuário pelo Supabase Auth, promova-o no SQL Editor:
-- update public.profiles set role = 'admin' where id = (select id from auth.users where email = 'seu-email@exemplo.com');
