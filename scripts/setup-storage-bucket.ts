/**
 * Script to create the product-images storage bucket in Supabase
 * Run this with: npx tsx scripts/setup-storage-bucket.ts
 * 
 * Make sure you have NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 * set in your environment variables
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const BUCKET_NAME = 'product-images';

async function setupBucket() {
  try {
    console.log(`Checking if bucket "${BUCKET_NAME}" exists...`);

    // Check if bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();

    if (listError) {
      console.error('Error listing buckets:', listError);
      return;
    }

    const bucketExists = buckets?.some(bucket => bucket.name === BUCKET_NAME);

    if (bucketExists) {
      console.log(`✓ Bucket "${BUCKET_NAME}" already exists`);
      return;
    }

    console.log(`Creating bucket "${BUCKET_NAME}"...`);

    // Create bucket
    const { data, error } = await supabase.storage.createBucket(BUCKET_NAME, {
      public: true,
      fileSizeLimit: 5242880, // 5MB
      allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'],
    });

    if (error) {
      console.error('Error creating bucket:', error);
      return;
    }

    console.log(`✓ Successfully created bucket "${BUCKET_NAME}"`);
    console.log('\nBucket configuration:');
    console.log(`  - Name: ${BUCKET_NAME}`);
    console.log(`  - Public: true`);
    console.log(`  - File size limit: 5MB`);
    console.log(`  - Allowed types: JPEG, PNG, WebP, GIF`);
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

setupBucket();

