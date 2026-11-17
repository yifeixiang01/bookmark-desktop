$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$databaseUrl = "postgresql://postgres@127.0.0.1:5433/bookmark_desktop"

& (Join-Path $PSScriptRoot "local-db.ps1") start
if ($LASTEXITCODE -ne 0) { throw "Local database startup failed" }

$env:DATABASE_URL = $databaseUrl

Push-Location $projectRoot
try {
  Write-Host "Applying the current Drizzle schema..."
  & npm run db:push
  if ($LASTEXITCODE -ne 0) { throw "Database schema initialization failed" }

  Write-Host "Starting the development server..."
  & npm run dev -- --host 127.0.0.1 --port 3000
  exit $LASTEXITCODE
}
finally {
  Pop-Location
}
