// api/upload-image.js - Vercel Serverless Function
// Handles fossil image uploads to Supabase Storage

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Allowed image MIME types (lowercase normalised)
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif'];
// Max file size: 250KB in bytes
const MAX_SIZE_BYTES = 250 * 1024;
// Max images per specimen
const MAX_IMAGES = 4;

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  const { file_name, file_type, file_size, file_data, field_number } = req.body || {};

  if (!file_name || !file_type || !file_data) {
    return res.status(400).json({ error: 'file_name, file_type, and file_data are required.' });
  }

  if (!ALLOWED_TYPES.includes(file_type.toLowerCase())) {
    return res.status(400).json({
      error: `Invalid file type. Allowed types: ${ALLOWED_TYPES.join(', ')}`,
    });
  }

  if (file_size && file_size > MAX_SIZE_BYTES) {
    return res.status(400).json({
      error: `File size exceeds 250KB limit. Please compress at https://www.reduceimages.com`,
    });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Decode base64 file data
    const base64Data = file_data.replace(/^data:[^;]+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    if (buffer.length > MAX_SIZE_BYTES) {
      return res.status(400).json({
        error: `File size exceeds 250KB limit. Please compress at https://www.reduceimages.com`,
      });
    }

    // Build a unique storage path using field_number + timestamp
    const timestamp = Date.now();
    const sanitizedName = file_name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = field_number
      ? `fossils/${field_number.replace(/[^a-zA-Z0-9_-]/g, '_')}/${timestamp}_${sanitizedName}`
      : `fossils/unassigned/${timestamp}_${sanitizedName}`;

    const { data, error } = await supabase.storage
      .from('fossil-images')
      .upload(storagePath, buffer, {
        contentType: file_type,
        upsert: false,
      });

    if (error) {
      console.error('Supabase storage error:', error);
      return res.status(500).json({ error: 'Image upload failed. Please try again.' });
    }

    // Get public URL for the uploaded image
    const { data: urlData } = supabase.storage
      .from('fossil-images')
      .getPublicUrl(storagePath);

    return res.status(201).json({
      success: true,
      message: 'Image uploaded successfully.',
      file_path: storagePath,
      public_url: urlData.publicUrl,
    });
  } catch (err) {
    console.error('Unexpected error:', err);
    return res.status(500).json({ error: 'An unexpected error occurred. Please try again.' });
  }
};
