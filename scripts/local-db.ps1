param(
  [ValidateSet("start", "stop", "status")]
  [string]$Action = "start"
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$pgBin = "C:\Program Files\PostgreSQL\17\bin"
$dataDir = Join-Path $projectRoot ".local-data\postgres"
$logDir = Join-Path $projectRoot ".local-data\logs"
$logFile = Join-Path $logDir "postgres.log"
$databasePort = 5433
$databaseName = "bookmark_desktop"
$databaseUrl = "postgresql://postgres@127.0.0.1:$databasePort/$databaseName"

$initdb = Join-Path $pgBin "initdb.exe"
$pgCtl = Join-Path $pgBin "pg_ctl.exe"
$pgIsReady = Join-Path $pgBin "pg_isready.exe"
$psql = Join-Path $pgBin "psql.exe"
$createdb = Join-Path $pgBin "createdb.exe"

if (-not (Test-Path $pgCtl)) {
  throw "PostgreSQL 17 was not found at $pgBin"
}

function Test-LocalDatabase {
  & $pgIsReady -h 127.0.0.1 -p $databasePort -q
  return $LASTEXITCODE -eq 0
}

if ($Action -eq "status") {
  if (Test-LocalDatabase) {
    Write-Host "Local PostgreSQL is running on 127.0.0.1:$databasePort"
    exit 0
  }
  Write-Host "Local PostgreSQL is stopped"
  exit 1
}

if ($Action -eq "stop") {
  if ((Test-Path (Join-Path $dataDir "PG_VERSION")) -and (Test-LocalDatabase)) {
    & $pgCtl -D $dataDir stop -m fast
    if ($LASTEXITCODE -ne 0) { throw "Failed to stop local PostgreSQL" }
  }
  Write-Host "Local PostgreSQL is stopped"
  exit 0
}

New-Item -ItemType Directory -Force -Path $dataDir, $logDir | Out-Null

if (-not (Test-Path (Join-Path $dataDir "PG_VERSION"))) {
  Write-Host "Initializing project-local PostgreSQL..."
  & $initdb -D $dataDir --username=postgres --auth-local=trust --auth-host=trust --encoding=UTF8 --locale=C
  if ($LASTEXITCODE -ne 0) { throw "Failed to initialize local PostgreSQL" }
}

if (-not (Test-LocalDatabase)) {
  Write-Host "Starting project-local PostgreSQL..."
  & $pgCtl -D $dataDir -l $logFile -o "-p $databasePort -h 127.0.0.1" start -w
  if ($LASTEXITCODE -ne 0) { throw "Failed to start local PostgreSQL. See $logFile" }
}

$databaseExists = & $psql -h 127.0.0.1 -p $databasePort -U postgres -d postgres -Atqc "select 1 from pg_database where datname = '$databaseName'"
if ($LASTEXITCODE -ne 0) { throw "Failed to inspect local PostgreSQL databases" }

if ($databaseExists -ne "1") {
  Write-Host "Creating database $databaseName..."
  & $createdb -h 127.0.0.1 -p $databasePort -U postgres $databaseName
  if ($LASTEXITCODE -ne 0) { throw "Failed to create database $databaseName" }
}

Write-Host "Local PostgreSQL is ready: $databaseUrl"
