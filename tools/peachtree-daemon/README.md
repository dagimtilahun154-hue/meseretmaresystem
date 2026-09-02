# 🏢 SolarFlow Peachtree Background Agent (Windows)

The **SolarFlow Peachtree Live Agent** is a background synchronization daemon that runs on the accountant's Windows workstation or the Peachtree/Sage 50 server. It connects Peachtree data with the SolarFlow Cloud ERP.

---

## ⚡ Key Features

1. **Automatic Boot Startup**: Automatically launches silently upon PC startup or user login via Windows Task Scheduler.
2. **Real-Time Workstation Surveillance**: Sends 60-second heartbeats reporting host workstation status, active user, and IP address to the General Manager and Finance Cockpits.
3. **Hot-Folder File Watcher**: Monitors the Peachtree company directory for new `.PTB` backup files or modified `.DAT` tables and syncs them automatically.
4. **Resilient Network Architecture**: Automatically reconnects with exponential backoff if WiFi or LAN drops.
5. **Zero Heavy Dependencies**: Pure Python standard library (no extra pip packages required).

---

## 🛠️ Quick Installation (1-Click)

1. Open PowerShell as Administrator on the Accountant's PC.
2. Navigate to the daemon directory:
   ```powershell
   cd "C:\path\to\solarflow-manager\tools\peachtree-daemon"
   ```
3. Run the installer:
   ```powershell
   .\install-agent.ps1 -ServerUrl "http://localhost:4000/api/v1" -WatchDirectory "C:\Peachtree\Company\Meseret"
   ```

---

## 📁 File Structure

```
tools/peachtree-daemon/
├── config.json            # Configuration (Server URL, Watch Path, Intervals)
├── peachtree_agent.py     # Main Python Daemon Engine
├── install-agent.ps1      # Auto-Start Windows Task & Registry Installer
├── uninstall-agent.ps1    # Uninstaller script
├── run_silent.vbs         # Hidden background process launcher
├── start-agent.bat        # Manual Start shortcut
├── stop-agent.bat         # Manual Stop shortcut
├── status-agent.bat       # Connectivity Diagnostic test
└── logs/
    └── peachtree_agent.log # Local audit and synchronization log
```

---

## 🧪 Testing Connectivity

To test if the agent can reach the SolarFlow Cloud Server:
```bash
python peachtree_agent.py --test
```
Or run a single sync cycle:
```bash
python peachtree_agent.py --once
```
