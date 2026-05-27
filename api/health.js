// api/health.js - Vercel Serverless Function
// Health check endpoint to verify the backend API and database connectivity

import { createClient } from '@supabase/supabase-js';

const REQUIRED_SUPABASE_ENV_VARS = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
const SUPABASE_ENV_SMART_PUNCTUATION_REGEX = /[\u2018\u2019\u201C\u201D\u2022\u00B7\u2013\u2014]/;
const SUPABASE_ENV_NON_ASCII_REGEX = /[^\x00-\x7F]/;

function getMissingSupabaseEnvVars() {
  return REQUIRED_SUPABASE_ENV_VARS.filter((envVarName) => !process.env[envVarName]);
}

function getMalformedSupabaseEnvVars() {
  const malformedVars = [];

  for (const envVarName of REQUIRED_SUPABASE_ENV_VARS) {
    const envValue = process.env[envVarName];
    if (typeof envValue !== 'string' || !envValue) {
      continue;
    }

    const issues = [];
    if (envValue !== envValue.trim()) {
      issues.push('leading/trailing whitespace');
    }
    if (/[\r\n]/.test(envValue)) {
      issues.push('line breaks');
    }
    const hasSmartPunctuation = SUPABASE_ENV_SMART_PUNCTUATION_REGEX.test(envValue);
    if (hasSmartPunctuation) {
      issues.push('smart punctuation/bullets');
    }
    if (SUPABASE_ENV_NON_ASCII_REGEX.test(envValue) && !hasSmartPunctuation) {
      issues.push('non-ASCII characters');
    }

    if (issues.length > 0) {
      malformedVars.push({ envVarName, issues });
    }
  }

  return malformedVars;
}

function getSupabaseMalformedConfigErrorMessage(malformedSupabaseEnvVars) {
  const malformedNames = malformedSupabaseEnvVars.map((entry) => entry.envVarName);
  return `Server misconfiguration: malformed ${malformedNames.join(', ')}. Remove leading/trailing whitespace, line breaks, and non-ASCII characters (for example smart punctuation/bullets), then redeploy. Use /api/health to verify connectivity.`;
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
      malformedEnvVars: [],
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
      malformedEnvVars: [],
    };
    status.database = 'error';
    status.storage = 'error';
    return res.status(503).json({
      ...status,
      error: `Missing required environment variables: ${missingSupabaseEnvVars.join(', ')}. Set these in Vercel Project Settings -> Environment Variables and redeploy.`,
    });
  }

  const malformedSupabaseEnvVars = getMalformedSupabaseEnvVars();
  if (malformedSupabaseEnvVars.length > 0) {
    const malformedEnvVarNames = malformedSupabaseEnvVars.map((entry) => entry.envVarName);
    status.api = 'degraded';
    status.configuration = {
      status: 'malformed',
      missingEnvVars: [],
      malformedEnvVars: malformedEnvVarNames,
    };
    status.database = 'error';
    status.storage = 'error';
    return res.status(503).json({
      ...status,
      error: getSupabaseMalformedConfigErrorMessage(malformedSupabaseEnvVars),
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
