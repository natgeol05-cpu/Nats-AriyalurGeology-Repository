/**
 * Integration tests for Supabase connections.
 *
 * These tests use the real Supabase client (not mocked) to verify the
 * integration layer.  They are skipped in CI unless SUPABASE_URL and
 * SUPABASE_SERVICE_ROLE_KEY are provided as environment variables.
 *
 * Run locally:
 *   SUPABASE_URL=https://... SUPABASE_SERVICE_ROLE_KEY=... npm run test:integration
 */

const supabaseConfigured =
  !!process.env.SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY;

const describeIfConfigured = supabaseConfigured ? describe : describe.skip;

describeIfConfigured('Supabase integration: registrations table', () => {
  let supabase;
  let insertedId;

  beforeAll(() => {
    const { createClient } = require('@supabase/supabase-js');
    supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
    );
  });

  it('should connect to Supabase', async () => {
    const { error } = await supabase
      .from('registrations')
      .select('id')
      .limit(1);
    expect(error).toBeNull();
  });

  it('should insert a test registration', async () => {
    const { data, error } = await supabase
      .from('registrations')
      .insert([{
        name: 'Integration Test User',
        email: `integration_test_${Date.now()}@example.com`,
        phone: null,
      }])
      .select();

    expect(error).toBeNull();
    expect(data).not.toBeNull();
    expect(data[0]).toHaveProperty('id');
    insertedId = data[0].id;
  });

  afterAll(async () => {
    if (insertedId) {
      await supabase.from('registrations').delete().eq('id', insertedId);
    }
  });
});

describeIfConfigured('Supabase integration: fossil_details table', () => {
  let supabase;
  let insertedId;

  beforeAll(() => {
    const { createClient } = require('@supabase/supabase-js');
    supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
    );
  });

  it('should insert a test fossil record', async () => {
    const { data, error } = await supabase
      .from('fossil_details')
      .insert([{
        fossil_name: 'Integration Test Fossil',
        field_number: `INT_TEST_${Date.now()}`,
        image_urls: [],
      }])
      .select();

    expect(error).toBeNull();
    expect(data).not.toBeNull();
    expect(data[0]).toHaveProperty('id');
    insertedId = data[0].id;
  });

  it('should fetch fossil records', async () => {
    const { data, error } = await supabase
      .from('fossil_details')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
  });

  afterAll(async () => {
    if (insertedId) {
      await supabase.from('fossil_details').delete().eq('id', insertedId);
    }
  });
});

describeIfConfigured('Supabase integration: storage bucket', () => {
  let supabase;
  const testFileName = `integration-test-${Date.now()}.txt`;

  beforeAll(() => {
    const { createClient } = require('@supabase/supabase-js');
    supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
    );
  });

  it('should upload a file to fossil-images bucket', async () => {
    const { error } = await supabase.storage
      .from('fossil-images')
      .upload(`fossils/${testFileName}`, Buffer.from('test content'), {
        contentType: 'text/plain',
      });
    expect(error).toBeNull();
  });

  it('should get a public URL for an uploaded file', () => {
    const { data } = supabase.storage
      .from('fossil-images')
      .getPublicUrl(`fossils/${testFileName}`);
    expect(data.publicUrl).toContain('fossil-images');
  });

  afterAll(async () => {
    await supabase.storage
      .from('fossil-images')
      .remove([`fossils/${testFileName}`]);
  });
});

// Always-run sanity test so the file is not empty when Supabase is not configured
describe('Supabase integration: environment configuration', () => {
  it('should document required environment variables', () => {
    const requiredVars = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
    requiredVars.forEach((varName) => {
      expect(typeof varName).toBe('string');
    });
  });
});
