# ============================================================
#  LIFT Fitness Center — Script de arranque automático
#  Doble clic en "INICIAR LIFT.bat" para ejecutar
# ============================================================

$ROOT = Split-Path -Parent $MyInvocation.MyCommand.Path
$BACKEND = Join-Path $ROOT "lift-backend"
$LOG     = Join-Path $ROOT "tunnel.log"

function Write-Step($msg, $color = "Cyan") {
    Write-Host ""
    Write-Host "  >> $msg" -ForegroundColor $color
}

Clear-Host
Write-Host ""
Write-Host "  ██╗     ██╗███████╗████████╗" -ForegroundColor Magenta
Write-Host "  ██║     ██║██╔════╝╚══██╔══╝" -ForegroundColor Magenta
Write-Host "  ██║     ██║█████╗     ██║   " -ForegroundColor Magenta
Write-Host "  ██║     ██║██╔══╝     ██║   " -ForegroundColor Magenta
Write-Host "  ███████╗██║██║        ██║   " -ForegroundColor Magenta
Write-Host "  ╚══════╝╚═╝╚═╝        ╚═╝   " -ForegroundColor Magenta
Write-Host "  Fitness Center — Sistema de Gestión" -ForegroundColor White
Write-Host ""

# ── 1. Limpiar procesos anteriores ──────────────────────────
Write-Step "Deteniendo procesos anteriores..."
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Get-Process -Name "cloudflared" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# ── 2. Iniciar backend ───────────────────────────────────────
Write-Step "Iniciando backend (puerto 3000)..."
Remove-Item $LOG -ErrorAction SilentlyContinue
Start-Process -FilePath "cmd.exe" `
    -ArgumentList "/k `"cd /d `"$BACKEND`" && npx ts-node-dev --respawn --transpile-only src/index.ts`"" `
    -WindowStyle Normal

# ── 3. Esperar a que el backend responda ─────────────────────
Write-Step "Esperando que el backend este listo..."
$ready = $false
for ($i = 1; $i -le 40; $i++) {
    Start-Sleep -Seconds 1
    try {
        $r = Invoke-WebRequest "http://localhost:3000/health" -TimeoutSec 2 -ErrorAction Stop -UseBasicParsing
        if ($r.StatusCode -eq 200) { $ready = $true; break }
    } catch {}
    Write-Host "  . ($i/40)" -NoNewline -ForegroundColor DarkGray
}

if (-not $ready) {
    Write-Host ""
    Write-Host "  ERROR: El backend no respondio. Revisa la ventana del backend." -ForegroundColor Red
    Read-Host "  Presiona Enter para salir"
    exit 1
}
Write-Host ""
Write-Host "  Backend OK" -ForegroundColor Green

# ── 4. Iniciar tunel Cloudflare ──────────────────────────────
Write-Step "Iniciando tunel publico (Cloudflare)..."
Start-Process -FilePath "cmd.exe" `
    -ArgumentList "/c npx cloudflared tunnel --url http://localhost:3000 > `"$LOG`" 2>&1" `
    -WindowStyle Hidden

# ── 5. Esperar URL del tunel ─────────────────────────────────
Write-Step "Obteniendo URL publica..."
$tunnelUrl = ""
for ($i = 1; $i -le 30; $i++) {
    Start-Sleep -Seconds 1
    if (Test-Path $LOG) {
        $content = Get-Content $LOG -Raw -ErrorAction SilentlyContinue
        if ($content -match "https://[a-z0-9\-]+\.trycloudflare\.com") {
            $tunnelUrl = $Matches[0]
            break
        }
    }
    Write-Host "  . ($i/30)" -NoNewline -ForegroundColor DarkGray
}
Write-Host ""

# ── 6. Resultado ─────────────────────────────────────────────
Write-Host ""
Write-Host "  ============================================" -ForegroundColor Green
Write-Host "  LIFT FITNESS CENTER — SISTEMA ACTIVO" -ForegroundColor Green
Write-Host "  ============================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Local:   http://localhost:3000" -ForegroundColor White

if ($tunnelUrl) {
    Write-Host "  Publico: $tunnelUrl" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  Copiando URL al portapapeles..." -ForegroundColor DarkGray
    $tunnelUrl | Set-Clipboard
    Write-Host "  URL copiada. Compartila para acceso externo." -ForegroundColor DarkGray
    Start-Sleep -Seconds 1
    Start-Process $tunnelUrl
} else {
    Write-Host "  Publico: (tunel no disponible — solo acceso local)" -ForegroundColor DarkYellow
    Start-Process "http://localhost:3000"
}

Write-Host ""
Write-Host "  Credenciales demo:" -ForegroundColor DarkGray
Write-Host "  Admin       admin@lift.com     / Lift2025#" -ForegroundColor DarkGray
Write-Host "  Recepcion   recep@lift.com     / recep2025" -ForegroundColor DarkGray
Write-Host "  Trainer     trainer@lift.com   / trainer2025" -ForegroundColor DarkGray
Write-Host "  Nutricion   nutricion@lift.com / nutri2025" -ForegroundColor DarkGray
Write-Host "  Socio       socio@lift.com     / socio2025" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  Presiona Ctrl+C o cierra esta ventana para detener." -ForegroundColor DarkGray
Write-Host ""

# Mantener vivo (keepalive)
while ($true) {
    Start-Sleep -Seconds 60
    try {
        Invoke-WebRequest "http://localhost:3000/health" -TimeoutSec 5 -ErrorAction Stop -UseBasicParsing | Out-Null
    } catch {
        Write-Host "  ADVERTENCIA: Backend no responde. Reiniciando..." -ForegroundColor Yellow
        Start-Process -FilePath "cmd.exe" `
            -ArgumentList "/k `"cd /d `"$BACKEND`" && npx ts-node-dev --respawn --transpile-only src/index.ts`"" `
            -WindowStyle Normal
        Start-Sleep -Seconds 15
    }
}
