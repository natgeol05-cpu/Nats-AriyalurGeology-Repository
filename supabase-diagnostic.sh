#!/bin/bash

# supabase-diagnostic.sh - A diagnostic script to test Supabase connectivity and database setup

# Check if required environment variables are set
if [[ -z "$SUPABASE_URL" || -z "$SUPABASE_SERVICE_ROLE_KEY" ]]; then
    echo "FAIL: Required environment variables are not set."
    exit 1
else
    echo "PASS: Required environment variables are set."
fi

# Test connection to Supabase
response=$(curl -o /dev/null --silent --head --write-out '%{http_code}' "$SUPABASE_URL")
if [ "$response" -eq 200 ]; then
    echo "PASS: Connection to Supabase established."
else
    echo "FAIL: Unable to connect to Supabase. Status code: $response"
    exit 1
fi

# Verify database tables exist
tables=("registrations" "fossil_details")
for table in "${tables[@]}"; do
    result=$(psql -U postgres -d your_database_name -c "
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = '$table'
    );")
    if echo "$result" | grep -q "t"; then
        echo "PASS: Table $table exists."
    else
        echo "FAIL: Table $table does not exist."
        exit 1
    fi
done

# Check if storage bucket exists
bucket_exists=$(supabase storage list | grep "your_bucket_name")
if [[ -n "$bucket_exists" ]]; then
    echo "PASS: Storage bucket exists."
else
    echo "FAIL: Storage bucket does not exist."
    exit 1
fi

# Verify RLS policies are enabled
rls_status=$(psql -U postgres -d your_database_name -c "SHOW row_security")
if [[ "$rls_status" == *"on"* ]]; then
    echo "PASS: RLS policies are enabled."
else
    echo "FAIL: RLS policies are not enabled."
    exit 1
fi

# Test inserting a sample record
insert_result=$(psql -U postgres -d your_database_name -c "INSERT INTO registrations (name, created_at) VALUES ('Test User', NOW()) RETURNING id;")
if [[ -n "$insert_result" ]]; then
    echo "PASS: Sample record inserted successfully."
else
    echo "FAIL: Sample record insertion failed."
    exit 1
fi

echo "Diagnostic completed successfully."