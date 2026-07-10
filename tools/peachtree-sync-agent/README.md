# Peachtree Sync Agent Setup

This folder contains the Python agent responsible for querying the local Peachtree 2010 database and pushing the data to the SolarFlow Manager cloud ERP.

## Prerequisites
1. **Python 3.8+** installed on the Windows machine.
2. **Peachtree ODBC Driver** configured.

## Step 1: Configure ODBC Data Source (DSN)
1. Open the **ODBC Data Source Administrator (32-bit)** on Windows (since Peachtree 2010 is 32-bit).
2. Go to the **System DSN** tab.
3. Click **Add** and select the **Pervasive ODBC Engine Interface** (or Client Interface).
4. Name the Data Source exactly `Peachtree`.
5. Point it to your company database directory (e.g., `C:\Program Files\Sage\Peachtree\Company\[YourCompany]`).

## Step 2: Install Python Dependencies
Open Command Prompt in this folder and run:
```cmd
pip install -r requirements.txt
```

## Step 3: Configure Environment Variables
Create a `.env` file in this folder (or set Windows environment variables):
```env
PEACHTREE_DSN=Peachtree
API_URL=http://localhost:4000/api/v1/sync/peachtree
API_KEY=solarflow-sync-secret-2026
POLL_INTERVAL_SECONDS=900
```

## Step 4: Run the Agent
```cmd
python sync_agent.py
```

## Step 5 (Optional): Compile to EXE
To run this as a standalone executable without Python installed on the server:
```cmd
pip install pyinstaller
pyinstaller --onefile sync_agent.py
```
You can then set the generated `sync_agent.exe` to run as a Windows Scheduled Task or Service.
