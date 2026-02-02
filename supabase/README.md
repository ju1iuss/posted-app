# Supabase Database Migrations

This directory contains SQL migration files for setting up the database schema.

## Migration Files

1. **001_create_profiles.sql** - Creates profiles table and auth triggers
2. **002_create_organizations.sql** - Creates organizations table
3. **003_create_organization_members.sql** - Creates organization_members junction table with RLS
4. **004_create_accounts.sql** - Creates accounts table (TikTok theme accounts)
5. **005_create_strategies.sql** - Creates strategies table (content calendars)
6. **006_create_images.sql** - Creates images table (uploaded + AI generated)
7. **007_create_collections.sql** - Creates collections table (image groups)
8. **008_create_collection_images.sql** - Creates collection_images junction table
9. **009_create_posts.sql** - Creates posts table (carousels, videos, etc.)
10. **010_create_post_images.sql** - Creates post_images junction table
11. **011_storage_buckets.sql** - Documents storage bucket structure and policies
12. **012_seed_public_collections.sql** - Seeds public collections

## Running Migrations

### Option 1: Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Run each migration file in order (001 through 012)

### Option 2: Supabase CLI
```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Link to your project
supabase link --project-ref your-project-ref

# Run migrations
supabase db push
```

### Option 3: Manual Execution
Copy and paste each migration file's contents into the Supabase SQL Editor and execute.

## Storage Buckets Setup

After running migrations, you need to create storage buckets manually:

1. Go to Storage in Supabase Dashboard
2. Create bucket named `images` (public)
3. Create bucket named `exports` (private)
4. Apply the policies documented in `011_storage_buckets.sql`

## Environment Variables

Add these to your `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Database Schema Overview

- **profiles** - User profiles (extends auth.users)
- **organizations** - Multi-tenant organizations
- **organization_members** - User-organization relationships with roles
- **accounts** - TikTok theme accounts
- **strategies** - Content strategies/calendars
- **posts** - Content posts (carousels, videos)
- **images** - Image assets
- **collections** - Image collections (public + private)
- **collection_images** - Junction table for collection-image relationships
- **post_images** - Junction table for post-image relationships

All tables have Row Level Security (RLS) enabled with appropriate policies for multi-tenant access control.
