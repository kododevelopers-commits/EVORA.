# ============================================================================
# install-autostart.ps1 — make the Evora backend start automatically
# ----------------------------------------------------------------------------
# Run this ONCE:
#
#     powershell -ExecutionPolicy Bypass -File .\install-autostart.ps1
#
# It creates a Windows scheduled task that:
#   * starts the backend every time you log in to Windows
#   * restarts it within about 8 seconds if it ever crashes
#   * runs with no time limit, so it stays up for as long as you need
#   * logs everything to %LOCALAPPDATA%\Evora\server.log (outside the project
#     folder on purpose - see the note further down)
#
# Uninstall it again with:
#
#     powershell -ExecutionPolicy Bypass -File .\uninstall-autostart.ps1
# ============================================================================

$ErrorActionPreference = 'Stop'

$root      = $PSScriptRoot
$serverDir = Join-Path $root 'assets\server'
$taskName  = 'Evora Backend'

# The log deliberately lives OUTSIDE the project folder.
#
# VS Code's Live Server watches the project folder and reloads the open page
# whenever a file in it changes. If the log were inside the project, every
# request would change the log, every log change would reload the page, and
# the page reload would send more requests — an endless loop that pins the CPU
# and fills the disk. Keeping the log outside the project breaks that chain.
$logDir    = Join-Path $env:LOCALAPPDATA 'Evora'
$logFile   = Join-Path $logDir 'server.log'

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  if (Test-Path 'C:\Program Files\nodejs\node.exe') {
    $nodeExe = 'C:\Program Files\nodejs\node.exe'
  } else {
    Write-Host ''
    Write-Host '  Node.js was not found.' -ForegroundColor Red
    Write-Host '  Install the LTS version from https://nodejs.org and run this again.'
    Write-Host ''
    exit 1
  }
} else {
  $nodeExe = (Get-Command node).Source
}

Write-Host ''
Write-Host '  Installing the Evora auto-start task...' -ForegroundColor Cyan
Write-Host '  --------------------------------------------' -ForegroundColor Cyan
Write-Host ('  node:    ' + $nodeExe)
Write-Host ('  folder:  ' + $serverDir)
Write-Host ('  log:     ' + $logFile)
Write-Host ''

# The command the task runs.
#
# It runs in a loop so the backend comes straight back (within ~5 seconds) if
# it ever crashes. It also waits instead of fighting for the port if another
# copy is already running, and keeps the log from growing forever.
#
# NOTE: the port check is a plain TCP connect, NOT Get-NetTCPConnection.
# Get-NetTCPConnection takes ~10 seconds on this machine, which turned a
# 5-second restart into a 28-second one. The socket test takes ~40 ms.
$command = @"
function Test-PortInUse([int]`$Port) {
  try {
    `$client = New-Object System.Net.Sockets.TcpClient;
    `$async = `$client.BeginConnect('127.0.0.1', `$Port, `$null, `$null);
    if (-not `$async.AsyncWaitHandle.WaitOne(700, `$false)) { `$client.Close(); return `$false }
    `$client.EndConnect(`$async);
    `$client.Close();
    return `$true;
  } catch { return `$false }
}
if (-not (Test-Path '$logDir')) { New-Item -ItemType Directory -Path '$logDir' -Force | Out-Null }
Set-Location '$serverDir';
while (`$true) {
  if ((Test-Path '$logFile') -and ((Get-Item '$logFile').Length -gt 2MB)) {
    Move-Item '$logFile' ('$logFile.old') -Force -ErrorAction SilentlyContinue
  }
  if (Test-PortInUse 3000) {
    Add-Content -Path '$logFile' -Value ('[' + (Get-Date) + '] Port 3000 is already in use - waiting for it to free up.') -Encoding utf8;
    Start-Sleep -Seconds 10;
    continue;
  }
  Add-Content -Path '$logFile' -Value ('[' + (Get-Date) + '] Starting Evora backend...') -Encoding utf8;
  & '$nodeExe' 'server.js' 2>&1 | Out-File -FilePath '$logFile' -Append -Encoding utf8;
  Add-Content -Path '$logFile' -Value ('[' + (Get-Date) + '] Backend stopped - restarting in 5 seconds.') -Encoding utf8;
  Start-Sleep -Seconds 5;
}
"@

$action = New-ScheduledTaskAction -Execute 'powershell.exe' `
  -Argument ('-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -Command "' + $command.Replace('"', '`"') + '"')

$trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME

$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Limited

$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -StartWhenAvailable `
  -RestartCount 999 `
  -RestartInterval (New-TimeSpan -Minutes 1) `
  -ExecutionTimeLimit ([TimeSpan]::Zero) `
  -MultipleInstances IgnoreNew

# Replace any older version of the task
if (Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue) {
  Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
}

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger `
  -Principal $principal -Settings $settings -Description 'Evora clothing store backend (orders, complaints, admin API).' | Out-Null

Write-Host '  Task registered.' -ForegroundColor Green
Write-Host ''

# Start it right now so you do not have to log off and back on.
Write-Host '  Starting it now...' -ForegroundColor Cyan
Start-ScheduledTask -TaskName $taskName

# Give it time to boot - the task starts a fresh PowerShell and Node.
# A plain TCP connect is used here as well: Get-NetTCPConnection takes about
# 10 seconds per call, which made this check painfully slow.
$listening = $false
for ($i = 0; $i -lt 30; $i++) {
  Start-Sleep -Milliseconds 500
  try {
    $probe = New-Object System.Net.Sockets.TcpClient
    $async = $probe.BeginConnect('127.0.0.1', 3000, $null, $null)
    if ($async.AsyncWaitHandle.WaitOne(700, $false)) {
      $probe.EndConnect($async)
      $listening = $true
      $probe.Close()
      break
    }
    $probe.Close()
  } catch {}
}

if ($listening) {
  Write-Host ''
  Write-Host '  RUNNING. Open: http://localhost:3000' -ForegroundColor Green
} else {
  Write-Host ''
  Write-Host '  Not up yet - check %LOCALAPPDATA%\Evora\server.log for details.' -ForegroundColor Yellow
  Write-Host '  You can also start it by hand: double-click start-evora.cmd'
}

Write-Host ''
Write-Host '  The backend now starts on its own every time you log into Windows.' -ForegroundColor Cyan
Write-Host '  To stop it for good:  powershell -ExecutionPolicy Bypass -File .\uninstall-autostart.ps1'
Write-Host ''
