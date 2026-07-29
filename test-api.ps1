# SolarFlow Comprehensive API + Data Test
Write-Host "=== SolarFlow Full API + Data Test ===" -ForegroundColor Cyan

$passed = 0
$failed = 0
$skipped = 0

function Test-Endpoint {
    param($Name, $Uri, $Method, $Headers, $Body, $ExpectFail)
    try {
        $params = @{ Uri = $Uri; Method = $Method; ErrorAction = "Stop" }
        if ($Headers) { $params["Headers"] = $Headers }
        if ($Body) { $params["Body"] = $Body; $params["ContentType"] = "application/json" }
        $result = Invoke-RestMethod @params
        if ($ExpectFail) {
            Write-Host "FAIL: $Name - Expected error but got 200" -ForegroundColor Red
            $script:failed++
        } else {
            Write-Host "PASS: $Name" -ForegroundColor Green
            $script:passed++
        }
        return $result
    } catch {
        if ($ExpectFail) {
            Write-Host "PASS: $Name (correctly returned error)" -ForegroundColor Green
            $script:passed++
        } else {
            Write-Host "FAIL: $Name - $($_.Exception.Message)" -ForegroundColor Red
            $script:failed++
        }
        return $null
    }
}

# === AUTH ===
Write-Host "`n== AUTHENTICATION ==" -ForegroundColor Magenta

$loginBody = @{ username = "manager"; password = "123" } | ConvertTo-Json
$login = Test-Endpoint "Login (manager/123)" "http://localhost:4000/api/v1/auth/login" "Post" $null $loginBody
$token = $login.accessToken
$refreshToken = $login.refreshToken
if ($login) {
    Write-Host "  User: $($login.user.username), Role: $($login.user.role), CompanyId: $($login.user.companyId)" -ForegroundColor Gray
}

Test-Endpoint "Wrong password" "http://localhost:4000/api/v1/auth/login" "Post" $null (@{ username="manager"; password="wrong" } | ConvertTo-Json) $true
Test-Endpoint "Missing fields" "http://localhost:4000/api/v1/auth/login" "Post" $null (@{ username="manager" } | ConvertTo-Json) $true

if ($refreshToken) {
    $refreshBody = @{ refreshToken = $refreshToken } | ConvertTo-Json
    Test-Endpoint "Token Refresh" "http://localhost:4000/api/v1/auth/refresh" "Post" $null $refreshBody
}

Test-Endpoint "Unauthenticated access" "http://localhost:4000/api/v1/users" "Get" $null $null $true

$h = @{ Authorization = "Bearer $token" }

# === CORE DATA ===
Write-Host "`n== CORE DATA ENDPOINTS ==" -ForegroundColor Magenta

$products = Test-Endpoint "GET products" "http://localhost:4000/api/v1/products" "Get" $h
if ($products) { Write-Host "  $($products.Count) products found" -ForegroundColor Gray }

$pumps = Test-Endpoint "GET pumps" "http://localhost:4000/api/v1/pumps" "Get" $h
if ($pumps) { Write-Host "  $($pumps.Count) pumps found" -ForegroundColor Gray }

$categories = Test-Endpoint "GET pump-categories" "http://localhost:4000/api/v1/pump-categories" "Get" $h
if ($categories) { Write-Host "  $($categories.Count) categories found" -ForegroundColor Gray }

$customers = Test-Endpoint "GET customers" "http://localhost:4000/api/v1/customers" "Get" $h
if ($customers) { Write-Host "  $($customers.Count) customers found" -ForegroundColor Gray }

$vendors = Test-Endpoint "GET vendors" "http://localhost:4000/api/v1/vendors" "Get" $h
if ($vendors) { Write-Host "  $($vendors.Count) vendors found" -ForegroundColor Gray }

# === FINANCE ===
Write-Host "`n== FINANCE ==" -ForegroundColor Magenta

$invoices = Test-Endpoint "GET invoices" "http://localhost:4000/api/v1/invoices" "Get" $h
if ($invoices) { Write-Host "  $($invoices.Count) invoices found" -ForegroundColor Gray }

$payments = Test-Endpoint "GET payments" "http://localhost:4000/api/v1/payments" "Get" $h
if ($payments) { Write-Host "  $($payments.Count) payments found" -ForegroundColor Gray }

$bills = Test-Endpoint "GET bills" "http://localhost:4000/api/v1/bills" "Get" $h
if ($bills) { Write-Host "  $($bills.Count) bills found" -ForegroundColor Gray }

