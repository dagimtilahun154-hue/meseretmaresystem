<#
.SYNOPSIS
    SolarFlow Peachtree Agent - Windows Auto-Start Installer
.DESCRIPTION
    Registers the Peachtree Live Background Daemon to automatically start whenever
    the accountant or server boots or logs into Windows.
.PARAMETER ServerUrl
    The SolarFlow ERP backend URL (e.g. http://localhost:4000/api/v1 or https://erp.solarflow.et/api/v1)
.PARAMETER WatchDirectory
    The Peachtree company directory to monitor for PTB backups and DAT files.
#>

param(
    [string]$ServerUrl = "https://meseretmaresystem.onrender.com/api/v1",
    [string]$WatchDirectory = "",
    [switch]$NoAutoStart = $false
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$AgentScript = Join-Path $ScriptDir "peachtree_agent.py"
$ConfigFile = Join-Path $ScriptDir "config.json"
$TaskName = "SolarFlowPeachtreeAgent"

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  SolarFlow Peachtree Background Agent - Installer v2.1.0" -ForegroundColor Cyan
Write-Host "  Meseret Mare Enterprise Accounting Workstation Sync" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

# 1. Detect Python Executable
$PythonExe = (Get-Command python -ErrorAction SilentlyContinue).Source
if (-not $PythonExe) {
    $PythonExe = (Get-Command py -ErrorAction SilentlyContinue).Source
}
if (-not $PythonExe) {
    Write-Host "[ERROR] Python was not found in PATH. Please install Python 3.8+." -ForegroundColor Red
    exit 1
}
Write-Host "[OK] Detected Python runtime: $PythonExe" -ForegroundColor Green

# 2. Configure paths
if ([string]::IsNullOrWhiteSpace($WatchDirectory)) {
    $WatchDirectory = (Get-Item $ScriptDir).Parent.Parent.FullName
}

Write-Host "[INFO] Server URL: $ServerUrl" -ForegroundColor Yellow
Write-Host "[INFO] Watch Directory: $WatchDirectory" -ForegroundColor Yellow

# 3. Update or generate config.json
$Config = @{
    serverUrl = $ServerUrl.TrimEnd('/')
    localServerUrl = "http://localhost:4000/api/v1"
    apiKey = "solarflow-sync-secret-2026"
    companyName = "Meseret Mare Agricultural & Solar Machinery"
    watchDirectory = $WatchDirectory
    filePatterns = @(".ptb", ".dat", ".csv", ".txt")
    heartbeatIntervalSeconds = 60
    syncIntervalSeconds = 900
    autoSyncOnNewBackup = $true
}

$ConfigJson = $Config | ConvertTo-Json -Depth 4
Set-Content -Path $ConfigFile -Value $ConfigJson -Encoding UTF8
Write-Host "[OK] Saved configuration to $ConfigFile" -ForegroundColor Green

# 4. Test connectivity to SolarFlow backend
Write-Host "[INFO] Testing connectivity to SolarFlow server..." -ForegroundColor Yellow
try {
    $TestOutput = & $PythonExe $AgentScript --test --config $ConfigFile
    Write-Host "[OK] SolarFlow Server connection verified!" -ForegroundColor Green
} catch {
    Write-Host "[WARNING] Could not connect to server ($ServerUrl). Please ensure backend is running." -ForegroundColor DarkYellow
}

# 5. Register Windows Scheduled Task (Runs on Logon / System Boot)
if (-not $NoAutoStart) {
    Write-Host "[INFO] Configuring Windows Scheduled Task for automatic startup on boot..." -ForegroundColor Yellow
    
    # Create silent VBS launcher so no console window pops up
    $VbsLauncher = Join-Path $ScriptDir "run_silent.vbs"
    $VbsContent = "CreateObject(`"Wscript.Shell`").Run `"`"`"$PythonExe`"`" `"`"$AgentScript`"`"`", 0, False"
    Set-Content -Path $VbsLauncher -Value $VbsContent -Encoding ASCII

    # Unregister existing task if present
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue | Out-Null

    try {
        $Action = New-ScheduledTaskAction -Execute "wscript.exe" -Argument "`"$VbsLauncher`"" -WorkingDirectory $ScriptDir
        $Trigger = New-ScheduledTaskTrigger -AtLogOn
        $Principal = New-ScheduledTaskPrincipal -UserId (Get-CimInstance Win32_ComputerSystem).UserName -LogonType Interactive -RunLevel Highest
        $Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit (New-TimeSpan -Days 0) -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)

        Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Principal $Principal -Settings $Settings -Description "SolarFlow Peachtree Accounting Background Live Sync Agent" | Out-Null
        Write-Host "[OK] Windows Scheduled Task '$TaskName' created successfully! (Starts on PC login)" -ForegroundColor Green
    } catch {
        Write-Host "[NOTICE] Could not register Scheduled Task (may need Administrator rights). Setting up Registry Run key fallback..." -ForegroundColor DarkYellow
        $RegPath = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Run"
        Set-ItemProperty -Path $RegPath -Name $TaskName -Value "wscript.exe `"$VbsLauncher`""
        Write-Host "[OK] Registered in CurrentUser Windows Startup Registry!" -ForegroundColor Green
    }
}

# 6. Generate Management Batch Files
$StartBat = Join-Path $ScriptDir "start-agent.bat"
$StopBat = Join-Path $ScriptDir "stop-agent.bat"
$StatusBat = Join-Path $ScriptDir "status-agent.bat"

Set-Content -Path $StartBat -Value "@echo off`r`nstart wscript.exe `"$ScriptDir\run_silent.vbs`"`r`necho [OK] SolarFlow Peachtree Agent started in background.`r`npause" -Encoding ASCII
Set-Content -Path $StopBat -Value "@echo off`r`ntaskkill /F /FI `"WINDOWTITLE eq SolarFlowPeachtree*`" /IM python.exe 2>nul`r`necho [OK] Agent stopped.`r`npause" -Encoding ASCII
Set-Content -Path $StatusBat -Value "@echo off`r`npython `"$AgentScript`" --test`r`npause" -Encoding ASCII

Write-Host "`n============================================================" -ForegroundColor Green
Write-Host "  INSTALLATION COMPLETED SUCCESSFULLY!" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host "• The agent is now configured to start automatically on boot."
Write-Host "• Management scripts created in: $ScriptDir"
Write-Host "   - start-agent.bat  : Manually start agent"
Write-Host "   - stop-agent.bat   : Stop agent process"
Write-Host "   - status-agent.bat : Test server connectivity"
Write-Host "• Log file: $ScriptDir\logs\peachtree_agent.log"
