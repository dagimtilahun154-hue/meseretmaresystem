#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Build and package SolarFlow Manager for cPanel subdomain deployment.

.DESCRIPTION
    Frontend → app.meseretmare.com (public_html for that subdomain)
    Backend  → api.meseretmare.com (Node.js Selector app)
#>

$ErrorActionPreference = "Stop"
$ROOT = $PSScriptRoot
$DEPLOY_DIR = Join-Path $ROOT "cpanel-deploy"

Write-Host "`n================================================" -ForegroundColor Cyan
Write-Host " SolarFlow Manager - cPanel Subdomain Build"      -ForegroundColor Cyan
Write-Host " Frontend → app.meseretmare.com"                  -ForegroundColor White
Write-Host " Backend  → api.meseretmare.com"                  -ForegroundColor White
Write-Host "================================================`n" -ForegroundColor Cyan

# Clean previous deploy
if (Test-Path $DEPLOY_DIR) {
    Remove-Item $DEPLOY_DIR -Recurse -Force
}
New-Item -ItemType Directory -Path $DEPLOY_DIR | Out-Null

# ── Step 1: Build Frontend ──────────────────────────────────
Write-Host "[1/4] Building frontend (mode=cpanel)..." -ForegroundColor Yellow
Push-Location $ROOT
npm run build:cpanel
Pop-Location

# Copy built frontend to deploy folder
$frontendDeploy = Join-Path $DEPLOY_DIR "app.meseretmare.com"
Copy-Item -Path (Join-Path $ROOT "dist") -Destination $frontendDeploy -Recurse
Write-Host "  ✓ Frontend → cpanel-deploy/app.meseretmare.com/" -ForegroundColor Green

# ── Step 2: Build Backend ───────────────────────────────────
Write-Host "`n[2/4] Building NestJS backend..." -ForegroundColor Yellow
Push-Location (Join-Path $ROOT "backend")
npm run build
Pop-Location

$backendDeploy = Join-Path $DEPLOY_DIR "api.meseretmare.com"
New-Item -ItemType Directory -Path $backendDeploy | Out-Null

# Copy only production-needed files
$backendItems = @("dist", "prisma", "node_modules", "package.json", "package-lock.json", "app.js")
foreach ($item in $backendItems) {
    $src = Join-Path $ROOT "backend\$item"
    if (Test-Path $src) {
        $dest = Join-Path $backendDeploy $item
        if ((Get-Item $src).PSIsContainer) {
            Copy-Item -Path $src -Destination $dest -Recurse
        } else {
            Copy-Item -Path $src -Destination $dest
        }
    }
}

# Create uploads directory placeholder
New-Item -ItemType Directory -Path (Join-Path $backendDeploy "uploads") -Force | Out-Null

# Copy the cPanel .env template as .env
Copy-Item -Path (Join-Path $ROOT "backend\.env.cpanel") -Destination (Join-Path $backendDeploy ".env")
Write-Host "  ✓ Backend → cpanel-deploy/api.meseretmare.com/" -ForegroundColor Green

# ── Step 3: Generate instructions ───────────────────────────
Write-Host "`n[3/4] Generating setup instructions..." -ForegroundColor Yellow
$instructionsPath = Join-Path $DEPLOY_DIR "DEPLOY_INSTRUCTIONS.txt"
@"
===========================================================
 SolarFlow Manager - cPanel Subdomain Deployment
===========================================================

DOMAINS:
  Frontend: app.meseretmare.com
  Backend:  api.meseretmare.com

-----------------------------------------------------------
STEP 1: Create Subdomains in cPanel
-----------------------------------------------------------
  cPanel → Domains (or Subdomains)
  1. Create subdomain:  app.meseretmare.com
     Document root:     ~/app.meseretmare.com
  2. Create subdomain:  api.meseretmare.com
     Document root:     ~/api.meseretmare.com

-----------------------------------------------------------
STEP 2: Create MySQL Database
-----------------------------------------------------------
  cPanel → MySQL Databases
  1. Create database:   cpaneluser_solarflow
  2. Create DB user:    cpaneluser_dbuser  (strong password)
  3. Add user to DB with ALL PRIVILEGES

-----------------------------------------------------------
STEP 3: Upload Files
-----------------------------------------------------------
  1. Upload app.meseretmare.com/* → ~/app.meseretmare.com/
     (including the .htaccess file!)
  2. Upload api.meseretmare.com/* → ~/api.meseretmare.com/

-----------------------------------------------------------
STEP 4: Configure Backend .env
-----------------------------------------------------------
  Edit ~/api.meseretmare.com/.env and set:
    DATABASE_URL with your cPanel MySQL credentials
    JWT secrets (run: openssl rand -hex 32)
    FRONTEND_ORIGIN=https://app.meseretmare.com

-----------------------------------------------------------
STEP 5: Setup Node.js App (for api.meseretmare.com)
-----------------------------------------------------------
  cPanel → Setup Node.js App → CREATE APPLICATION
    Node.js version:        18.x or 20.x
    Application mode:       Production
    Application root:       api.meseretmare.com
    Application URL:        api.meseretmare.com
    Application startup:    app.js
  Then:
    1. Click "Run NPM Install"
    2. Open terminal / SSH and run:
       cd ~/api.meseretmare.com
       source /home/USER/nodevenv/api.meseretmare.com/20/bin/activate
       npx prisma generate
       npx prisma db push
    3. Click RESTART

-----------------------------------------------------------
STEP 6: Enable SSL (Recommended)
-----------------------------------------------------------
  cPanel → SSL/TLS Status → Run AutoSSL
  (or install Let's Encrypt for both subdomains)

-----------------------------------------------------------
STEP 7: Verify
-----------------------------------------------------------
  Backend:  https://api.meseretmare.com/api/v1/health
  Frontend: https://app.meseretmare.com

===========================================================
"@ | Out-File -FilePath $instructionsPath -Encoding UTF8
Write-Host "  ✓ Instructions → DEPLOY_INSTRUCTIONS.txt" -ForegroundColor Green

# ── Step 4: Create ZIP ──────────────────────────────────────
Write-Host "`n[4/4] Creating deployment ZIP..." -ForegroundColor Yellow
$zipPath = Join-Path $ROOT "solarflow-cpanel-deploy.zip"
if (Test-Path $zipPath) { Remove-Item $zipPath }
Compress-Archive -Path "$DEPLOY_DIR\*" -DestinationPath $zipPath
Write-Host "  ✓ Package → solarflow-cpanel-deploy.zip" -ForegroundColor Green

Write-Host "`n================================================" -ForegroundColor Cyan
Write-Host " BUILD COMPLETE!" -ForegroundColor Green
Write-Host " Upload solarflow-cpanel-deploy.zip to cPanel" -ForegroundColor White
Write-Host "================================================`n" -ForegroundColor Cyan
