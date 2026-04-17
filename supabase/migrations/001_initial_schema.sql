-- Migration file

CREATE TABLE feedback (
    id SERIAL PRIMARY KEY,
    feedback_text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inserting sample data
INSERT INTO feedback (feedback_text) VALUES ('Great service!');
