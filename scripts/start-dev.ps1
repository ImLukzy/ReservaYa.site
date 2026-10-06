$ErrorActionPreference = "Stop"
& node (Join-Path $PSScriptRoot "start-dev.mjs")
exit $LASTEXITCODE
