// tests/mock-loader.mjs
// Preloaded via --import flag to register an ESM module hook that mocks @supabase/supabase-js.
// Must be an ES module so it can use module.register().

import { register } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
register('./supabase-hook.mjs', pathToFileURL(__dirname + '/'));