$expenses = Test-Endpoint "GET expenses" "http://localhost:4000/api/v1/expenses" "Get" $h
if ($expenses) { Write-Host "  $($expenses.Count) expenses found" -ForegroundColor Gray }

$journal = Test-Endpoint "GET journal" "http://localhost:4000/api/v1/journal" "Get" $h
if ($journal) { Write-Host "  $($journal.Count) journal entries found" -ForegroundColor Gray }

$accounts = Test-Endpoint "GET accounts" "http://localhost:4000/api/v1/accounts" "Get" $h
if ($accounts) { Write-Host "  $($accounts.Count) accounts found" -ForegroundColor Gray }

$sales = Test-Endpoint "GET sales" "http://localhost:4000/api/v1/sales" "Get" $h
if ($sales) { Write-Host "  $($sales.Count) sales found" -ForegroundColor Gray }

# === FIELD WORK ===
Write-Host "`n== FIELD WORK ==" -ForegroundColor Magenta

$fieldwork = Test-Endpoint "GET fieldwork" "http://localhost:4000/api/v1/fieldwork" "Get" $h
if ($fieldwork) {
    Write-Host "  $($fieldwork.Count) field jobs found" -ForegroundColor Gray
    foreach ($fj in $fieldwork) {
        Write-Host "    - $($fj.title) | Status: $($fj.status) | Customer: $($fj.customer_name)" -ForegroundColor Gray
    }
}

# === HR ===
Write-Host "`n== HR ==" -ForegroundColor Magenta

$departments = Test-Endpoint "GET hr/departments" "http://localhost:4000/api/v1/hr/departments" "Get" $h
if ($departments) { Write-Host "  $($departments.Count) departments found" -ForegroundColor Gray }

$workers = Test-Endpoint "GET hr/workers" "http://localhost:4000/api/v1/hr/workers" "Get" $h
if ($workers) { 
    Write-Host "  $($workers.Count) workers found" -ForegroundColor Gray 
    foreach ($w in $workers) {
        Write-Host "    - $($w.full_name) | Position: $($w.position) | Status: $($w.status)" -ForegroundColor Gray
    }
}

$hrSettings = Test-Endpoint "GET hr/settings" "http://localhost:4000/api/v1/hr/settings" "Get" $h
if ($hrSettings) { Write-Host "  Work Start: $($hrSettings.work_start_time), End: $($hrSettings.work_end_time)" -ForegroundColor Gray }

$attendanceLogs = Test-Endpoint "GET hr/attendance/logs" "http://localhost:4000/api/v1/hr/attendance/logs" "Get" $h
if ($attendanceLogs) { Write-Host "  $($attendanceLogs.Count) attendance logs found" -ForegroundColor Gray }

# === ADVANCED ===
Write-Host "`n== ADVANCED ==" -ForegroundColor Magenta

Test-Endpoint "GET tasks" "http://localhost:4000/api/v1/tasks" "Get" $h
Test-Endpoint "GET notifications" "http://localhost:4000/api/v1/notifications" "Get" $h
Test-Endpoint "GET analytics/dashboard" "http://localhost:4000/api/v1/analytics/dashboard" "Get" $h
Test-Endpoint "GET users" "http://localhost:4000/api/v1/users" "Get" $h
Test-Endpoint "GET inventory-requests" "http://localhost:4000/api/v1/inventory-requests" "Get" $h
Test-Endpoint "GET hierarchy/requests" "http://localhost:4000/api/v1/hierarchy/requests" "Get" $h
Test-Endpoint "GET hierarchy/users-presence" "http://localhost:4000/api/v1/hierarchy/users-presence" "Get" $h
Test-Endpoint "GET eod-reports" "http://localhost:4000/api/v1/eod-reports" "Get" $h
Test-Endpoint "GET finance-center/summary" "http://localhost:4000/api/v1/finance-center/summary" "Get" $h
Test-Endpoint "GET peachtree/imports" "http://localhost:4000/api/v1/peachtree/imports" "Get" $h

# === SIZING ===
Write-Host "`n== SIZING ==" -ForegroundColor Magenta
Test-Endpoint "GET sizing-requests" "http://localhost:4000/api/v1/sizing-requests" "Get" $h

# === SUMMARY ===
Write-Host "`n=== TEST SUMMARY ===" -ForegroundColor Cyan
Write-Host "Passed: $passed" -ForegroundColor Green
Write-Host "Failed: $failed" -ForegroundColor Red
Write-Host "Total: $($passed + $failed)" -ForegroundColor White
