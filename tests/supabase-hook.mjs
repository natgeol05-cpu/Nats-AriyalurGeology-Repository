// tests/supabase-hook.mjs
// ESM loader hook – intercepts every `import '@supabase/supabase-js'` inside the
// API handlers and returns a lightweight in-process mock.
//
// Mock state is persisted to a temporary JSON file so that the CJS test runner
// (api.test.cjs) can change it between test cases by writing to that file.

import { tmpdir } from 'node:os';
import { join } from 'node:path';

export const MOCK_CONFIG_FILE = join(tmpdir(), 'supabase-mock-config.json');

// Interpolate the resolved path so the mock source does not need to recompute it.
const MOCK_SOURCE = `
import { readFileSync } from 'node:fs';

const CONFIG_FILE = ${JSON.stringify(MOCK_CONFIG_FILE)};

function getConfig() {
  try {
    return JSON.parse(readFileSync(CONFIG_FILE, 'utf8'));
  } catch (e) {
    return {};
  }
}

export function createClient() {
  return {
    from: () => ({
      insert: (rows) => {
        globalThis.supabaseMockLastInsertedRows = rows;
        return {
          select: () => {
            const c = getConfig();
            return Promise.resolve({
              data: c.insertError
                ? null
                : (Array.isArray(c.insertData) ? c.insertData : [{ id: 'mock-uuid-123', name: 'Test', email: 'test@test.com',
                      registered_at: new Date().toISOString(),
                      fossil_name: 'Ammonite', submitted_at: new Date().toISOString() }]),
              error: c.insertError || null,
            });
          },
        };
      },
      select: () => ({
        eq: () => ({
          order: () => {
            const c = getConfig();
            return Promise.resolve({
              data: c.selectError ? null : (Array.isArray(c.selectData) ? c.selectData : []),
              error: c.selectError || null,
            });
          },
        }),
      }),
    }),
    storage: {
      from: () => ({
        upload: () => {
          const c = getConfig();
          return Promise.resolve({
            data: c.uploadError ? null : { path: 'fossils/test.jpg' },
            error: c.uploadError || null,
          });
        },
        getPublicUrl: () => ({
          data: { publicUrl: 'https://example.supabase.co/storage/v1/object/public/fossil-images/fossils/test.jpg' },
        }),
      }),
      listBuckets: () => Promise.resolve({ error: null }),
    },
  };
}
`;

export async function resolve(specifier, context, nextResolve) {
  if (specifier === '@supabase/supabase-js') {
    return {
      shortCircuit: true,
      url: `data:text/javascript,${encodeURIComponent(MOCK_SOURCE)}`,
    };
  }
  return nextResolve(specifier, context);
}
