-- Create post_images junction table (which images used in which posts)
create table if not exists post_images (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts(id) on delete cascade,
  image_id uuid not null references images(id) on delete cascade,
  position int default 0,         -- slide order
  created_at timestamptz default now(),
  unique(post_id, image_id)
);

-- Enable RLS
alter table post_images enable row level security;

-- Users can view post_images for posts they can access
create policy "Users can view post_images for accessible posts"
  on post_images for select
  using (
    post_id in (
      select id from posts
      where account_id in (
        select id from accounts
        where organization_id in (select public.get_user_org_ids())
      )
    )
  );

-- Users can insert post_images for posts they can modify
create policy "Users can insert post_images"
  on post_images for insert
  with check (
    post_id in (
      select id from posts
      where account_id in (
        select id from accounts
        where organization_id in (select public.get_user_org_ids())
      )
    )
  );

-- Users can update post_images for posts they can modify
create policy "Users can update post_images"
  on post_images for update
  using (
    post_id in (
      select id from posts
      where account_id in (
        select id from accounts
        where organization_id in (select public.get_user_org_ids())
      )
    )
  );

-- Users can delete post_images for posts they can modify
create policy "Users can delete post_images"
  on post_images for delete
  using (
    post_id in (
      select id from posts
      where account_id in (
        select id from accounts
        where organization_id in (select public.get_user_org_ids())
      )
    )
  );

-- Indexes
create index if not exists post_images_post_id_idx on post_images(post_id);
create index if not exists post_images_image_id_idx on post_images(image_id);
create index if not exists post_images_position_idx on post_images(position);
