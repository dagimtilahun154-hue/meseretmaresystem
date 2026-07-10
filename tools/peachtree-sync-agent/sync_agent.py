import pyodbc
import requests
import json
import time
import os
import sqlite3
from datetime import datetime
from dotenv import load_dotenv

# Load local environment variables from .env file if present
load_dotenv()

# ==========================================
# CONFIGURATION
# ==========================================
# Pervasive ODBC Client Interface connection (works with Peachtree 2010)
# The Engine Interface DSN doesn't handle auth properly, so we use a direct driver connection.
PEACHTREE_DBQ = os.environ.get('PEACHTREE_DBQ', 'DNICHSQUARE')
PEACHTREE_SERVER = os.environ.get('PEACHTREE_SERVER', 'localhost')
PEACHTREE_USER = os.environ.get('PEACHTREE_USER', 'api')
PEACHTREE_PASS = os.environ.get('PEACHTREE_PASS', 'Api@1234')

# API details for SolarFlow Manager backend
API_URL = os.environ.get('API_URL', 'http://localhost:4000/api/v1/sync/peachtree')
API_KEY = os.environ.get('API_KEY', 'solarflow-sync-secret-2026')
POLL_INTERVAL_SECONDS = int(os.environ.get('POLL_INTERVAL_SECONDS', '120')) # Default 2 minutes

DB_FILE = 'sync_state.db'

def setup_local_db():
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS sync_state (
                 entity TEXT PRIMARY KEY,
                 last_sync_id TEXT
                 )''')
    conn.commit()
    return conn

def get_last_sync(conn, entity):
    c = conn.cursor()
    c.execute("SELECT last_sync_id FROM sync_state WHERE entity=?", (entity,))
    row = c.fetchone()
    return row[0] if row else None

def update_last_sync(conn, entity, last_id):
    c = conn.cursor()
    c.execute("REPLACE INTO sync_state (entity, last_sync_id) VALUES (?, ?)", (entity, last_id))
    conn.commit()

def fetch_peachtree_data():
    """
    Connects to Peachtree via ODBC using the Pervasive Client Interface driver
    and fetches customer/vendor data.
    
    Actual Peachtree 2010 table columns:
    - Customers: CustomerID, Customer_Bill_Name, Balance, Phone_Number, eMail_Address, Contact
    - Vendors:   VendorID, Name, Balance, PhoneNumber, Email, Contact
    - Address:   Name, AddressLine1, AddressLine2, City, State, Zip, Country
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
        print(f"[{datetime.now()}] INFO: Connected to Peachtree database '{PEACHTREE_DBQ}' successfully.")
    except Exception as e:
        print(f"[{datetime.now()}] ERROR: Could not connect to Peachtree ODBC: {e}")
        return None

    # Fetch Customers (with address info via join)
    customers = []
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
        print(f"[{datetime.now()}] INFO: Fetched {len(customers)} customers.")
    except Exception as e:
        print(f"[{datetime.now()}] WARN: Failed to fetch Customers: {e}")

    # Fetch Vendors
    vendors = []
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
        print(f"[{datetime.now()}] INFO: Fetched {len(vendors)} vendors.")
    except Exception as e:
        print(f"[{datetime.now()}] WARN: Failed to fetch Vendors: {e}")

    pt_conn.close()

    return {
        "customers": customers,
        "vendors": vendors,
        # Placeholder for invoices and journal entries which require joining JrnlHdr and JrnlRow
        "invoices": [],
        "journalEntries": []
    }

def push_to_api(payload):
    headers = {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY
    }
    
    try:
        print(f"[{datetime.now()}] INFO: Pushing to {API_URL}...")
        response = requests.post(API_URL, json=payload, headers=headers, timeout=30)
        
        if response.status_code in [200, 201]:
            print(f"[{datetime.now()}] SUCCESS: Sync completed. API Response: {response.json()}")
            return True
        else:
            print(f"[{datetime.now()}] ERROR: API responded with {response.status_code}: {response.text}")
            return False
    except Exception as e:
        print(f"[{datetime.now()}] ERROR: Network or API failure: {e}")
        return False

def main():
    print("========================================")
    print(" Peachtree to SolarFlow Sync Agent v1.0 ")
    print("========================================")
    
    local_db = setup_local_db()
    
    while True:
        data = fetch_peachtree_data()
        
        if data:
            success = push_to_api(data)
            if success:
                # Update local DB pointers here if delta sync is fully implemented
                pass
        
        print(f"[{datetime.now()}] INFO: Sleeping for {POLL_INTERVAL_SECONDS} seconds...")
        time.sleep(POLL_INTERVAL_SECONDS)

if __name__ == "__main__":
    main()
