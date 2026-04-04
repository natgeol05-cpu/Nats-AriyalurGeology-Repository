/**
 * File upload validation tests
 */
const request = require('supertest');

// Mock Supabase
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(),
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

describe('File upload validation', () => {
  const createImageBuffer = (size = 1024) => Buffer.alloc(size, 0xff);

  it('should accept JPEG files', async () => {
    const res = await request(app)
      .post('/api/fossils/upload')
      .attach('images', createImageBuffer(), { filename: 'photo.jpg', contentType: 'image/jpeg' });
    expect(res.statusCode).toBe(201);
  });

  it('should accept JPG files', async () => {
    const res = await request(app)
      .post('/api/fossils/upload')
      .attach('images', createImageBuffer(), { filename: 'photo.jpg', contentType: 'image/jpg' });
    expect(res.statusCode).toBe(201);
  });

  it('should accept PNG files', async () => {
    const res = await request(app)
      .post('/api/fossils/upload')
      .attach('images', createImageBuffer(), { filename: 'photo.png', contentType: 'image/png' });
    expect(res.statusCode).toBe(201);
  });

  it('should accept GIF files', async () => {
    const res = await request(app)
      .post('/api/fossils/upload')
      .attach('images', createImageBuffer(), { filename: 'photo.gif', contentType: 'image/gif' });
    expect(res.statusCode).toBe(201);
  });

  it('should reject files exceeding 250 KB', async () => {
    const largeBuffer = Buffer.alloc(300 * 1024); // 300 KB
    const res = await request(app)
      .post('/api/fossils/upload')
      .attach('images', largeBuffer, { filename: 'large.jpg', contentType: 'image/jpeg' });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/250 KB|file size/i);
  });

  it('should reject PDF files', async () => {
    const res = await request(app)
      .post('/api/fossils/upload')
      .attach('images', createImageBuffer(), { filename: 'document.pdf', contentType: 'application/pdf' });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/invalid file type/i);
  });

  it('should reject text files', async () => {
    const res = await request(app)
      .post('/api/fossils/upload')
      .attach('images', Buffer.from('hello world'), { filename: 'text.txt', contentType: 'text/plain' });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/invalid file type/i);
  });

  it('should accept up to 4 images at once', async () => {
    const res = await request(app)
      .post('/api/fossils/upload')
      .attach('images', createImageBuffer(), { filename: '1.jpg', contentType: 'image/jpeg' })
      .attach('images', createImageBuffer(), { filename: '2.jpg', contentType: 'image/jpeg' })
      .attach('images', createImageBuffer(), { filename: '3.jpg', contentType: 'image/jpeg' })
      .attach('images', createImageBuffer(), { filename: '4.jpg', contentType: 'image/jpeg' });
    expect(res.statusCode).toBe(201);
    expect(res.body.urls).toHaveLength(4);
  });

  it('should reject more than 4 images', async () => {
    const res = await request(app)
      .post('/api/fossils/upload')
      .attach('images', createImageBuffer(), { filename: '1.jpg', contentType: 'image/jpeg' })
      .attach('images', createImageBuffer(), { filename: '2.jpg', contentType: 'image/jpeg' })
      .attach('images', createImageBuffer(), { filename: '3.jpg', contentType: 'image/jpeg' })
      .attach('images', createImageBuffer(), { filename: '4.jpg', contentType: 'image/jpeg' })
      .attach('images', createImageBuffer(), { filename: '5.jpg', contentType: 'image/jpeg' });
    expect(res.statusCode).toBe(400);
  });

  it('should return URLs with supabase storage path', async () => {
    const res = await request(app)
      .post('/api/fossils/upload')
      .attach('images', createImageBuffer(), { filename: 'test.png', contentType: 'image/png' });
    expect(res.statusCode).toBe(201);
    expect(res.body.urls[0]).toContain('supabase');
  });
});
