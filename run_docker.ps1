Write-Host 'PrediCare - Lancement Docker' -ForegroundColor Cyan
Write-Host 'Build et demarrage des containers...' -ForegroundColor Yellow
docker-compose up --build -d
Write-Host 'Attente demarrage services...' -ForegroundColor Yellow
Start-Sleep -Seconds 10
Write-Host 'Services disponibles :' -ForegroundColor Green
Write-Host '  Frontend  : http://localhost' -ForegroundColor White
Write-Host '  Backend   : http://localhost:8000' -ForegroundColor White
Write-Host '  API Docs  : http://localhost:8000/docs' -ForegroundColor White
