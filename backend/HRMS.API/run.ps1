$port = 5052
$process = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -First 1
if ($process) {
    Write-Host "⚠️ Port $port is in use by PID $($process.OwningProcess). Killing it..." -ForegroundColor Yellow
    Stop-Process -Id $process.OwningProcess -Force
    Start-Sleep -Seconds 1
}
Write-Host "🚀 Starting HRMS Backend..." -ForegroundColor Green
dotnet run
