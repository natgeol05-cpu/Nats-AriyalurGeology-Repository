-- Create registrations table (visitor registration submissions)
CREATE TABLE registrations (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    phone TEXT,
    institution TEXT,
    purpose TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create fossil_details table (fossil specimen submissions)
CREATE TABLE fossil_details (
    id SERIAL PRIMARY KEY,
    fossil_name TEXT NOT NULL,
    genus_species TEXT,
    formation TEXT,
    locality TEXT,
    age TEXT,
    classification TEXT,
    description TEXT,
    collector_name TEXT NOT NULL,
    collector_email TEXT CHECK (
        collector_email IS NULL
        OR collector_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
    ),
    field_number TEXT,
    image_urls TEXT[] DEFAULT '{}',
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create feedback table (visitor feedback messages)
CREATE TABLE feedback (
    id SERIAL PRIMARY KEY,
    feedback_text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Enable Row Level Security
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE fossil_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Public inserts for forms
CREATE POLICY "Allow public inserts on registrations"
ON registrations
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Allow public inserts on fossil_details"
ON fossil_details
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Allow public inserts on feedback"
ON feedback
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Authenticated reads
CREATE POLICY "Allow authenticated reads on registrations"
ON registrations
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated reads on fossil_details"
ON fossil_details
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated reads on feedback"
ON feedback
FOR SELECT
TO authenticated
USING (true);
