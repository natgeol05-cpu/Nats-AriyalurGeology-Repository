// tests/api.test.cjs
// Unit tests for the Ariyalur Geology API functions
// Tests run without a real Supabase connection by mocking the client
//
// The @supabase/supabase-js mock is provided by the ESM loader hook in
// supabase-hook.mjs (registered via tests/mock-loader.mjs via --import).
// Mock state is shared via a temporary JSON file so this CJS file can
// control it between test cases.

'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

// ──────────────────────────────────────────────────────────────
// Mock config – written to a temp file that the ESM hook reads
// ──────────────────────────────────────────────────────────────
const CONFIG_FILE = path.join(os.tmpdir(), 'supabase-mock-config.json');

const supabaseMockConfig = {
  insertError: null,
  uploadError: null,
  selectError: null,
};

function updateConfig() {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(supabaseMockConfig));
}

// Initialise config file before loading handlers
updateConfig();

// Set env vars before loading handlers
process.env.SUPABASE_URL = 'https://mock.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-service-key';

// Node 22+ allows require() of synchronous ES modules; the .default property
// holds the exported handler function.
const registerHandler = require('../api/register').default;
const fossilHandler   = require('../api/fossil-details').default;
const fossilsAliasHandler = require('../api/fossils').default;
const uploadHandler   = require('../api/upload-image').default;
const uploadAliasHandler = require('../api/upload').default;
const healthHandler   = require('../api/health').default;
const rootHealthHandler = require('../health').default;

// ──────────────────────────────────────────────────────────────
// Minimal test helpers
// ──────────────────────────────────────────────────────────────
function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed');
}

function mockReq(method, body) {
  return { method: method || 'POST', body: body || {} };
}

function mockRes() {
  const res = {
    _status: null,
    _body:   null,
    _headers: {},
    status(code)       { this._status = code; return this; },
    json(body)         { this._body = body;   return this; },
    end()              { return this; },
    setHeader(k, v)    { this._headers[k] = v; },
  };
  return res;
}

