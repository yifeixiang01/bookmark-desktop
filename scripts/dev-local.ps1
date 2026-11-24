param(
  [switch]$OpenBrowser,
  [ValidateRange(1024, 65535)]
  [int]$Port = 3000
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$databaseUrl = "postgresql://postgres@127.0.0.1:5433/bookmark_desktop"

& (Join-Path $PSScriptRoot "local-db.ps1") start
if ($LASTEXITCODE -ne 0) { throw "Local database startup failed" }

$env:DATABASE_URL = $databaseUrl

# Windows may reserve a port even when no process is listening on it.
$requestedPort = $Port
$listener = $null
for ($attempt = 0; $attempt -lt 20; $attempt++) {
  try {
    $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $Port)
    $listener.Start()
    break
  }
  catch {
    if ($attempt -eq 19 -or $Port + 100 -gt 65535) { throw "No available development port found starting at $requestedPort" }
    $Port += 100
  }
  finally {
    if ($listener) { $listener.Stop() }
  }
}
if ($Port -ne $requestedPort) { Write-Host "Port $requestedPort is unavailable; using $Port instead. See the URL below." }

Push-Location $projectRoot
try {
  $psql = 'C:\Program Files\PostgreSQL\17\bin\psql.exe'
  $hasTables = & $psql -w -h 127.0.0.1 -p 5433 -U postgres -d bookmark_desktop -Atqc "select exists(select 1 from pg_tables where schemaname = 'public')"
  if ($LASTEXITCODE -ne 0) { throw "Failed to inspect local database tables" }
  if ($hasTables -eq 'f') {
    Write-Host "Initializing schema in the empty local database..."
    & npm run db:push
    if ($LASTEXITCODE -ne 0) { throw "Database schema initialization failed" }
  } else {
    Write-Host "Reusing existing local database tables."
  }

  Write-Host "Starting frontend and API at http://127.0.0.1:$Port"
  Write-Host "Press Ctrl+C to stop the development server. PostgreSQL stays running."
  $viteArgs = @('--host', '127.0.0.1', '--port', "$Port", '--strictPort')
  if ($OpenBrowser) { $viteArgs += '--open' }
  & npm run dev -- @viteArgs
  exit $LASTEXITCODE
}
finally {
  Pop-Location
}
