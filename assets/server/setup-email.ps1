# ============================================================================
# setup-email.ps1 — put your Google App Password into .env
# ----------------------------------------------------------------------------
# Run it from the server folder:
#
#     powershell -ExecutionPolicy Bypass -File .\setup-email.ps1
#
# It asks for your 16-character app password (nothing is echoed to the screen
# and it never touches this chat or your shell history), writes it into the
# GMAIL_APP_PASSWORD line of .env, and then tells you what to do next.
# ============================================================================

param(
  # Point this at a different .env to test the script without touching the real one.
  [string]$EnvFile = (Join-Path $PSScriptRoot '.env'),
  # Skip the check that the password looks right.
  [switch]$Force,
  # Supply the password directly instead of being prompted for it.
  # Only useful for scripted/testing use - a password typed on a command line
  # ends up in your shell history, so the prompt is the normal way to do this.
  [string]$Password
)

$ErrorActionPreference = 'Stop'

if (-not (Test-Path $EnvFile)) {
  Write-Host "Cannot find $EnvFile" -ForegroundColor Red
  exit 1
}

Write-Host ''
Write-Host '  Google App Password setup for Evora' -ForegroundColor Cyan
Write-Host '  -----------------------------------' -ForegroundColor Cyan
Write-Host ''

if ([string]::IsNullOrEmpty($Password)) {
  Write-Host '  Paste the 16-character app password from Google.'
  Write-Host '  It looks like: abcd efgh ijkl mnop'
  Write-Host '  (Spaces are fine - they get removed automatically.)'
  Write-Host ''

  $secure = Read-Host '  App password' -AsSecureString
  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  try {
    $Password = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
  } finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
  }
}

$password = ($Password -replace '\s', '').Trim()

if ([string]::IsNullOrWhiteSpace($password)) {
  Write-Host ''
  Write-Host '  Nothing entered - .env left untouched.' -ForegroundColor Yellow
  exit 1
}

if (-not $Force -and $password.Length -ne 16) {
  Write-Host ''
  Write-Host "  That looks like $($password.Length) characters, not 16." -ForegroundColor Yellow
  Write-Host '  Google app passwords are always 16 characters.' -ForegroundColor Yellow
  Write-Host '  Re-run and paste it again (or use -Force to override).' -ForegroundColor Yellow
  exit 1
}

# --- Write it into the GMAIL_APP_PASSWORD line, leaving everything else alone
$lines = [System.IO.File]::ReadAllLines($EnvFile)
$found = $false

for ($i = 0; $i -lt $lines.Count; $i++) {
  if ($lines[$i] -match '^\s*GMAIL_APP_PASSWORD\s*=') {
    $lines[$i] = 'GMAIL_APP_PASSWORD=' + $password
    $found = $true
    break
  }
}

if (-not $found) {
  # No line at all - add one at the end.
  $lines += 'GMAIL_APP_PASSWORD=' + $password
}

[System.IO.File]::WriteAllLines($EnvFile, $lines, (New-Object System.Text.UTF8Encoding($false)))

Write-Host ''
Write-Host '  Saved to ' + $EnvFile -ForegroundColor Green
Write-Host '  GMAIL_APP_PASSWORD=************' -ForegroundColor Green
Write-Host ''
Write-Host '  Next:' -ForegroundColor Cyan
Write-Host '    1. Stop the server (Ctrl+C in the terminal running it)'
Write-Host '    2. cd assets\server'
Write-Host '    3. npm start'
Write-Host '    4. npm run test:email'
Write-Host ''
