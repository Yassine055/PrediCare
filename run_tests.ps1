Write-Host 'PrediCare - Lancement des tests' -ForegroundColor Cyan
Write-Host 'Installation pytest...' -ForegroundColor Yellow
py -m pip install pytest httpx pytest-cov -q
Write-Host 'Lancement des tests...' -ForegroundColor Yellow
py -m pytest api/tests/ -v --tb=short --cov=api --cov-report=term-missing
Write-Host 'Tests termines !' -ForegroundColor Green
