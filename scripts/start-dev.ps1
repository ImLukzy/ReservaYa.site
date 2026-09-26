$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot

# True si algo acepta conexiones en el puerto por IPv4 o IPv6
# (Astro/Vite en Windows escucha solo en ::1; Kestrel y Next también en 127.0.0.1).
function Test-Port($Port) {
    foreach ($ip in @("127.0.0.1", "::1")) {
        $c = $null
        try {
            $c = New-Object Net.Sockets.TcpClient([Net.IPAddress]::Parse($ip).AddressFamily)
            $r = $c.BeginConnect($ip, $Port, $null, $null)
            if ($r.AsyncWaitHandle.WaitOne(400) -and $c.Connected) { return $true }
        } catch {
        } finally {
            if ($c) { $c.Close() }
        }
    }
    return $false
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

# 2. Next.js ("dev" usa --webpack: Turbopack dev en Windows da 404 en rutas dentro de grupos (auth)/(dashboard))
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
