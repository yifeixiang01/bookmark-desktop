$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
Compress-Archive -Path (Join-Path $projectRoot 'extension/dist/*') -DestinationPath (Join-Path $projectRoot 'extension/Dandan-0.1.0.zip') -Force
