// api/fossil-details.js - Vercel Serverless Function
// Handles fossil specimen detail submissions and stores data in Supabase

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET: fetch all approved fossil submissions
  if (req.method === 'GET') {
    try {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { data, error } = await supabase
        .from('fossil_details')
        .select('id, fossil_name, genus_species, formation, locality, age, classification, description, collector_name, field_number, submitted_at')
        .eq('status', 'approved')
        .order('submitted_at', { ascending: false });

      if (error) {
        console.error('Supabase fetch error:', error);
        return res.status(500).json({ error: 'Database error. Please try again.' });
      }

      return res.status(200).json({ success: true, fossils: data });
    } catch (err) {
      console.error('Unexpected error:', err);
      return res.status(500).json({ error: 'An unexpected error occurred.' });
    }
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST or GET.' });
  }

  const {
    fossil_name,
    genus_species,
    formation,
    locality,
    age,
    classification,
    description,
    collector_name,
    collector_email,
    field_number,
    image_urls,
  } = req.body || {};

  if (!fossil_name || !collector_name || !collector_email) {
    return res.status(400).json({
      error: 'Fossil name, collector name, and email are required.',
    });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (!emailRegex.test(collector_email)) {
    return res.status(400).json({ error: 'Invalid email address format.' });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase
      .from('fossil_details')
      .insert([
        {
          fossil_name: fossil_name.trim(),
          genus_species: genus_species ? genus_species.trim() : null,
          formation: formation ? formation.trim() : null,
          locality: locality ? locality.trim() : null,
          age: age ? age.trim() : null,
          classification: classification ? classification.trim() : null,
          description: description ? description.trim() : null,
          collector_name: collector_name.trim(),
          collector_email: collector_email.trim().toLowerCase(),
          field_number: field_number ? field_number.trim() : null,
          image_urls: image_urls || [],
          status: 'pending',
          submitted_at: new Date().toISOString(),
        },
      ])
      .select('id, fossil_name, submitted_at');

    if (error) {
      console.error('Supabase insert error:', error);
      return res.status(500).json({ error: 'Database error. Please try again.' });
    }

    return res.status(201).json({
      success: true,
      message: `Thank you, ${collector_name}! Fossil details for "${fossil_name}" submitted successfully. It will appear in the gallery after review.`,
      submission_id: data[0].id,
    });
  } catch (err) {
    console.error('Unexpected error:', err);
    return res.status(500).json({ error: 'An unexpected error occurred. Please try again.' });
  }
};
