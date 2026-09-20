# Peachtree 2010 Direct Binary Live Sync Agent

This folder contains the automated background sync agent responsible for reading directly from live Peachtree 2010 `.DAT` / `.PTB` binary company files (Shared Non-Blocking Mode) and pushing real-time changes to the SolarFlow Manager ERP cloud backend.

## Key Features
- **Direct Binary File Engine**: Reads directly from `CHART.DAT`, `CUSTOMER.DAT`, `VENDOR.DAT`, and `JRNLHDR.DAT` without requiring any 32-bit ODBC drivers or DSN configuration.
- **Shared Non-Blocking Mode**: Zero file locking — the accountant can operate Peachtree normally while synchronization runs.
- **Zero-Duplicate Delta Sync**: Change Data Capture (CDC) with SHA-256 hash checking prevents duplicate entries.
- **Render Cloud Cold-Start Resilient**: Integrated server wake-up ping with 120s timeout and exponential backoff retry.
- **Headless Background Daemon**: Operates silently in the background without needing to keep a command prompt or terminal window open.

## Prerequisites
1. **Python 3.8+** on the Windows machine.

## Step 1: Install Python Dependencies
```cmd
pip install -r requirements.txt
```

## Step 2: Configure Environment Variables
Create a `.env` file in this folder (or configure `config.json`):
```env
PEACHTREE_DATA_PATH=C:\Peachtree\Company\MeseretMare
API_BASE_URL=https://meseretmaresystem.onrender.com/api/v1
API_KEY=solarflow-sync-secret-2026
POLL_INTERVAL_SECONDS=900
```

## Step 3: Run the Agent
To test connectivity:
```cmd
python sync_agent.py
```
Or to run as a silent background Windows daemon without keeping a terminal open:
```cmd
pythonw sync_agent.py
```
