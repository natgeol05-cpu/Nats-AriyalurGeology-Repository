/**
 * Performance tests for API endpoints.
 * Measures response times under sequential load and validates they meet SLA thresholds.
 */
const request = require('supertest');

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      insert: jest.fn(() => ({
        select: jest.fn().mockResolvedValue({
          data: [{ id: 'perf-uuid' }],
          error: null,
        }),
      })),
      select: jest.fn(() => ({
        order: jest.fn().mockResolvedValue({
          data: Array.from({ length: 50 }, (_, i) => ({
            id: `fossil-${i}`,
            fossil_name: `Fossil ${i}`,
            field_number: `F${i.toString().padStart(3, '0')}`,
            created_at: new Date().toISOString(),
          })),
          error: null,
        }),
      })),
    })),
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn().mockResolvedValue({ error: null }),
        getPublicUrl: jest.fn().mockReturnValue({
          data: { publicUrl: 'https://example.supabase.co/storage/v1/object/public/fossil-images/fossils/test.jpg' },
        }),
      })),
    },
  })),
}));

process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';

const { app } = require('../server');

// SLA thresholds (ms)
const SLA = {
  health: 100,
  register: 500,
  fossilDetails: 500,
  getFossils: 300,
  upload: 1000,
};

/**
 * Measure the elapsed time of an async function in milliseconds.
 * @param {() => Promise<*>} fn
 * @returns {Promise<{result: *, elapsed: number}>}
 */
async function measureTime(fn) {
  const start = Date.now();
  const result = await fn();
  const elapsed = Date.now() - start;
  return { result, elapsed };
}

describe('Performance: response time SLA', () => {
  it(`GET /api/health should respond within ${SLA.health}ms`, async () => {
    const { elapsed } = await measureTime(() => request(app).get('/api/health'));
    expect(elapsed).toBeLessThan(SLA.health);
  });

  it(`POST /api/register should respond within ${SLA.register}ms`, async () => {
    const { elapsed } = await measureTime(() =>
      request(app)
        .post('/api/register')
        .send({ name: 'Perf Test', email: 'perf@example.com' }),
    );
    expect(elapsed).toBeLessThan(SLA.register);
  });

  it(`POST /api/fossils/details should respond within ${SLA.fossilDetails}ms`, async () => {
    const { elapsed } = await measureTime(() =>
      request(app)
        .post('/api/fossils/details')
        .send({ fossilName: 'Perf Fossil', fieldNumber: 'PF001' }),
    );
    expect(elapsed).toBeLessThan(SLA.fossilDetails);
  });

  it(`GET /api/fossils should respond within ${SLA.getFossils}ms`, async () => {
    const { elapsed } = await measureTime(() => request(app).get('/api/fossils'));
    expect(elapsed).toBeLessThan(SLA.getFossils);
  });
});

describe('Performance: sequential load', () => {
  const REQUESTS = 20;

  it(`should handle ${REQUESTS} sequential POST /api/register requests`, async () => {
    const times = [];
    for (let i = 0; i < REQUESTS; i++) {
      const { elapsed } = await measureTime(() =>
        request(app)
          .post('/api/register')
          .send({ name: `Load User ${i}`, email: `load${i}@example.com` }),
      );
      times.push(elapsed);
    }

    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    const max = Math.max(...times);

    console.log(`Register ${REQUESTS} requests - avg: ${avg.toFixed(1)}ms, max: ${max}ms`);
    expect(avg).toBeLessThan(SLA.register);
  });

  it(`should handle ${REQUESTS} sequential GET /api/fossils requests`, async () => {
    const times = [];
    for (let i = 0; i < REQUESTS; i++) {
      const { elapsed } = await measureTime(() => request(app).get('/api/fossils'));
      times.push(elapsed);
    }

    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    const max = Math.max(...times);

    console.log(`GET fossils ${REQUESTS} requests - avg: ${avg.toFixed(1)}ms, max: ${max}ms`);
    expect(avg).toBeLessThan(SLA.getFossils);
  });
});

describe('Performance: GET /api/fossils with large dataset', () => {
  it('should return 50 fossils within SLA', async () => {
    const { result, elapsed } = await measureTime(() => request(app).get('/api/fossils'));
    expect(result.body.fossils).toHaveLength(50);
    expect(elapsed).toBeLessThan(SLA.getFossils);
  });
});
