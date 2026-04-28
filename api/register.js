// api/register.js - Vercel Serverless Function
// Handles visitor registration and stores data in Supabase

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

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

  const { name, email, phone, institution, purpose } = req.body || {};

  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required fields.' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email address format.' });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase
      .from('registrations')
      .insert([
        {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phone: phone ? phone.trim() : null,
          institution: institution ? institution.trim() : null,
          purpose: purpose ? purpose.trim() : null,
          registered_at: new Date().toISOString(),
        },
      ])
      .select('id, name, email, registered_at');

    if (error) {
      console.error('Supabase insert error:', error);
      if (error.code === '23505') {
        return res.status(409).json({ error: 'This email address is already registered.' });
      }
      return res.status(500).json({ error: 'Database error. Please try again.' });
    }

    return res.status(201).json({
      success: true,
      message: `Thank you, ${name}! Your registration is successful.`,
      registration_id: data[0].id,
    });
  } catch (err) {
    console.error('Unexpected error:', err);
    return res.status(500).json({ error: 'An unexpected error occurred. Please try again.' });
  }
};
