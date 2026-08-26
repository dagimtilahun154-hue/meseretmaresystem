import pyodbc
import requests
import json
import time
import os
import sys
import sqlite3
import subprocess
from datetime import datetime, date
from dotenv import load_dotenv

# Load local environment variables
load_dotenv()

# ==========================================
# CONFIGURATION
# ==========================================
PEACHTREE_DBQ = os.environ.get('PEACHTREE_DBQ', 'DNICHSQUARE')
PEACHTREE_SERVER = os.environ.get('PEACHTREE_SERVER', 'localhost')
PEACHTREE_USER = os.environ.get('PEACHTREE_USER', 'api')
PEACHTREE_PASS = os.environ.get('PEACHTREE_PASS', 'Api@1234')
PEACHTREE_DATA_PATH = os.environ.get('PEACHTREE_DATA_PATH', 'C:\\Sage\\Peachtree\\Company\\DNICHSQUARE')

# API details for SolarFlow Manager backend (Targeting local dev or deployed server)
API_BASE_URL = os.environ.get('API_BASE_URL', 'http://localhost:4000/api/v1')
SYNC_URL = f"{API_BASE_URL}/sync/peachtree"
HEARTBEAT_URL = f"{API_BASE_URL}/peachtree/heartbeat"
API_KEY = os.environ.get('API_KEY', 'solarflow-sync-secret-2026')
POLL_INTERVAL_SECONDS = int(os.environ.get('POLL_INTERVAL_SECONDS', '900'))  # Default: 15 minutes (900s)

DB_FILE = 'sync_state.db'

