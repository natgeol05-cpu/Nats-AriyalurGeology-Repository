// api/health.js - Vercel Serverless Function
// Health check endpoint to verify the backend API and database connectivity

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const status = {
    api: 'ok',
    timestamp: new Date().toISOString(),
    database: 'unknown',
    storage: 'unknown',
  };

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check database connectivity
    const { error: dbError } = await supabase
      .from('registrations')
      .select('count', { count: 'exact', head: true });

    status.database = dbError ? 'error' : 'ok';

    // Check storage connectivity
    const { error: storageError } = await supabase.storage.listBuckets();
    status.storage = storageError ? 'error' : 'ok';

    const allOk = status.database === 'ok' && status.storage === 'ok';
    return res.status(allOk ? 200 : 503).json(status);
  } catch (err) {
    console.error('Health check error:', err);
    status.database = 'error';
    status.storage = 'error';
    return res.status(503).json(status);
  }
}
