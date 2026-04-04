/**
 * Database query tests - validates Supabase interactions for each table
 */
const request = require('supertest');

// ---------------------------------------------------------------------------
// Mock Supabase with controllable responses
// ---------------------------------------------------------------------------
const mockInsertSelect = jest.fn();
const _mockSelect = jest.fn();
const mockOrder = jest.fn();
const mockUpload = jest.fn();
const mockGetPublicUrl = jest.fn();

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn((tableName) => {
      // Track which table is being used via the resolved mock
      return {
        insert: jest.fn((rows) => ({
          select: () => mockInsertSelect(tableName, rows),
        })),
        select: jest.fn((cols) => ({
          order: (field, opts) => mockOrder(tableName, cols, field, opts),
        })),
      };
    }),
    storage: {
      from: jest.fn(() => ({
        upload: mockUpload,
        getPublicUrl: mockGetPublicUrl,
      })),
    },
  })),
}));

process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';

const { app } = require('../server');

// ---------------------------------------------------------------------------
// Registrations table
// ---------------------------------------------------------------------------
describe('Database: registrations table', () => {
  beforeEach(() => {
    mockInsertSelect.mockResolvedValue({
      data: [{ id: 'reg-uuid-001' }],
      error: null,
    });
  });

  it('should insert registration into correct table', async () => {
    await request(app)
      .post('/api/register')
      .send({ name: 'Test', email: 'test@example.com' });

    expect(mockInsertSelect).toHaveBeenCalledWith(
      'registrations',
      expect.arrayContaining([
        expect.objectContaining({ email: 'test@example.com' }),
      ]),
    );
  });

  it('should lowercase the email before inserting', async () => {
    await request(app)
      .post('/api/register')
      .send({ name: 'Test', email: 'TEST@EXAMPLE.COM' });

    expect(mockInsertSelect).toHaveBeenCalledWith(
      'registrations',
      expect.arrayContaining([
        expect.objectContaining({ email: 'test@example.com' }),
      ]),
    );
  });

  it('should return 500 when database returns an error', async () => {
    mockInsertSelect.mockResolvedValueOnce({
      data: null,
      error: { message: 'duplicate key value' },
    });

    const res = await request(app)
      .post('/api/register')
      .send({ name: 'Test', email: 'test@example.com' });

    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe('Internal server error.');
  });
});

// ---------------------------------------------------------------------------
// Fossil details table
// ---------------------------------------------------------------------------
describe('Database: fossil_details table', () => {
  beforeEach(() => {
    mockInsertSelect.mockResolvedValue({
      data: [{ id: 'fossil-uuid-001' }],
      error: null,
    });
  });

  it('should insert fossil details into correct table', async () => {
    await request(app)
      .post('/api/fossils/details')
      .send({ fossilName: 'Ammonite', fieldNumber: 'F001' });

    expect(mockInsertSelect).toHaveBeenCalledWith(
      'fossil_details',
      expect.arrayContaining([
        expect.objectContaining({ fossil_name: 'Ammonite', field_number: 'F001' }),
      ]),
    );
  });

  it('should store null for optional fields when not provided', async () => {
    await request(app)
      .post('/api/fossils/details')
      .send({ fossilName: 'Belemnite', fieldNumber: 'F002' });

    expect(mockInsertSelect).toHaveBeenCalledWith(
      'fossil_details',
      expect.arrayContaining([
        expect.objectContaining({
          scientific_name: null,
          description: null,
          location: null,
          age: null,
          collector_name: null,
        }),
      ]),
    );
  });

  it('should return 500 when database returns an error', async () => {
    mockInsertSelect.mockResolvedValueOnce({
      data: null,
      error: { message: 'connection timeout' },
    });

    const res = await request(app)
      .post('/api/fossils/details')
      .send({ fossilName: 'Ammonite', fieldNumber: 'F001' });

    expect(res.statusCode).toBe(500);
  });
});

// ---------------------------------------------------------------------------
// Fetch fossils query
// ---------------------------------------------------------------------------
describe('Database: GET /api/fossils query', () => {
  it('should query fossil_details table ordered by created_at desc', async () => {
    mockOrder.mockResolvedValue({
      data: [{ id: '1', fossil_name: 'Ammonite', created_at: '2024-01-01' }],
      error: null,
    });

    const res = await request(app).get('/api/fossils');

    expect(res.statusCode).toBe(200);
    expect(mockOrder).toHaveBeenCalledWith(
      'fossil_details',
      expect.anything(),
      'created_at',
      expect.objectContaining({ ascending: false }),
    );
  });

  it('should return 500 when database returns an error', async () => {
    mockOrder.mockResolvedValueOnce({
      data: null,
      error: { message: 'query error' },
    });

    const res = await request(app).get('/api/fossils');
    expect(res.statusCode).toBe(500);
  });
});
