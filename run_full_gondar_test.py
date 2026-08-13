import requests
import json
import time

API_BASE = "http://127.0.0.1:4000/api/v1"

def log(step, msg):
    print("=" * 60, flush=True)
    print(f"STEP {step}: {msg}", flush=True)
    print("=" * 60, flush=True)

def login(username, password="123"):
    res = requests.post(f"{API_BASE}/auth/login", json={"username": username, "password": password})
    if res.status_code not in [200, 201]:
        raise Exception(f"Login failed for {username}: {res.text}")
    data = res.json()
    token = data.get("accessToken")
    user = data.get("user")
    headers = {"Authorization": f"Bearer {token}"}
    return token, headers, user

def run_gondar_e2e_flow():
    log(1, "Log in as Technical Manager (tech_manager) & Create Gondar Pump Sizing Request")
    tm_token, tm_headers, tm_user = login("tech_manager")
    
    # Create sizing proposal for Gondar
    sizing_payload = {
        "clientName": "Ato Tadesse (Gondar Farm Project)",
        "address": "Gondar, Amhara Region",
        "latitude": 12.6000,
        "longitude": 37.4667,
        "waterSource": "Borehole",
        "dailyWaterNeed": 30000,
        "pipeLength": 120,
        "verticalLift": 45,
        "selectedPumpModel": "SolarFlow Submersible 5.5kW"
    }
    
    res = requests.post(f"{API_BASE}/sizing-requests", json=sizing_payload, headers=tm_headers)
    assert res.status_code in [200, 201], f"Failed to create sizing request: {res.text}"
    sizing_req = res.json()
    sizing_id = sizing_req["id"]
    print(f"[SUCCESS] Created Gondar Sizing Request: ID={sizing_id}, Client={sizing_req['clientName']}")

    # Submit to TM
    res = requests.patch(f"{API_BASE}/sizing-requests/{sizing_id}/submit-to-tm", headers=tm_headers)
    assert res.status_code == 200, f"Submit to TM failed: {res.text}"
    print(f"[SUCCESS] Submitted request {sizing_id} to TM review (Status: PENDING_TM)")

    log(2, "Technical Manager (tech_manager) checks & approves sizing request")
    res = requests.patch(f"{API_BASE}/sizing-requests/{sizing_id}/check", headers=tm_headers)
    assert res.status_code == 200, f"TM Check failed: {res.text}"
    print(f"[SUCCESS] Technical Manager checked sizing. Hierarchy request created for General Manager (Status: APPROVED_TM)")

    log(3, "General Manager (manager) approves sizing request")
    gm_token, gm_headers, gm_user = login("manager")
    res = requests.patch(f"{API_BASE}/sizing-requests/{sizing_id}/gm-approve", headers=gm_headers)
    assert res.status_code == 200, f"GM Approve failed: {res.text}"
    print(f"[SUCCESS] General Manager approved sizing request. Forwarded to Finance (Status: FORWARDED_TO_FINANCE)")

    log(4, "Finance Officer (finance) verifies payment & marks request PAID")
    fin_token, fin_headers, fin_user = login("finance")
    res = requests.patch(f"{API_BASE}/sizing-requests/{sizing_id}/mark-paid", headers=fin_headers)
    assert res.status_code == 200, f"Finance mark paid failed: {res.text}"
    print(f"[SUCCESS] Finance verified payment & marked request PAID (Status: PAID)")

    log(5, "Sales Agent / Cashier completes POS checkout using imported Gondar proposal")
    pos_payload = {
        "items": [
            {"id": "PUMP-GONDAR-01", "name": "Solar Pump 5.5kW", "quantity": 1, "price": 120000},
            {"id": "PANEL-350W", "name": "350W Solar Panels", "quantity": 16, "price": 6000},
            {"id": "ACC-CABLE", "name": "Mounting Structure & Cables", "quantity": 1, "price": 29000}
        ],
        "subtotal": 245000,
        "tax": 36750,
        "total": 281750,
        "paymentMethod": "Bank Transfer (CBE)",
        "customerName": "Ato Tadesse (Gondar Farm Project)",
        "customerPhone": "+251911223344",
        "notes": f"Imported from Sizing Proposal {sizing_id}"
    }
    res = requests.post(f"{API_BASE}/sales", json=pos_payload, headers=fin_headers)
    assert res.status_code in [200, 201], f"POS checkout failed: {res.text}"
    print(f"[SUCCESS] POS Checkout completed for Gondar project!")

    log(6, "Technical Manager (tech_manager) creates Fieldwork Job for Gondar")
    ttl_token, ttl_headers, ttl_user = login("tech_leader")
    fw_payload = {"assignedTo": "tech_leader"}
    res = requests.post(f"{API_BASE}/sizing-requests/{sizing_id}/create-fieldwork", json=fw_payload, headers=tm_headers)
    assert res.status_code in [200, 201], f"Create fieldwork job failed: {res.text}"
    fw_data = res.json()
    fw_id = fw_data.get("job", {}).get("id") or fw_data.get("id")
    assert fw_id, f"Fieldwork Job ID missing in response: {fw_data}"
    print(f"[SUCCESS] Fieldwork Job created for Gondar site: ID={fw_id}, Assigned To=Technical Team Leader ({ttl_user['displayName']})")

    log(7, "Technical Team Leader (tech_leader) accepts job & submits crew plan")
    res = requests.patch(f"{API_BASE}/fieldwork/{fw_id}/accept", headers=ttl_headers)
    assert res.status_code == 200, f"Accept job failed: {res.text}"
    print("[SUCCESS] TTL accepted the fieldwork job")

    plan_payload = {
        "travelBudget": 35000,
        "perDiem": 18000,
        "fuelCost": 12000,
        "miscExpenses": 5000,
        "workers": ["Tadesse (TTL)", "Bekele (Technician)", "Dawit (Electrician)"],
        "requestedTools": [
            {"name": "Borehole Solar Installation Kit", "quantity": 1},
            {"name": "Heavy Duty Solar Cable Crimper", "quantity": 2},
            {"name": "Digital Multimeter Fluke 87V", "quantity": 1}
        ]
    }
    res = requests.patch(f"{API_BASE}/fieldwork/{fw_id}/submit-plan", json=plan_payload, headers=ttl_headers)
    assert res.status_code == 200, f"Submit plan failed: {res.text}"
    print(f"[SUCCESS] TTL submitted fieldwork crew plan & requested tools (Status: submitted_tm)")

    log(8, "Technical Manager (tech_manager) verifies & signs off crew plan (TM Check)")
    res = requests.patch(f"{API_BASE}/fieldwork/{fw_id}/tm-check", headers=tm_headers)
    assert res.status_code == 200, f"TM Check failed: {res.text}"
    print("[SUCCESS] Technical Manager signed off crew plan (Status: checked_tm)")

    log(9, "General Manager (manager) approves fieldwork budget & crew plan")
    res = requests.patch(f"{API_BASE}/fieldwork/{fw_id}/gm-approve", headers=gm_headers)
    assert res.status_code == 200, f"GM Approve failed: {res.text}"
    print("[SUCCESS] General Manager approved fieldwork plan (Status: approved_gm)")

    log(10, "Finance Admin (finance) releases travel budget & per-diems")
    res = requests.patch(f"{API_BASE}/fieldwork/{fw_id}/finance-approve", headers=fin_headers)
    assert res.status_code == 200, f"Finance approve failed: {res.text}"
    print("[SUCCESS] Finance Admin released cash voucher & travel per-diems (Status: Approved and ready to go)")

    log(11, "Storekeeper (storekeeper) releases installation tools at Warehouse")
    sk_token, sk_headers, sk_user = login("store")
    checkout_payload = {
        "jobId": fw_id,
        "toolNames": ["Borehole Solar Installation Kit", "Heavy Duty Solar Cable Crimper", "Digital Multimeter Fluke 87V"]
    }
    res = requests.post(f"{API_BASE}/fieldwork-assets/checkout", json=checkout_payload, headers=sk_headers)
    assert res.status_code in [200, 201], f"Tool checkout failed: {res.text}"
    print("[SUCCESS] Storekeeper released tools from warehouse to field crew (Assets marked IN_FIELD)")

    log(12, "Technical Team Leader (tech_leader) submits daily report & marks job completed")
    report_payload = {
        "summary": "Completed Gondar solar pump installation. Borehole pump lowered to 45m, 16x 350W solar array mounted, water discharge verified at 22 m3/h.",
        "workDone": "Pump testing, solar inverter calibration, pipe connections.",
        "issuesEncountered": "None. Water flow clean and stable."
    }
    res = requests.post(f"{API_BASE}/fieldwork/{fw_id}/daily-report", json=report_payload, headers=ttl_headers)
    assert res.status_code in [200, 201], f"Daily report failed: {res.text}"
    print("[SUCCESS] TTL submitted daily installation progress report")

    res = requests.patch(f"{API_BASE}/fieldwork/{fw_id}/complete", headers=ttl_headers)
    assert res.status_code == 200, f"TTL Complete failed: {res.text}"
    print("[SUCCESS] TTL submitted tool return form & marked job completed (Status: completed_ttl)")

    log(13, "Storekeeper (storekeeper) inspects & confirms tool returns at Warehouse")
    return_payload = {"jobId": fw_id}
    res = requests.post(f"{API_BASE}/fieldwork-assets/return", json=return_payload, headers=sk_headers)
    assert res.status_code in [200, 201], f"Tool return failed: {res.text}"
    print("[SUCCESS] Storekeeper verified tool condition & confirmed return to warehouse (Assets marked WAREHOUSE)")

    log(14, "Technical Manager (tech_manager) approves returns & closes job (Status: done)")
    res = requests.patch(f"{API_BASE}/fieldwork/{fw_id}/approve-returns", headers=tm_headers)
    assert res.status_code == 200, f"Approve returns failed: {res.text}"
    print("[SUCCESS] Technical Manager approved returns and closed Gondar Fieldwork Project (Status: done)")

    print("\n" + "*"*60)
    print(">>> ALL 14 END-TO-END WORKFLOW STEPS PASSED 100% PERFECTLY! <<<")
    print("*"*60 + "\n")

if __name__ == "__main__":
    run_gondar_e2e_flow()
