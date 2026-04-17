#!/bin/bash
set -e

# =================================================================
# Google Cloud Run Deployment Script (Cost-Optimized & Robust)
# =================================================================

# 1. 설정
GCLOUD_BIN=$(which gcloud || echo "$(pwd)/.gcloud_sdk/google-cloud-sdk/bin/gcloud")
PROJECT_ID=$("$GCLOUD_BIN" config get-value project)
SERVICE_NAME="instagram-api-server"
REGION="asia-northeast1"

echo "🚀 배포를 시작합니다: ${SERVICE_NAME} (Project: ${PROJECT_ID})"

# 2. 환경 변수 준비 (JSON은 YAML의 서브셋이므로 안전하게 호환됨)
echo "📑 환경 변수 파일을 준비하고 있습니다..."
python3 -c "
import json
env_vars = {}
with open('.env', 'r') as f:
    for line in f:
        line = line.strip()
        if not line or line.startswith('#') or '=' not in line:
            continue
        key, val = line.split('=', 1)
        # 따옴표 제거 및 공백 정리
        env_vars[key.strip()] = val.strip().strip('\"').strip(\"'\")
with open('.env.json', 'w') as f:
    json.dump(env_vars, f)
"

# 3. Docker 이미지 빌드 및 업로드
echo "📦 구글 클라우드에서 이미지를 빌드하고 있습니다..."
"$GCLOUD_BIN" builds submit --tag gcr.io/"${PROJECT_ID}"/"${SERVICE_NAME}" .

# 4. Cloud Run 배포
echo "☁️ Cloud Run에 서비스를 배포합니다..."
"$GCLOUD_BIN" run deploy "${SERVICE_NAME}" \
  --image gcr.io/"${PROJECT_ID}"/"${SERVICE_NAME}" \
  --platform managed \
  --region "${REGION}" \
  --allow-unauthenticated \
  --max-instances 2 \
  --concurrency 80 \
  --cpu 1 \
  --memory 1024Mi \
  --timeout 300 \
  --env-vars-file .env.json

echo "✅ 배포가 완료되었습니다!"
"$GCLOUD_BIN" run services describe "${SERVICE_NAME}" --region "${REGION}" --format 'value(status.url)'

# 임시 파일 삭제
rm .env.json
