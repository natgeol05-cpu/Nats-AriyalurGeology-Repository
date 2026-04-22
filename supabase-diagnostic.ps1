param(
    [string]$AppHealthUrl = $env:APP_HEALTH_URL
)

$ErrorActionPreference = "Stop"

function Get-ConfigValue {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Name
    )

    $currentValue = [Environment]::GetEnvironmentVariable($Name)
    if (-not [string]::IsNullOrWhiteSpace($currentValue)) {
        return $currentValue.Trim()
    }

    $envFilePath = Join-Path -Path $PSScriptRoot -ChildPath ".env"
    if (Test-Path -LiteralPath $envFilePath) {
        $line = Get-Content -LiteralPath $envFilePath |
            Where-Object { $_ -match "^\s*$Name\s*=" } |
            Select-Object -First 1

        if ($line) {
            return ($line -split "=", 2)[1].Trim()
        }
    }

    return $null
}

Write-Host "== Supabase configuration diagnostic (PowerShell) =="

$supabaseUrl = Get-ConfigValue -Name "SUPABASE_URL"
$supabaseServiceRoleKey = Get-ConfigValue -Name "SUPABASE_SERVICE_ROLE_KEY"

$missingVars = @()
if ([string]::IsNullOrWhiteSpace($supabaseUrl)) { $missingVars += "SUPABASE_URL" }
if ([string]::IsNullOrWhiteSpace($supabaseServiceRoleKey)) { $missingVars += "SUPABASE_SERVICE_ROLE_KEY" }

if ($missingVars.Count -gt 0) {
    Write-Host "FAIL: Missing required environment variables: $($missingVars -join ', ')"
    Write-Host "Action: set them in your shell/.env and Vercel Project Settings -> Environment Variables."
    exit 1
}
Write-Host "PASS: Required environment variables are set."

if ($supabaseUrl -notmatch "^https://.*\.supabase\.co$") {
    Write-Host "FAIL: SUPABASE_URL does not look valid: $supabaseUrl"
    Write-Host "Action: use the exact Project URL from Supabase Settings -> API."
    exit 1
}
Write-Host "PASS: SUPABASE_URL format looks correct."

try {
    $response = Invoke-WebRequest `
        -Uri "$supabaseUrl/rest/v1/" `
        -Headers @{
            "apikey" = $supabaseServiceRoleKey
            "Authorization" = "Bearer $supabaseServiceRoleKey"
        } `
        -TimeoutSec 10 `
        -UseBasicParsing

    if ($response.StatusCode -eq 200) {
        Write-Host "PASS: Supabase REST endpoint is reachable with provided key (HTTP 200)."
    } else {
        Write-Host "FAIL: Supabase REST endpoint check failed (HTTP $($response.StatusCode))."
        Write-Host "Action: verify SUPABASE_SERVICE_ROLE_KEY value and project URL."
        exit 1
    }
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    if ($statusCode) {
        Write-Host "FAIL: Supabase REST endpoint check failed (HTTP $statusCode)."
    } else {
        Write-Host "FAIL: Could not reach Supabase REST endpoint."
    }
    Write-Host "Action: verify SUPABASE_SERVICE_ROLE_KEY value, project URL, and connectivity."
    exit 1
}

if (-not [string]::IsNullOrWhiteSpace($AppHealthUrl)) {
    try {
        $healthResponse = Invoke-WebRequest -Uri $AppHealthUrl -TimeoutSec 10 -UseBasicParsing
        if ($healthResponse.StatusCode -eq 200) {
            Write-Host "PASS: App health endpoint reachable (HTTP 200): $AppHealthUrl"
        } else {
            Write-Host "WARN: App health endpoint returned HTTP $($healthResponse.StatusCode): $AppHealthUrl"
        }
    } catch {
        $healthStatusCode = $_.Exception.Response.StatusCode.value__
        if ($healthStatusCode) {
            Write-Host "WARN: App health endpoint returned HTTP $($healthStatusCode): $AppHealthUrl"
        } else {
            Write-Host "WARN: App health endpoint check failed: $AppHealthUrl"
        }
    }
}

Write-Host "Diagnostic completed successfully."
