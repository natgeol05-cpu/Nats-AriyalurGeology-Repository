const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Function to verify environment variables
const verifyEnvVariables = () => {
    const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_KEY'];
    const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

    if (missingEnvVars.length > 0) {
        return `Missing required environment variables: ${missingEnvVars.join(', ')}`;
    }
    return 'All required environment variables are set.';
};

// Function to test Supabase connectivity
const testSupabaseConnectivity = async () => {
    const { data, error } = await supabase.from('test_table').select('*');
    if (error) {
        return `Supabase connectivity test failed: ${error.message}`;
    }
    return 'Supabase connectivity test successful.';
};

// Endpoint handler
const handleDiagnose = async (req, res) => {
    const envVerificationResult = verifyEnvVariables();
    const supabaseTestResult = await testSupabaseConnectivity();

    res.json({
        envVerificationResult,
        supabaseTestResult
    });
};

module.exports = handleDiagnose;