#!/bin/bash

# 백엔드 서버 재시작 스크립트

cd "$(dirname "$0")"

echo "🛑 기존 서버 종료 중..."
lsof -ti:8000 | xargs kill -9 2>/dev/null || echo "포트 8000이 비어있습니다."

sleep 2

echo "🚀 백엔드 서버 시작 중..."
source .venv/bin/activate
nohup python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload > backend_live.log 2>&1 &

sleep 3

echo "✅ 서버 시작 완료!"
echo "📋 로그 확인: tail -f backend_live.log"
echo "🔍 상태 확인: curl http://localhost:8000/health"
