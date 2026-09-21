-- Feed do Instagram gerenciado via painel administrativo
create table public.instagram_posts (
  id uuid primary key default gen_random_uuid(),
  image_url text not null,
  caption text,
  instagram_url text not null,
  sort_order integer not null default 0,
  status text not null default 'published' check (status in ('draft', 'published', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index instagram_posts_sort_order_idx on public.instagram_posts(sort_order);
create index instagram_posts_status_idx on public.instagram_posts(status);

create trigger instagram_posts_updated_at before update on public.instagram_posts for each row execute function public.set_updated_at();

alter table public.instagram_posts enable row level security;

create policy "public reads published instagram posts" on public.instagram_posts
  for select to anon, authenticated
  using (status = 'published' or public.is_admin());

create policy "admins manage instagram posts" on public.instagram_posts
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());