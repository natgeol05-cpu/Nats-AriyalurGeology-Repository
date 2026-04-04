require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 8080;

// ---------------------------------------------------------------------------
// Supabase client
// ---------------------------------------------------------------------------
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabase = null;
if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
}

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['https://natswebsite.com', 'https://www.natswebsite.com'],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/api/', limiter);

// ---------------------------------------------------------------------------
// Multer configuration for image uploads (stored in memory for Supabase upload)
// ---------------------------------------------------------------------------
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
const MAX_FILE_SIZE_BYTES = 250 * 1024; // 250 KB

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG and GIF images are allowed.'));
    }
  },
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Validate an email address format.
 * @param {string} email
 * @returns {boolean}
 */
function isValidEmail(email) {
  const re = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
  return re.test(String(email).trim());
}

/**
 * Validate a phone number (7–15 digits, optional leading +).
 * @param {string} phone
 * @returns {boolean}
 */
function isValidPhone(phone) {
  const re = /^\+?[0-9]{7,15}$/;
  return re.test(String(phone).trim());
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    supabase: supabase ? 'connected' : 'not configured',
  });
});

// ---- Registration ----------------------------------------------------------
app.post('/api/register', async (req, res) => {
  try {
    const { name, email, phone } = req.body;

    // Validate required fields
    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required.' });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Invalid email address.' });
    }
    if (phone && !isValidPhone(phone)) {
      return res.status(400).json({ error: 'Invalid phone number.' });
    }

    if (!supabase) {
      return res.status(503).json({ error: 'Database not configured.' });
    }

    const { data, error } = await supabase
      .from('registrations')
      .insert([{ name: name.trim(), email: email.trim().toLowerCase(), phone: phone ? phone.trim() : null }])
      .select();

    if (error) {throw error;}

    return res.status(201).json({ success: true, id: data[0].id });
  } catch (err) {
    console.error('Registration error:', err.message);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// ---- Fossil image upload ---------------------------------------------------
app.post('/api/fossils/upload', upload.array('images', 4), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'At least one image file is required.' });
    }

    if (!supabase) {
      return res.status(503).json({ error: 'Database not configured.' });
    }

    const uploadedUrls = [];

    for (const file of req.files) {
      const ext = file.originalname.split('.').pop().toLowerCase();
      const fileName = `fossils/${uuidv4()}.${ext}`;

      const { error: storageError } = await supabase.storage
        .from('fossil-images')
        .upload(fileName, file.buffer, {
          contentType: file.mimetype,
          upsert: false,
        });

      if (storageError) {throw storageError;}

      const { data: publicUrlData } = supabase.storage
        .from('fossil-images')
        .getPublicUrl(fileName);

      uploadedUrls.push(publicUrlData.publicUrl);
    }

    return res.status(201).json({ success: true, urls: uploadedUrls });
  } catch (err) {
    console.error('Image upload error:', err.message);
    if (err.message && err.message.includes('Invalid file type')) {
      return res.status(400).json({ error: err.message });
    }
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File size exceeds 250 KB limit.' });
    }
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// ---- Fossil details --------------------------------------------------------
app.post('/api/fossils/details', async (req, res) => {
  try {
    const {
      fossilName,
      scientificName,
      description,
      location,
      age,
      imageUrls,
      collectorName,
      fieldNumber,
    } = req.body;

    if (!fossilName) {
      return res.status(400).json({ error: 'Fossil name is required.' });
    }
    if (!fieldNumber) {
      return res.status(400).json({ error: 'Field number is required.' });
    }

    if (!supabase) {
      return res.status(503).json({ error: 'Database not configured.' });
    }

    const { data, error } = await supabase
      .from('fossil_details')
      .insert([{
        fossil_name: fossilName.trim(),
        scientific_name: scientificName ? scientificName.trim() : null,
        description: description ? description.trim() : null,
        location: location ? location.trim() : null,
        age: age ? age.trim() : null,
        image_urls: imageUrls || [],
        collector_name: collectorName ? collectorName.trim() : null,
        field_number: fieldNumber.trim(),
      }])
      .select();

    if (error) {throw error;}

    return res.status(201).json({ success: true, id: data[0].id });
  } catch (err) {
    console.error('Fossil details error:', err.message);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// ---- Get all fossil details (for gallery) ----------------------------------
app.get('/api/fossils', async (_req, res) => {
  try {
    if (!supabase) {
      return res.status(503).json({ error: 'Database not configured.' });
    }

    const { data, error } = await supabase
      .from('fossil_details')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {throw error;}

    return res.json({ success: true, fossils: data });
  } catch (err) {
    console.error('Get fossils error:', err.message);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// ---------------------------------------------------------------------------
// Multer error handling middleware
// ---------------------------------------------------------------------------
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File size exceeds 250 KB limit.' });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ error: 'Maximum 4 images allowed per upload.' });
    }
    return res.status(400).json({ error: err.message });
  }
  if (err && err.message && err.message.includes('Invalid file type')) {
    return res.status(400).json({ error: err.message });
  }
  console.error('Unhandled error:', err);
  return res.status(500).json({ error: 'Internal server error.' });
});

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Ariyalur Geology API server running on port ${PORT}`);
  });
}

module.exports = { app, isValidEmail, isValidPhone };
