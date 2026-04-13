@echo off
cd /d "C:\Users\82107\Desktop\instagram\instagram-auth-service"
call .venv\Scripts\activate.bat
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
pause




