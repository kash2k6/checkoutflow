import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

const BUCKET_NAME = 'product-images';

export async function POST(request: NextRequest) {
  try {
    // Check if Supabase is configured
    if (!isSupabaseConfigured() || !supabase) {
      return NextResponse.json(
        { error: 'Supabase storage is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.' },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed.' },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size too large. Maximum size is 5MB.' },
        { status: 400 }
      );
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${timestamp}-${randomString}.${fileExtension}`;
    const filePath = `products/${fileName}`;

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false, // Don't overwrite existing files
      });

    if (uploadError) {
      console.error('Supabase storage upload error:', uploadError);
      
      // If bucket doesn't exist, try to create it automatically
      if (uploadError.message?.includes('not found') || uploadError.message?.includes('Bucket')) {
        console.log(`Bucket "${BUCKET_NAME}" not found, attempting to create it...`);
        
        const { data: bucketData, error: createError } = await supabase.storage.createBucket(BUCKET_NAME, {
          public: true,
          fileSizeLimit: 5242880, // 5MB
          allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'],
        });

        if (createError) {
          console.error('Error creating bucket:', createError);
          return NextResponse.json(
            { 
              error: `Storage bucket "${BUCKET_NAME}" not found and could not be created automatically. Please create it in your Supabase dashboard under Storage, or run: npx tsx scripts/setup-storage-bucket.ts`,
              details: createError.message 
            },
            { status: 404 }
          );
        }

        console.log(`Bucket "${BUCKET_NAME}" created successfully, retrying upload...`);
        
        // Retry upload after creating bucket
        const { data: retryUploadData, error: retryError } = await supabase.storage
          .from(BUCKET_NAME)
          .upload(filePath, buffer, {
            contentType: file.type,
            upsert: false,
          });

        if (retryError) {
          return NextResponse.json(
            { error: 'Failed to upload file after creating bucket', details: retryError.message },
            { status: 500 }
          );
        }

        // Get public URL for retry upload
        const { data: retryUrlData } = supabase.storage
          .from(BUCKET_NAME)
          .getPublicUrl(filePath);

        if (!retryUrlData?.publicUrl) {
          return NextResponse.json(
            { error: 'Failed to get public URL for uploaded file' },
            { status: 500 }
          );
        }

        return NextResponse.json({
          url: retryUrlData.publicUrl,
          fileName: fileName,
          path: filePath,
        });
      }
      
      return NextResponse.json(
        { error: 'Failed to upload file to storage', details: uploadError.message },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);

    if (!urlData?.publicUrl) {
      return NextResponse.json(
        { error: 'Failed to get public URL for uploaded file' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      url: urlData.publicUrl,
      fileName: fileName,
      path: filePath,
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { error: 'Failed to upload file', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