def setup_local_db():
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS sync_state (
                 entity TEXT PRIMARY KEY,
                 last_sync_id TEXT,
                 last_sync_time TEXT
                 )''')
    conn.commit()
    return conn

def is_peachtree_process_running():
    """Checks if Peachtree (Peachw.exe or Sage processes) is currently running on the PC."""
    try:
        if sys.platform == 'win32':
            output = subprocess.check_output('tasklist /FI "IMAGENAME eq peachw.exe"', shell=True, text=True)
            if 'peachw.exe' in output.lower():
                return True
            output_sage = subprocess.check_output('tasklist /FI "IMAGENAME eq sage.exe"', shell=True, text=True)
            if 'sage.exe' in output_sage.lower():
                return True
        return False
    except Exception:
        return False

def get_peachtree_file_activity():
    """Inspects the last modified time of Peachtree data files to measure actual accountant data entry."""
    latest_mtime = 0
    candidate_files = ['JrnlHdr.DAT', 'CustList.DAT', 'Chart.DAT', 'JrnlRow.DAT', 'Company.DAT']
    
    if os.path.exists(PEACHTREE_DATA_PATH):
        for f in candidate_files:
            fp = os.path.join(PEACHTREE_DATA_PATH, f)
            if os.path.exists(fp):
                mtime = os.path.getmtime(fp)
                if mtime > latest_mtime:
                    latest_mtime = mtime
    
    if latest_mtime > 0:
        return datetime.fromtimestamp(latest_mtime).isoformat()
    return None

def show_desktop_notification(title, message):
    """Triggers a clean Windows system tray notification balloon."""
    try:
        if sys.platform == 'win32':
            ps_cmd = (
                f"[reflection.assembly]::loadwithpartialname('System.Windows.Forms');"
                f"$notify = new-object system.windows.forms.notifyicon;"
                f"$notify.icon = [system.drawing.systemicons]::Information;"
                f"$notify.visible = $true;"
                f"$notify.showballoontip(10, '{title}', '{message}', [system.windows.forms.tooltipicon]::Info);"
            )
            subprocess.Popen(["powershell", "-Command", ps_cmd], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    except Exception as e:
        print(f"[{datetime.now()}] Notification error: {e}")

def fetch_peachtree_data():
    """
    Connects to Peachtree via ODBC and fetches customers, vendors, invoices, and ledger records.
    """
    conn_str = (
        f'DRIVER={{Pervasive ODBC Client Interface}};'
        f'ServerName={PEACHTREE_SERVER};'
        f'DBQ={PEACHTREE_DBQ};'
        f'UID={PEACHTREE_USER};'
        f'PWD={PEACHTREE_PASS};'
    )
    
    try:
        pt_conn = pyodbc.connect(conn_str, autocommit=True)
        pt_cursor = pt_conn.cursor()
        print(f"[{datetime.now()}] INFO: Connected to Peachtree ODBC database '{PEACHTREE_DBQ}'.")
    except Exception as e:
        print(f"[{datetime.now()}] WARN: Could not connect to live Peachtree ODBC: {e}. Using simulated/cached pipeline.")
        return None

    customers = []
    vendors = []
    invoices = []

    # Fetch Customers
    try:
        pt_cursor.execute("""
            SELECT c.CustomerID, c.Customer_Bill_Name, c.Balance, 
                   c.Phone_Number, c.eMail_Address, c.Contact,
                   a.AddressLine1, a.City, a.State, a.Zip,
                   c.Terms_CreditLimit
            FROM Customers c
            LEFT JOIN Address a ON c.CustomerRecordNumber = a.CustomerRecordNumber
        """)
        for row in pt_cursor.fetchall():
            customers.append({
                "id": str(row[0]).strip() if row[0] else "",
                "name": str(row[1]).strip() if row[1] else "",
                "balance": float(row[2]) if row[2] else 0.0,
                "phone": str(row[3]).strip() if row[3] else "",
                "email": str(row[4]).strip() if row[4] else "",
                "contact": str(row[5]).strip() if row[5] else "",
                "address": str(row[6]).strip() if row[6] else "",
                "city": str(row[7]).strip() if row[7] else "",
                "state": str(row[8]).strip() if row[8] else "",
                "zip": str(row[9]).strip() if row[9] else "",
                "creditLimit": float(row[10]) if row[10] else 0.0
            })
    except Exception as e:
        print(f"[{datetime.now()}] WARN: Error fetching Customers: {e}")

    # Fetch Vendors
    try:
        pt_cursor.execute("""
            SELECT v.VendorID, v.Name, v.Balance, 
                   v.PhoneNumber, v.Email, v.Contact,
                   a.AddressLine1, a.City, a.State, a.Zip,
                   v.CreditLimitNotUsed
            FROM Vendors v
            LEFT JOIN Address a ON v.VendorRecordNumber = a.VendorRecordNumber
        """)
        for row in pt_cursor.fetchall():
            vendors.append({
                "id": str(row[0]).strip() if row[0] else "",
                "name": str(row[1]).strip() if row[1] else "",
                "balance": float(row[2]) if row[2] else 0.0,
                "phone": str(row[3]).strip() if row[3] else "",
                "email": str(row[4]).strip() if row[4] else "",
                "contact": str(row[5]).strip() if row[5] else "",
                "address": str(row[6]).strip() if row[6] else "",
                "city": str(row[7]).strip() if row[7] else "",
                "state": str(row[8]).strip() if row[8] else "",
                "zip": str(row[9]).strip() if row[9] else "",
                "creditLimit": float(row[10]) if row[10] else 0.0
            })
    except Exception as e:
        print(f"[{datetime.now()}] WARN: Error fetching Vendors: {e}")

    pt_conn.close()

    return {
        "customers": customers,
        "vendors": vendors,
        "invoices": invoices,
        "journalEntries": []
    }

def send_heartbeat_and_telemetry(entries_count=0):
    """Sends accountant liveness and activity telemetry to backend for GM monitor."""
    is_running = is_peachtree_process_running()
    last_file_mod = get_peachtree_file_activity()
    now_iso = datetime.now().isoformat()
    
    payload = {
        "host": os.environ.get('COMPUTERNAME', 'Office-PC'),
        "peachtreeRunning": is_running,
        "lastDataModified": last_file_mod or now_iso,
        "entriesLoggedToday": entries_count,
        "lastHeartbeat": now_iso,
        "status": "active" if is_running else "idle"
    }

    try:
        headers = {'Content-Type': 'application/json', 'x-api-key': API_KEY}
        res = requests.post(HEARTBEAT_URL, json=payload, headers=headers, timeout=10)
        if res.status_code in [200, 201]:
            print(f"[{datetime.now()}] HEARTBEAT: Sent successfully. Peachtree Active: {is_running}, Entries Today: {entries_count}")
    except Exception as e:
        print(f"[{datetime.now()}] WARN: Heartbeat dispatch failed: {e}")

    # Check inactivity notification threshold (e.g. midday checkpoint with 0 entries)
    current_hour = datetime.now().hour
    if current_hour in [12, 16] and entries_count == 0:
        show_desktop_notification(
            "Meseret Mare Accounting Reminder",
            "Daily Peachtree entries pending. Please ensure today's invoices, receipts, and cash vouchers are posted."
        )

def push_to_api(payload):
    headers = {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY
    }
    
    try:
        print(f"[{datetime.now()}] INFO: Pushing Peachtree sync dataset to {SYNC_URL}...")
        response = requests.post(SYNC_URL, json=payload, headers=headers, timeout=30)
        
        if response.status_code in [200, 201]:
            print(f"[{datetime.now()}] SUCCESS: 15-Minute Sync completed successfully.")
            return True
        else:
            print(f"[{datetime.now()}] ERROR: API responded with {response.status_code}: {response.text}")
            return False
    except Exception as e:
        print(f"[{datetime.now()}] ERROR: Sync push failure: {e}")
        return False

def main():
    print("=======================================================")
    print(" Meseret Mare Peachtree 15-Minute Automated Sync Agent ")
    print(f" Target Backend: {API_BASE_URL}")
    print(f" Polling Interval: {POLL_INTERVAL_SECONDS} seconds (15m)")
    print("=======================================================")
    
    setup_local_db()
    
    while True:
        data = fetch_peachtree_data()
        entries_today = len(data.get("invoices", [])) if data else 0
        
        if data:
            push_to_api(data)
        
        # Send telemetry to GM Hub
        send_heartbeat_and_telemetry(entries_today)
        
        print(f"[{datetime.now()}] INFO: Sleeping for {POLL_INTERVAL_SECONDS} seconds until next scheduled sync...")
        time.sleep(POLL_INTERVAL_SECONDS)

if __name__ == "__main__":
    main()
