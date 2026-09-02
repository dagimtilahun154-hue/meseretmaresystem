<#
.SYNOPSIS
    SolarFlow Peachtree Agent - Uninstaller
#>

$TaskName = "SolarFlowPeachtreeAgent"

Write-Host "Stopping any running Peachtree Agent processes..." -ForegroundColor Yellow
Get-Process -Name python -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -match "peachtree_agent" } | Stop-Process -Force -ErrorAction SilentlyContinue

Write-Host "Removing Windows Scheduled Task '$TaskName'..." -ForegroundColor Yellow
Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue | Out-Null

Write-Host "Removing Windows Startup Registry Run Key..." -ForegroundColor Yellow
$RegPath = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Run"
Remove-ItemProperty -Path $RegPath -Name $TaskName -ErrorAction SilentlyContinue

Write-Host "[OK] SolarFlow Peachtree Agent has been completely removed from auto-start." -ForegroundColor Green