// ──────────────────────────────────────────────────────────────
// Main test runner (async function – avoids top-level await issues)
// ──────────────────────────────────────────────────────────────
async function runTests() {
  let passCount = 0;
  let failCount = 0;
  const failures = [];

  async function test(name, fn) {
    try {
      await fn();
      console.log('  \u2713 ' + name);
      passCount++;
    } catch (err) {
      console.error('  \u2717 ' + name);
      console.error('    ' + err.message);
      failCount++;
      failures.push({ name, error: err.message });
    }
  }

  // ════════════════════════════════════════════════════════════
  // /api/register
  // ════════════════════════════════════════════════════════════
  console.log('\n/api/register');

  await test('returns 405 for GET requests', async () => {
    const res = mockRes();
    await registerHandler(mockReq('PATCH'), res);
    assert(res._status === 405, 'Expected 405, got ' + res._status);
    assert(res._body.success === false, 'Expected success: false');
  });

  await test('returns 200 for OPTIONS (CORS preflight)', async () => {
    const res = mockRes();
    await registerHandler(mockReq('OPTIONS'), res);
    assert(res._status === 200, 'Expected 200, got ' + res._status);
  });

  await test('returns 200 for GET requests', async () => {
    const res = mockRes();
    await registerHandler(mockReq('GET'), res);
    assert(res._status === 200, 'Expected 200, got ' + res._status);
    assert(res._body.success === true, 'Expected success: true');
    assert(Array.isArray(res._body.registrations), 'Expected registrations array');
  });

  await test('returns 400 when name is missing', async () => {
    const res = mockRes();
    await registerHandler(mockReq('POST', { email: 'test@test.com' }), res);
    assert(res._status === 400, 'Expected 400, got ' + res._status);
    assert(res._body && res._body.error, 'Expected error message');
    assert(res._body.success === false, 'Expected success: false');
  });

  await test('returns 400 when email is missing', async () => {
    const res = mockRes();
    await registerHandler(mockReq('POST', { name: 'Test User' }), res);
    assert(res._status === 400, 'Expected 400, got ' + res._status);
  });

  await test('returns 400 for invalid email format', async () => {
    const res = mockRes();
    await registerHandler(mockReq('POST', { name: 'Test', email: 'not-an-email' }), res);
    assert(res._status === 400, 'Expected 400, got ' + res._status);
    assert(res._body.error.toLowerCase().includes('email'), 'Error should mention email');
  });

  await test('returns 400 for whitespace-only name', async () => {
    const res = mockRes();
    await registerHandler(mockReq('POST', { name: '   ', email: 'test@test.com' }), res);
    assert(res._status === 400, 'Expected 400, got ' + res._status);
    assert(res._body.success === false, 'Expected success: false');
  });

  await test('returns 201 on successful registration', async () => {
    supabaseMockConfig.insertError = null;
    updateConfig();
    const res = mockRes();
    await registerHandler(mockReq('POST', {
      name: ' Dr Ayyaswami ', email: ' AYYASWAMI@geology.com ', phone: '9999999999',
    }), res);
    assert(res._status === 201, 'Expected 201, got ' + res._status);
    assert(res._body.success === true, 'Expected success: true');
    assert(res._body.registration_id, 'Expected registration_id');
    assert(res._body.message.includes('Dr Ayyaswami'), 'Expected trimmed name in message');
  });

  await test('returns 500 on database error', async () => {
    supabaseMockConfig.insertError = { message: 'DB error' };
    updateConfig();
    const res = mockRes();
    await registerHandler(mockReq('POST', { name: 'Test', email: 'test@test.com' }), res);
    assert(res._status === 500, 'Expected 500, got ' + res._status);
    supabaseMockConfig.insertError = null;
    updateConfig();
  });

  // ════════════════════════════════════════════════════════════
  // /api/fossil-details
  // ════════════════════════════════════════════════════════════
  console.log('\n/api/fossil-details');

  await test('returns 405 for PUT requests', async () => {
    const res = mockRes();
    await fossilHandler(mockReq('PUT'), res);
    assert(res._status === 405, 'Expected 405, got ' + res._status);
  });

  await test('returns 400 when fossil_name is missing', async () => {
    const res = mockRes();
    await fossilHandler(mockReq('POST', {
      collector_name: 'Test', collector_email: 'test@test.com',
    }), res);
    assert(res._status === 400, 'Expected 400, got ' + res._status);
  });

  await test('returns 400 for invalid collector email', async () => {
    const res = mockRes();
    await fossilHandler(mockReq('POST', {
      fossil_name: 'Ammonite', collector_name: 'Test', collector_email: 'bad-email',
    }), res);
    assert(res._status === 400, 'Expected 400, got ' + res._status);
  });

  await test('returns 201 on successful fossil submission', async () => {
    supabaseMockConfig.insertError = null;
    updateConfig();
    const res = mockRes();
    await fossilHandler(mockReq('POST', {
      fossil_name:     'Calycoceras',
      genus_species:   'Calycoceras newboldi',
      formation:       'Trichinopoly Group',
      locality:        'Ariyalur',
      collector_name:  'Dr Gowtham',
      collector_email: 'gowtham@geology.com',
      field_number:    'NAT-2024-001',
      image_urls:      ['https://example.com/fossil1.jpg'],
    }), res);
    assert(res._status === 201, 'Expected 201, got ' + res._status);
    assert(res._body.success === true, 'Expected success: true');
    assert(res._body.submission_id, 'Expected submission_id');
  });

  await test('accepts compatibility payload on /api/fossils alias', async () => {
    const res = mockRes();
    await fossilsAliasHandler(mockReq('POST', {
      name: 'Ammonite',
      scientific_name: 'Calycoceras newboldi',
      period: 'Turonian',
      location: 'Ariyalur',
      description: 'Well-preserved specimen',
      submitted_by: 'Research Student',
    }), res);
    assert(res._status === 201, 'Expected 201, got ' + res._status);
    assert(res._body.success === true, 'Expected success: true');
  });

  // ════════════════════════════════════════════════════════════
  // /api/upload-image
  // ════════════════════════════════════════════════════════════
  console.log('\n/api/upload-image');

  await test('returns 405 for GET requests', async () => {
    const res = mockRes();
    await uploadHandler(mockReq('GET'), res);
    assert(res._status === 405, 'Expected 405, got ' + res._status);
  });

  await test('returns 400 when file_name is missing', async () => {
    const res = mockRes();
    await uploadHandler(mockReq('POST', { file_type: 'image/jpeg', file_data: 'abc' }), res);
    assert(res._status === 400, 'Expected 400, got ' + res._status);
  });

  await test('returns 400 for disallowed file type', async () => {
    const res = mockRes();
    await uploadHandler(mockReq('POST', {
      file_name: 'doc.pdf', file_type: 'application/pdf', file_data: 'abc',
    }), res);
    assert(res._status === 400, 'Expected 400, got ' + res._status);
    assert(res._body.error.toLowerCase().includes('file type'), 'Error should mention file type');
  });

  await test('returns 400 when file exceeds 250 KB', async () => {
    const res = mockRes();
    await uploadHandler(mockReq('POST', {
      file_name: 'big.jpg', file_type: 'image/jpeg',
      file_size: 300 * 1024, file_data: 'abc',
    }), res);
    assert(res._status === 400, 'Expected 400, got ' + res._status);
    assert(res._body.error.includes('250KB'), 'Error should mention 250KB limit');
  });

  await test('returns 201 on successful image upload', async () => {
    supabaseMockConfig.uploadError = null;
    updateConfig();
    // Minimal valid base64 JPEG (1x1 pixel, ~100 bytes decoded)
    const tiny1x1 = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAARCAABAAEDASIAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AJQAB/9k=';
    const res = mockRes();
    await uploadHandler(mockReq('POST', {
      file_name: 'fossil.jpg', file_type: 'image/jpeg',
      file_data: tiny1x1, field_number: 'NAT-2024-001',
    }), res);
    assert(res._status === 201, 'Expected 201, got ' + res._status);
    assert(res._body.success === true, 'Expected success: true');
    assert(res._body.public_url, 'Expected public_url');
  });

  await test('returns 201 on successful image upload via /api/upload alias', async () => {
    const tiny1x1 = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAARCAABAAEDASIAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AJQAB/9k=';
    const res = mockRes();
    await uploadAliasHandler(mockReq('POST', {
      file_name: 'fossil.jpg', file_type: 'image/jpeg',
      file_data: tiny1x1, field_number: 'NAT-2024-001',
    }), res);
    assert(res._status === 201, 'Expected 201, got ' + res._status);
    assert(res._body.success === true, 'Expected success: true');
  });

  // ════════════════════════════════════════════════════════════
  // /api/health
  // ════════════════════════════════════════════════════════════
  console.log('\n/api/health');

  await test('returns 200 with all systems ok', async () => {
    const res = mockRes();
    await healthHandler(mockReq('GET'), res);
    assert(res._status === 200, 'Expected 200, got ' + res._status);
    assert(res._body.api === 'ok', 'Expected api: ok');
  });

  await test('returns 200 on /health root alias', async () => {
    const res = mockRes();
    await rootHealthHandler(mockReq('GET'), res);
    assert(res._status === 200, 'Expected 200, got ' + res._status);
    assert(res._body.api === 'ok', 'Expected api: ok');
  });

  // ──────────────────────────────────────────────────────────
  // Summary
  // ──────────────────────────────────────────────────────────
  console.log('\n' + '-'.repeat(50));
  console.log('Tests: ' + (passCount + failCount) + ' total, ' + passCount + ' passed, ' + failCount + ' failed');

  if (failures.length > 0) {
    console.error('\nFailed tests:');
    failures.forEach(function (f) { console.error('  x ' + f.name + ': ' + f.error); });
    process.exit(1);
  } else {
    console.log('\nAll tests passed!');
    process.exit(0);
  }
}

runTests().catch(function (err) {
  console.error('Test runner error:', err);
  process.exit(1);
});
