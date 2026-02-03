-- Add RLS policies for Inspo bucket (public bucket)
-- This allows anyone to list and view files in the Inspo bucket

-- Policy: Anyone can view/list files in Inspo bucket (public access)
drop policy if exists "Public can view Inspo bucket" on storage.objects;
create policy "Public can view Inspo bucket"
on storage.objects for select
using (bucket_id = 'Inspo');
