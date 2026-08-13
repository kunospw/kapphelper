# bootstrap.ps1 — one-time setup for kapphelper on a Windows host
#
# Usage:
#   cd $HOME\klaudecode\kapphelper
#   .\bootstrap.ps1
#
# Idempotent — safe to re-run. Does NOT install claude, docker, or git; verifies they exist.

$ErrorActionPreference = 'Stop'

$RepoDir   = Split-Path -Parent $MyInvocation.MyCommand.Path
$ParentDir = Split-Path -Parent $RepoDir

Write-Host "> kapphelper bootstrap"
Write-Host "  repo:   $RepoDir"
Write-Host "  parent: $ParentDir"
Write-Host ""

# --- 1. Verify parent folder is ~/klaudecode per Ken's convention -----------
$expectedParent = Join-Path $HOME 'klaudecode'
if ($ParentDir -ne $expectedParent) {
    Write-Host "!  Parent folder is '$ParentDir', expected '$expectedParent'."
    Write-Host "   Ken's rule: Claude memory lives in ~/klaudecode/. Move the repo:"
    Write-Host "     mkdir $expectedParent; Move-Item '$RepoDir' '$expectedParent\kapphelper'"
    Write-Host ""
}

# --- 2. Check required tools ------------------------------------------------
$missing = @()
foreach ($tool in 'git', 'docker') {
    if (-not (Get-Command $tool -ErrorAction SilentlyContinue)) {
        $missing += $tool
    }
}

# docker compose v2 plugin
$composeOK = $false
try {
    & docker compose version 2>$null | Out-Null
    if ($LASTEXITCODE -eq 0) { $composeOK = $true }
} catch {}
if (-not $composeOK) {
    if (-not (Get-Command docker-compose -ErrorAction SilentlyContinue)) {
        $missing += 'docker-compose'
    }
}

if ($missing.Count -gt 0) {
    Write-Host "X Missing tools: $($missing -join ', ')"
    Write-Host "  Install them, then re-run this script."
    exit 1
}
Write-Host "OK git, docker, docker compose present"

# --- 3. Check claude CLI (soft) ---------------------------------------------
if (Get-Command claude -ErrorAction SilentlyContinue) {
    $ver = ''
    try { $ver = (& claude --version 2>$null) } catch {}
    if (-not $ver) { $ver = 'version unknown' }
    Write-Host "OK claude CLI present ($ver)"
} else {
    Write-Host "!  claude CLI not found — install per your Claude Code onboarding."
}

# --- 4. Verify we're in a git checkout --------------------------------------
if (-not (Test-Path (Join-Path $RepoDir '.git'))) {
    Write-Host "X $RepoDir is not a git checkout. Clone via:"
    Write-Host "     git clone <kairos/kapphelper> $expectedParent\kapphelper"
    exit 1
}
$branch = & git -C $RepoDir rev-parse --abbrev-ref HEAD
Write-Host "OK git checkout OK ($branch)"

# --- 5. Pull latest ---------------------------------------------------------
Write-Host "> git pull --ff-only"
& git -C $RepoDir pull --ff-only

# --- 6. Create runtime folders (gitignored) ---------------------------------
foreach ($dir in 'artifacts', 'logs') {
    $path = Join-Path $RepoDir $dir
    if (-not (Test-Path $path)) { New-Item -ItemType Directory -Path $path | Out-Null }
}
Write-Host "OK runtime folders ready (artifacts/, logs/)"

# --- 7. .env presence check -------------------------------------------------
$envFile     = Join-Path $RepoDir '.env'
$envExample  = Join-Path $RepoDir '.env.example'
if (Test-Path $envFile) {
    Write-Host "OK .env present"
} elseif (Test-Path $envExample) {
    Write-Host "!  .env not found — copy .env.example and fill in real values:"
    Write-Host "     Copy-Item $envExample $envFile"
} else {
    Write-Host "  (no .env.example yet — will be added when a skill first needs secrets)"
}

# --- 8. Sanity — list registered projects -----------------------------------
$projectsFile = Join-Path $RepoDir 'projects.yaml'
if (Test-Path $projectsFile) {
    Write-Host ""
    Write-Host "> Registered in projects.yaml:"
    Select-String -Path $projectsFile -Pattern '^  [a-z_-]+:' | ForEach-Object {
        Write-Host "  $($_.Line)"
    }
}

Write-Host ""
Write-Host "OK bootstrap done."
Write-Host "  Next: start a claude session here — the session-start skill will run automatically."
