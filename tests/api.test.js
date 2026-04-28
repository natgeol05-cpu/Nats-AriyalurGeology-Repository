// tests/api.test.js
// Unit tests for the Ariyalur Geology API functions
// Tests run without a real Supabase connection by mocking the client

'use strict';

// ──────────────────────────────────────────────────────────────
// Mock @supabase/supabase-js so tests don't need real credentials
// Must be set up BEFORE requiring the API handlers
// ──────────────────────────────────────────────────────────────
const Module = require('module');
const _originalLoad = Module._load;

const supabaseMockConfig = {
  insertError: null,
  uploadError: null,
  selectError: null,
};

Module._load = function (request, parent, isMain) {
  if (request === '@supabase/supabase-js') {
    return {
      createClient: () => ({
        from: () => ({
          insert: () => ({
            select: () => Promise.resolve({
              data: supabaseMockConfig.insertError
                ? null
                : [{ id: 'mock-uuid-123', name: 'Test', email: 'test@test.com',
                     registered_at: new Date().toISOString(),
                     fossil_name: 'Ammonite', submitted_at: new Date().toISOString() }],
              error: supabaseMockConfig.insertError,
            }),
          }),
          select: () => ({
            eq: () => ({
              order: () => Promise.resolve({
                data: supabaseMockConfig.selectError ? null : [],
                error: supabaseMockConfig.selectError,
              }),
            }),
          }),
        }),
        storage: {
          from: () => ({
            upload: () => Promise.resolve({
              data: supabaseMockConfig.uploadError ? null : { path: 'fossils/test.jpg' },
              error: supabaseMockConfig.uploadError,
            }),
            getPublicUrl: () => ({
              data: { publicUrl: 'https://example.supabase.co/storage/v1/object/public/fossil-images/fossils/test.jpg' },
            }),
          }),
          listBuckets: () => Promise.resolve({ error: null }),
        },
      }),
    };
  }
  return _originalLoad.apply(this, arguments);
};

// Set env vars before loading handlers
process.env.SUPABASE_URL = 'https://mock.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-service-key';

const registerHandler = require('../api/register');
const fossilHandler   = require('../api/fossil-details');
const uploadHandler   = require('../api/upload-image');
const healthHandler   = require('../api/health');

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
    await registerHandler(mockReq('GET'), res);
    assert(res._status === 405, 'Expected 405, got ' + res._status);
  });

  await test('returns 200 for OPTIONS (CORS preflight)', async () => {
    const res = mockRes();
    await registerHandler(mockReq('OPTIONS'), res);
    assert(res._status === 200, 'Expected 200, got ' + res._status);
  });

  await test('returns 400 when name is missing', async () => {
    const res = mockRes();
    await registerHandler(mockReq('POST', { email: 'test@test.com' }), res);
    assert(res._status === 400, 'Expected 400, got ' + res._status);
    assert(res._body && res._body.error, 'Expected error message');
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

  await test('returns 201 on successful registration', async () => {
    supabaseMockConfig.insertError = null;
    const res = mockRes();
    await registerHandler(mockReq('POST', {
      name: 'Dr Ayyaswami', email: 'ayyaswami@geology.com', phone: '9999999999',
    }), res);
    assert(res._status === 201, 'Expected 201, got ' + res._status);
    assert(res._body.success === true, 'Expected success: true');
    assert(res._body.registration_id, 'Expected registration_id');
  });

  await test('returns 500 on database error', async () => {
    supabaseMockConfig.insertError = { message: 'DB error' };
    const res = mockRes();
    await registerHandler(mockReq('POST', { name: 'Test', email: 'test@test.com' }), res);
    assert(res._status === 500, 'Expected 500, got ' + res._status);
    supabaseMockConfig.insertError = null;
  });

  await test('returns 409 on duplicate email registration', async () => {
    supabaseMockConfig.insertError = { code: '23505', message: 'duplicate key value violates unique constraint' };
    const res = mockRes();
    await registerHandler(mockReq('POST', { name: 'Test', email: 'test@test.com' }), res);
    assert(res._status === 409, 'Expected 409, got ' + res._status);
    assert(res._body.error.toLowerCase().includes('already registered'), 'Error should mention already registered');
    supabaseMockConfig.insertError = null;
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

