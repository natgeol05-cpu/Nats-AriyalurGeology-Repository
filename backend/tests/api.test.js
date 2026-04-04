/**
 * Unit tests for all API endpoints in server.js
 */
const request = require('supertest');

// Mock Supabase before requiring server
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      insert: jest.fn(() => ({
        select: jest.fn().mockResolvedValue({
          data: [{ id: 'test-uuid-1234' }],
          error: null,
        }),
      })),
      select: jest.fn(() => ({
        order: jest.fn().mockResolvedValue({
          data: [
            {
              id: 'test-uuid-1234',
              fossil_name: 'Ammonite',
              field_number: 'F001',
              created_at: '2024-01-01T00:00:00Z',
            },
          ],
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

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------
describe('GET /api/health', () => {
  it('should return status ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body).toHaveProperty('timestamp');
  });
});

// ---------------------------------------------------------------------------
// Registration endpoint
// ---------------------------------------------------------------------------
describe('POST /api/register', () => {
  it('should register a user with valid data', async () => {
    const res = await request(app)
      .post('/api/register')
      .send({ name: 'Test User', email: 'test@example.com', phone: '9876543210' });
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty('id');
  });

  it('should register without optional phone field', async () => {
    const res = await request(app)
      .post('/api/register')
      .send({ name: 'Test User', email: 'test@example.com' });
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
  });

  it('should reject missing name', async () => {
    const res = await request(app)
      .post('/api/register')
      .send({ email: 'test@example.com' });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/name.*required|required.*name/i);
  });

  it('should reject missing email', async () => {
    const res = await request(app)
      .post('/api/register')
      .send({ name: 'Test User' });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/email.*required|required.*email/i);
  });

  it('should reject invalid email format', async () => {
    const res = await request(app)
      .post('/api/register')
      .send({ name: 'Test User', email: 'not-an-email' });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/invalid email/i);
  });

  it('should reject invalid phone format', async () => {
    const res = await request(app)
      .post('/api/register')
      .send({ name: 'Test User', email: 'test@example.com', phone: 'abc' });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/invalid phone/i);
  });

  it('should reject empty body', async () => {
    const res = await request(app)
      .post('/api/register')
      .send({});
    expect(res.statusCode).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// Fossil details endpoint
// ---------------------------------------------------------------------------
describe('POST /api/fossils/details', () => {
  it('should save fossil details with all fields', async () => {
    const res = await request(app)
      .post('/api/fossils/details')
      .send({
        fossilName: 'Ammonite',
        scientificName: 'Acanthoceras',
        description: 'A spiral-shaped fossil',
        location: 'Ariyalur, Tamil Nadu',
        age: 'Cretaceous',
        imageUrls: ['https://example.com/image1.jpg'],
        collectorName: 'Dr. Smith',
        fieldNumber: 'F001',
      });
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty('id');
  });

  it('should save fossil details with only required fields', async () => {
    const res = await request(app)
      .post('/api/fossils/details')
      .send({ fossilName: 'Belemnite', fieldNumber: 'F002' });
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
  });

  it('should reject missing fossilName', async () => {
    const res = await request(app)
      .post('/api/fossils/details')
      .send({ fieldNumber: 'F003' });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/fossil name.*required|required.*fossil name/i);
  });

  it('should reject missing fieldNumber', async () => {
    const res = await request(app)
      .post('/api/fossils/details')
      .send({ fossilName: 'Ammonite' });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/field number.*required|required.*field number/i);
  });
});

// ---------------------------------------------------------------------------
// Get all fossils endpoint
// ---------------------------------------------------------------------------
describe('GET /api/fossils', () => {
  it('should return a list of fossils', async () => {
    const res = await request(app).get('/api/fossils');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.fossils)).toBe(true);
    expect(res.body.fossils.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Image upload endpoint
// ---------------------------------------------------------------------------
describe('POST /api/fossils/upload', () => {
  it('should upload a valid JPEG image', async () => {
    // Create a minimal JPEG buffer (just enough to pass multer MIME check via Content-Type)
    const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
    const res = await request(app)
      .post('/api/fossils/upload')
      .attach('images', jpegBuffer, { filename: 'test.jpg', contentType: 'image/jpeg' });
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.urls)).toBe(true);
  });

  it('should reject request with no files', async () => {
    const res = await request(app)
      .post('/api/fossils/upload');
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/image file.*required|required.*image/i);
  });

  it('should reject non-image file type', async () => {
    const pdfBuffer = Buffer.from('%PDF-1.4');
    const res = await request(app)
      .post('/api/fossils/upload')
      .attach('images', pdfBuffer, { filename: 'document.pdf', contentType: 'application/pdf' });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/invalid file type/i);
  });
});
