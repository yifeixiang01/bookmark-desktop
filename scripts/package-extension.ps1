$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$manifest = Get-Content -Raw -Encoding UTF8 (Join-Path $projectRoot 'extension/dist/manifest.json') | ConvertFrom-Json
$package = Get-Content -Raw -Encoding UTF8 (Join-Path $projectRoot 'package.json') | ConvertFrom-Json
if ($manifest.version -ne $package.version) { throw 'Manifest and package versions must match.' }
$archiveName = 'Stashy-' + $manifest.version + '.zip'
Compress-Archive -Path (Join-Path $projectRoot 'extension/dist/*') -DestinationPath (Join-Path $projectRoot ('extension/' + $archiveName)) -Force
Write-Output $archiveName

