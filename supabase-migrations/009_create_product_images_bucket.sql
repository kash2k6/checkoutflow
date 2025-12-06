-- Create storage bucket for product images
-- This migration documents the bucket configuration that should be created
-- 
-- IMPORTANT: Supabase Storage buckets cannot be created via SQL migrations.
-- The bucket will be created automatically by the upload API on first use,
-- or you can create it manually using one of the methods below.

-- Bucket Configuration:
-- - Name: product-images
-- - Public: true (so images can be accessed via public URLs)
-- - File size limit: 5MB (5242880 bytes)
-- - Allowed MIME types: image/jpeg, image/jpg, image/png, image/webp, image/gif

-- Methods to create the bucket:

-- 1. AUTOMATIC (Recommended):
--    The bucket will be created automatically when the first image is uploaded
--    via the /api/upload/image endpoint. No manual setup required.

-- 2. Via Supabase Dashboard:
--    - Go to Storage section
--    - Click "New bucket"
--    - Name: "product-images"
--    - Public: Enable (checked)
--    - File size limit: 5242880 (5MB)
--    - Allowed MIME types: image/jpeg, image/jpg, image/png, image/webp, image/gif
--    - Click "Create bucket"
--
--    Then set up policies in the dashboard:
--    - Go to Storage > product-images > Policies
--    - Create policy for public read access:
--      * Policy name: "Public read access"
--      * Allowed operation: SELECT
--      * Target roles: public
--      * Policy definition: (bucket_id = 'product-images')
--    - Create policy for authenticated upload:
--      * Policy name: "Authenticated upload"
--      * Allowed operation: INSERT
--      * Target roles: authenticated
--      * Policy definition: (bucket_id = 'product-images')

-- 3. Via Supabase CLI:
--    supabase storage create product-images --public

-- 4. Via API (using service role key):
--    POST https://<project-ref>.supabase.co/storage/v1/bucket
--    Headers: 
--      Authorization: Bearer <service-role-key>
--      Content-Type: application/json
--    Body: 
--      {
--        "name": "product-images",
--        "public": true,
--        "file_size_limit": 5242880,
--        "allowed_mime_types": ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"]
--      }

-- 5. Via Setup Script:
--    npx tsx scripts/setup-storage-bucket.ts

-- Note: Storage policies in Supabase are managed through the dashboard or Storage API,
-- not through SQL. The policies should be set up after creating the bucket to allow:
-- - Public read access (so images can be displayed)
-- - Authenticated upload access (so users can upload images)

