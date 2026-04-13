cd "C:\Users\82107\Desktop\instagram\instagram-auth-service"
.\.venv\Scripts\Activate.ps1
Write-Host "=== Backend Server Starting... ===" -ForegroundColor Green
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000




