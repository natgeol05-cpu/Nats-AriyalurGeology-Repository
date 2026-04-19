// api/register.js - Vercel Serverless Function
// Handles visitor registration and stores data in Supabase

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET: fetch registrations (for admin/review workflows)
  if (req.method === 'GET') {
    try {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { data, error } = await supabase
        .from('registrations')
        .select('id, name, email, phone, institution, purpose, status, registered_at')
        .eq('status', 'pending')
        .order('registered_at', { ascending: false });

      if (error) {
        console.error('Supabase fetch error:', error);
        return res.status(500).json({ success: false, error: 'Database error. Please try again.' });
      }

      return res.status(200).json({ success: true, registrations: data });
    } catch (err) {
      console.error('Unexpected error:', err);
      return res.status(500).json({ success: false, error: 'An unexpected error occurred. Please try again.' });
    }
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed. Use POST or GET.' });
  }

  const { name, email, phone, institution, purpose } = req.body || {};
  const normalizedName = typeof name === 'string' ? name.trim() : '';
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  const normalizedPhone = typeof phone === 'string' ? phone.trim() : '';
  const normalizedInstitution = typeof institution === 'string' ? institution.trim() : '';
  const normalizedPurpose = typeof purpose === 'string' ? purpose.trim() : '';

  if (!normalizedName || !normalizedEmail) {
    return res.status(400).json({ success: false, error: 'Name and email are required fields.' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (!emailRegex.test(normalizedEmail)) {
    return res.status(400).json({ success: false, error: 'Invalid email address format.' });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase
      .from('registrations')
      .insert([
        {
          name: normalizedName,
          email: normalizedEmail,
          phone: normalizedPhone || null,
          institution: normalizedInstitution || null,
          purpose: normalizedPurpose || null,
          status: 'pending',
          registered_at: new Date().toISOString(),
        },
      ])
      .select('id, name, email, registered_at');

    if (error) {
      console.error('Supabase insert error:', error);
      return res.status(500).json({ success: false, error: 'Database error. Please try again.' });
    }

    return res.status(201).json({
      success: true,
      message: `Thank you, ${normalizedName}! Your registration is successful.`,
      registration_id: data[0].id,
    });
  } catch (err) {
    console.error('Unexpected error:', err);
    return res.status(500).json({ success: false, error: 'An unexpected error occurred. Please try again.' });
  }
}
