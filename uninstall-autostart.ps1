# ============================================================================
# uninstall-autostart.ps1 — remove the Evora auto-start task
# ----------------------------------------------------------------------------
#     powershell -ExecutionPolicy Bypass -File .\uninstall-autostart.ps1
#
# Stops the backend (if it is running) and removes the scheduled task, so
# Windows stops starting it on log in.
# ============================================================================

$ErrorActionPreference = 'Stop'

$taskName = 'Evora Backend'

Write-Host ''
Write-Host '  Removing the Evora auto-start task...' -ForegroundColor Cyan
Write-Host ''

if (Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue) {
  Stop-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
  Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
  Write-Host '  Scheduled task removed.' -ForegroundColor Green
} else {
  Write-Host '  No scheduled task found (nothing to remove).' -ForegroundColor Yellow
}

# Also stop any node process that is serving port 3000.
# netstat is used instead of Get-NetTCPConnection because the latter takes
# about 10 seconds on this machine.
$netstat = netstat -ano -p tcp 2>$null
$pids = @()
foreach ($line in $netstat) {
  if ($line -match '^\s*TCP\s+\S+:3000\s+\S+\s+LISTENING\s+(\d+)\s*$') {
    $pids += $Matches[1]
  }
}
foreach ($processId in ($pids | Select-Object -Unique)) {
  try {
    Stop-Process -Id $processId -Force -ErrorAction Stop
    Write-Host '  Stopped the server that was running on port 3000.' -ForegroundColor Green
  } catch {
    Write-Host '  Could not stop the process on port 3000 (it may already be gone).' -ForegroundColor Yellow
  }
}

Write-Host ''
Write-Host '  Done. You can still start the backend by double-clicking start-evora.cmd'
Write-Host ''
