#!/bin/bash
# 프론트엔드 서버 시작 스크립트

echo "=================================================================================="
echo "🚀 Instagram Auth Service 프론트엔드 서버 시작"
echo "=================================================================================="
echo ""

cd "$(dirname "$0")/frontend"

# node_modules 확인
if [ ! -d "node_modules" ]; then
    echo "📦 node_modules가 없습니다. npm install을 실행합니다..."
    npm install
    echo ""
fi

# .env 파일 확인
if [ ! -f ".env" ]; then
    echo "⚠️  .env 파일이 없습니다. 생성 중..."
    cat > .env << EOF
REACT_APP_INSTAGRAM_API_BASE_URL=http://localhost:8000
EOF
    echo "✅ .env 파일 생성 완료"
    echo ""
fi

echo "✅ 프론트엔드 서버 시작 중..."
echo "   URL: http://localhost:3000"
echo "   메인 페이지: http://localhost:3000/instagram-integration-console"
echo ""
echo "💡 서버를 중지하려면: Ctrl + C"
echo ""

npm start

