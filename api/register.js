// api/register.js - Vercel Serverless Function
// Handles visitor registration and stores data in Supabase

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const allowedOrigin = process.env.ALLOWED_ORIGIN;
const EMAIL_REGEX = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9]))+$/i;
const MAX_LENGTHS = {
  name: 255,
  email: 255,
  phone: 50,
  institution: 1000,
  purpose: 1000,
};
const RATE_LIMIT_MAX_REQUESTS = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const rateLimitByIp = new Map();
const missingSupabaseEnvVars = [];

if (!supabaseUrl) missingSupabaseEnvVars.push('SUPABASE_URL');
if (!supabaseKey) missingSupabaseEnvVars.push('SUPABASE_SERVICE_ROLE_KEY');

if (missingSupabaseEnvVars.length > 0) {
  console.error('Missing required environment variables for register API:', missingSupabaseEnvVars);
}

/**
 * Gets a best-effort client IP from the request.
 * @param {object} req - Vercel request object.
 * @returns {string} Client IP.
 */
function getClientIp(req) {
  const forwarded = req?.headers?.['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }
  return req?.socket?.remoteAddress || req?.connection?.remoteAddress || 'unknown';
}

/**
 * Builds a request context object for safer, richer logging.
 * @param {object} req - Vercel request object.
 * @param {string} normalizedEmail - Normalized email if available.
 * @returns {object} Request context.
 */
function getRequestContext(req, normalizedEmail = '') {
  return {
    method: req?.method || 'UNKNOWN',
    ip: getClientIp(req),
    origin: req?.headers?.origin || null,
    email: normalizedEmail || null,
  };
}

/**
 * Trims and normalizes user input.
 * @param {unknown} value - Input value.
 * @param {{lowercase?: boolean}} [options] - Sanitization options.
 * @returns {string} Sanitized value.
 */
function sanitizeInput(value, options = {}) {
  const text = typeof value === 'string'
    ? value.trim().replace(/[\u0000-\u001F\u007F]/g, '')
    : '';

  return options.lowercase ? text.toLowerCase() : text;
}

/**
 * Applies CORS headers and validates origin if allowlist is configured.
 * @param {object} req - Vercel request object.
 * @param {object} res - Vercel response object.
 * @returns {boolean} True if request origin is allowed.
 */
function applyCors(req, res) {
  const requestOrigin = req?.headers?.origin;

  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Vary', 'Origin');

  if (allowedOrigin && requestOrigin === allowedOrigin) {
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  }

  return !allowedOrigin || !requestOrigin || requestOrigin === allowedOrigin;
}

/**
 * Enforces per-IP request limits inside a fixed one-hour window.
 * @param {string} ip - Client IP.
 * @returns {boolean} True if rate limit is exceeded.
 */
function isRateLimited(ip) {
  const now = Date.now();
  const validSince = now - RATE_LIMIT_WINDOW_MS;
  const recentRequests = (rateLimitByIp.get(ip) || []).filter((timestamp) => timestamp > validSince);

  if (recentRequests.length >= RATE_LIMIT_MAX_REQUESTS) {
    rateLimitByIp.set(ip, recentRequests);
    return true;
  }

  recentRequests.push(now);
  rateLimitByIp.set(ip, recentRequests);
  return false;
}

/**
 * Handles visitor registration and stores data in Supabase.
 * @param {object} req - Vercel request object.
 * @param {object} res - Vercel response object.
 * @returns {Promise<object|void>} API response.
 */
export default async function handler(req, res) {
  const context = getRequestContext(req);

  if (!applyCors(req, res)) {
    console.warn('Blocked register request due to disallowed origin', context);
    return res.status(403).json({ success: false, error: 'Origin not allowed.' });
  }

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (missingSupabaseEnvVars.length > 0) {
    console.error('Register API misconfiguration:', { ...context, missingSupabaseEnvVars });
    return res.status(500).json({ success: false, error: 'Server misconfiguration.' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed. Use POST.' });
  }

  const { name, email, phone, institution, purpose } = req.body || {};
  const normalizedName = sanitizeInput(name);
  const normalizedEmail = sanitizeInput(email, { lowercase: true });
  const normalizedPhone = sanitizeInput(phone);
  const normalizedInstitution = sanitizeInput(institution);
  const normalizedPurpose = sanitizeInput(purpose);
  const contextWithEmail = getRequestContext(req, normalizedEmail);

  if (!normalizedName || !normalizedEmail) {
    return res.status(400).json({ success: false, error: 'Name and email are required fields.' });
  }

  if (
    normalizedName.length > MAX_LENGTHS.name ||
    normalizedEmail.length > MAX_LENGTHS.email ||
    normalizedPhone.length > MAX_LENGTHS.phone ||
    normalizedInstitution.length > MAX_LENGTHS.institution ||
    normalizedPurpose.length > MAX_LENGTHS.purpose
  ) {
    return res.status(400).json({ success: false, error: 'One or more fields exceed allowed length.' });
  }

  if (
    /[<>]/.test(normalizedName) ||
    /[<>]/.test(normalizedEmail) ||
    /[<>]/.test(normalizedPhone) ||
    /[<>]/.test(normalizedInstitution) ||
    /[<>]/.test(normalizedPurpose)
  ) {
    return res.status(400).json({ success: false, error: 'Invalid characters in input.' });
  }

  const emailParts = normalizedEmail.split('@');
  const topLevelDomain = emailParts[1] ? emailParts[1].split('.').pop() : '';
  if (!EMAIL_REGEX.test(normalizedEmail) || !topLevelDomain || topLevelDomain.length < 2) {
    return res.status(400).json({ success: false, error: 'Invalid email address format.' });
  }

  if (isRateLimited(contextWithEmail.ip)) {
    return res.status(429).json({ success: false, error: 'Too many registration attempts. Please try again later.' });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data: existingRegistrations, error: duplicateCheckError } = await supabase
      .from('registrations')
      .select('id, registered_at')
      .eq('email', normalizedEmail)
      .order('registered_at', { ascending: false });

    if (duplicateCheckError) {
      console.error('Supabase duplicate-email check error:', { ...contextWithEmail, duplicateCheckError });
      return res.status(500).json({ success: false, error: 'Database error. Please try again.' });
    }

    if (Array.isArray(existingRegistrations) && existingRegistrations.length > 0) {
      return res.status(409).json({ success: false, error: 'Email already registered.' });
    }

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
      console.error('Supabase register insert error:', { ...contextWithEmail, error });
      return res.status(500).json({ success: false, error: 'Database error. Please try again.' });
    }

    const registrationId = Array.isArray(data) && data.length > 0 ? data[0].id : null;
    if (!registrationId) {
      console.error('Supabase register insert returned empty data array', contextWithEmail);
      return res.status(500).json({ success: false, error: 'Database error. Please try again.' });
    }

    return res.status(201).json({
      success: true,
      message: `Thank you, ${normalizedName}! Your registration is successful.`,
      registration_id: registrationId,
    });
  } catch (err) {
    console.error('Unexpected register API error:', { ...contextWithEmail, error: err });
    return res.status(500).json({ success: false, error: 'An unexpected error occurred. Please try again.' });
  }
}
