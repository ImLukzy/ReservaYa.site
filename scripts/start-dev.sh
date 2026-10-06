#!/usr/bin/env bash
set -e
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export DOTNET_ROOT="${DOTNET_ROOT:-$HOME/.dotnet}"
export PATH="$HOME/.dotnet:$PATH"

port_ok() {
  local port=$1
  # Conexión OK aunque el status sea 404/307: sin -f, curl solo falla si no conecta.
  curl -s -o /dev/null "http://localhost:$port/" --max-time 3 >/dev/null 2>&1 && return 0
  curl -s -o /dev/null "http://localhost:$port/healthz" --max-time 3 >/dev/null 2>&1 && return 0
  (echo > /dev/tcp/127.0.0.1/$port) >/dev/null 2>&1 && return 0
  return 1
}

wait_port() {
  local port=$1 name=$2 timeout=${3:-90}
  for ((i=0; i<timeout; i+=2)); do
    if port_ok "$port"; then
      echo "[OK] $name responde en puerto $port."
      return 0
    fi
    sleep 2
  done
  echo "[FAIL] $name no respondió en puerto $port tras ${timeout}s." >&2
  return 1
}

port_open() { port_ok "$1"; }

# 1. API .NET :5000
if port_open 5000; then echo "[SKIP] API .NET ya corre en puerto 5000."
else
  echo "[START] API .NET"
  dotnet run --project "$ROOT/reservaya-nextjs-api/backend/ReservaFacil.Api/ReservaFacil.Api.csproj" --launch-profile http &
  wait_port 5000 "API .NET"
fi

# 2. Panel Next.js :3000
if port_open 3000; then echo "[SKIP] Panel Next.js ya corre en puerto 3000."
else
  echo "[START] Panel Next.js"
  npm --prefix "$ROOT/reservaya-nextjs-api" run dev &
  wait_port 3000 "Panel Next.js"
fi

# 3. Landing Astro :4321
if port_open 4321; then echo "[SKIP] Landing Astro ya corre en puerto 4321."
else
  echo "[START] Landing Astro"
  npm --prefix "$ROOT/reservaya-frontend-astro" run dev -- --host 127.0.0.1 --port 4321 &
  wait_port 4321 "Landing Astro"
fi

echo ""
echo "Listo: API :5000 | Panel :3000 | Landing :4321"
wait
