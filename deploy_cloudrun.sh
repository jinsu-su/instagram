#!/usr/bin/env bash
set -euo pipefail

# ------------------- Configuration -------------------
PROJECT_ID="YOUR_GCP_PROJECT_ID"   # replace with your GCP project ID
REGION="asia-northeast3"
SERVICE_NAME="instagram-auth-service"
REPO_NAME="instagram-auth-service"   # Artifact Registry repo name (Docker)
IMAGE_TAG="v$(date +%Y%m%d%H%M%S)"
FULL_IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/${SERVICE_NAME}:${IMAGE_TAG}"

# ------------------- Helper Functions -------------------
log() { echo "[Deploy] $*"; }

# ------------------- Step 1: Verify gcloud -------------------
if ! command -v gcloud >/dev/null 2>&1; then
  log "❌ gcloud CLI not found. Please install Google Cloud SDK before proceeding."
  exit 1
fi

# ------------------- Step 2: Ensure Artifact Registry repo exists -------------------
log "Ensuring Artifact Registry repository '${REPO_NAME}' exists..."
if ! gcloud artifacts repositories describe "${REPO_NAME}" --location="${REGION}" >/dev/null 2>&1; then
  gcloud artifacts repositories create "${REPO_NAME}" \
    --repository-format=docker \
    --location="${REGION}" \
    --description="Docker images for ${SERVICE_NAME}"
fi

# ------------------- Step 3: Build Docker image -------------------
log "Building Docker image ${FULL_IMAGE}..."
docker build -t "${FULL_IMAGE}" .

# ------------------- Step 4: Push image to Artifact Registry -------------------
log "Pushing image to Artifact Registry..."
docker push "${FULL_IMAGE}"

# ------------------- Step 5: Deploy to Cloud Run -------------------
log "Deploying to Cloud Run..."
# SECURITY NOTE: The .env file is NOT copied into the Docker image. Use Secret Manager or Cloud Run env vars for secrets.
# The service runs as a non‑root user (see Dockerfile). Ensure you have set up proper IAM permissions.

gcloud run deploy "${SERVICE_NAME}" \
  --image "${FULL_IMAGE}" \
  --region "${REGION}" \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --cpu 2 \
  --memory 1Gi \
  --max-instances 5 \
  --service-account "cloud-run-sa@${PROJECT_ID}.iam.gserviceaccount.com" \
  --set-env-vars "ENVIRONMENT=production,ENABLE_WEBHOOK_FORWARD=false" \
  --quiet

log "✅ Deployment complete!"
log "Service URL: $(gcloud run services describe ${SERVICE_NAME} --region ${REGION} --format='value(status.url)')"

# -------------------------------------------------
# IMPORTANT:
# - Replace YOUR_GCP_PROJECT_ID with your actual project ID.
# - Ensure the service account (cloud-run-sa) exists and has appropriate roles.
# - Store all secrets (e.g., META_WEBHOOK_VERIFY_TOKEN) in Secret Manager and reference them via Cloud Run env vars.
# - After deployment, verify the webhook registration in Meta Developer Console.
# -------------------------------------------------
