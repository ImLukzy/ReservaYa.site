$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot

function Test-Port($Port) {
    try {
        $c = New-Object Net.Sockets.TcpClient
        $r = $c.BeginConnect("127.0.0.1", $Port, $null, $null)
        $ok = $r.AsyncWaitHandle.WaitOne(400)
        $c.Close()
        return $ok
    } catch { return $false }
}

function Wait-Healthy($Port, $Name, $TimeoutSec = 90) {
    $sw = [Diagnostics.Stopwatch]::StartNew()
    while ($sw.Elapsed.TotalSeconds -lt $TimeoutSec) {
        if (Test-Port $Port) {
            Write-Host "[OK] $Name responde en puerto $Port." -ForegroundColor Green
            return
        }
        Start-Sleep -Seconds 2
    }
    throw "$Name no respondió en puerto $Port tras ${TimeoutSec}s. Revisa logs de la ventana correspondiente."
}

function Start-DevService {
    param(
        [int]$Port,
        [string]$Name,
        [string]$FilePath,
        [string[]]$ArgumentList,
        [string]$WorkingDirectory,
        [switch]$Wait
    )

    if (Test-Port $Port) {
        Write-Host "[SKIP] $Name ya corre en puerto $Port." -ForegroundColor Yellow
        return
    }

    Write-Host "[START] $Name -> $FilePath $($ArgumentList -join ' ')"
    Start-Process -FilePath $FilePath -ArgumentList $ArgumentList -WorkingDirectory $WorkingDirectory

    if ($Wait) { Wait-Healthy $Port $Name }
}

# 1. Backend primero (Next lo proxya vía BACKEND_URL + rewrites /api/:path*)
Start-DevService `
    -Port 5000 `
    -Name "API .NET" `
    -FilePath "dotnet.exe" `
    -ArgumentList @("run", "--project", "reservaya-nextjs-api/backend/ReservaFacil.Api/ReservaFacil.Api.csproj", "--launch-profile", "http") `
    -WorkingDirectory $root `
    -Wait

# 2. Next.js (Turbopack acelera la navegación y el hot reload)
Start-DevService `
    -Port 3000 `
    -Name "Panel Next.js" `
    -FilePath "npm.cmd" `
    -ArgumentList @("--prefix", "reservaya-nextjs-api", "run", "dev") `
    -WorkingDirectory $root `
    -Wait

# 3. Landing Astro
Start-DevService `
    -Port 4321 `
    -Name "Landing Astro" `
    -FilePath "npm.cmd" `
    -ArgumentList @("--prefix", "reservaya-frontend-astro", "run", "dev") `
    -WorkingDirectory $root `
    -Wait

Write-Host ""
Write-Host "Listo: API :5000 | Panel :3000 | Landing :4321" -ForegroundColor Green
Write-Host "Los servicios corren en ventanas propias y sobreviven al cierre de este script."
