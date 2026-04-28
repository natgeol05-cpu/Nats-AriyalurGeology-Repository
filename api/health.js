// api/health.js - Vercel Serverless Function
// Health check endpoint to verify the backend API and database connectivity

import { createClient } from '@supabase/supabase-js';

const REQUIRED_SUPABASE_ENV_VARS = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];

function getMissingSupabaseEnvVars() {
  return REQUIRED_SUPABASE_ENV_VARS.filter((envVarName) => !process.env[envVarName]);
}

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
    configuration: {
      status: 'ok',
      missingEnvVars: [],
    },
    database: 'unknown',
    storage: 'unknown',
  };

  const missingSupabaseEnvVars = getMissingSupabaseEnvVars();
  if (missingSupabaseEnvVars.length > 0) {
    status.api = 'degraded';
    status.configuration = {
      status: 'error',
      missingEnvVars: missingSupabaseEnvVars,
    };
    status.database = 'error';
    status.storage = 'error';
    return res.status(503).json({
      ...status,
      error: `Missing required environment variables: ${missingSupabaseEnvVars.join(', ')}. Set these in Vercel Project Settings -> Environment Variables and redeploy.`,
    });
  }

  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
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
    return res.status(allOk ? 200 : 503).json(allOk ? status : {
      ...status,
      api: 'degraded',
      error: 'Supabase connectivity check failed. Verify SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
    });
  } catch (err) {
    console.error('Health check error:', err);
    return res.status(503).json({
      ...status,
      api: 'degraded',
      database: 'error',
      storage: 'error',
      error: 'Health check failed unexpectedly. Verify Supabase configuration and retry.',
    });
  }
}
