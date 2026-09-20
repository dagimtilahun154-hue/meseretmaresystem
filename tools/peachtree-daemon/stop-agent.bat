@echo off
taskkill /F /IM pythonw.exe 2>nul
taskkill /F /FI "WINDOWTITLE eq SolarFlowPeachtree*" /IM python.exe 2>nul
echo [OK] Agent stopped.
pause
