from app.routers.admin_auth import get_current_user
from app.models.customer import Customer
from fastapi import APIRouter, File, UploadFile, HTTPException, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from datetime import timedelta
import shutil
import os
import uuid
import traceback
from pathlib import Path
from app.config import get_settings
from google.cloud import storage

# Helper to validate MIME type and size for uploads
from typing import List

def _validate_file(file: UploadFile, allowed_mime: List[str]):
    # MIME type check
    # MIME 타입 검사
    if file.content_type not in allowed_mime:
        raise HTTPException(status_code=400, detail="허용된 파일 형식만 업로드할 수 있습니다.")
    # 파일 크기 검사 (속성 존재 시)
    if getattr(file, "size", None) and file.size > MAX_UPLOAD_SIZE:
        raise HTTPException(status_code=413, detail=f"파일 크기가 {MAX_UPLOAD_SIZE // (1024*1024)} MiB 를 초과했습니다.")

# Define upload directory (Relative to app root - for local fallback)
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

MAX_UPLOAD_SIZE = 5 * 1024 * 1024 # 5MB

router = APIRouter()

# Initialize GCS client lazily
def get_gcs_client(settings):
    try:
        if os.path.exists(settings.gcp_key_path):
            return storage.Client.from_service_account_json(settings.gcp_key_path)
        return storage.Client() # Fallback to ADC (Application Default Credentials)
    except Exception as e:
        print(f"⚠️ GCS Client initialization failed: {e}")
        return None

@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    current_user: Customer = Depends(get_current_user)
):
    settings = get_settings()
    try:
        # 1. Validate file type (image or AI reference)
        allowed_mime = [
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/gif",
            "application/pdf",
            "text/plain",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "text/csv",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ]
        _validate_file(file, allowed_mime=allowed_mime)
        
        # 2. Validate file size
        if file.size and file.size > MAX_UPLOAD_SIZE:
            raise HTTPException(status_code=413, detail="파일 크기는 5MB를 초과할 수 없습니다.")
        
        contents = await file.read()
        if len(contents) > MAX_UPLOAD_SIZE:
            raise HTTPException(status_code=413, detail="파일 크기는 5MB를 초과할 수 없습니다.")
        await file.seek(0)

        # 3. Handle filename (User Friendly)
        original_filename = file.filename
        # Sanitize to prevent path traversal and odd character issues
        # Keep alphanumeric, dots, dashes, underscores and spaces
        safe_filename = "".join([c for c in original_filename if c.isalnum() or c in "._- "]).strip()
        if not safe_filename:
            safe_filename = f"file_{uuid.uuid4().hex[:8]}"
            
        # Unique identifier to prevent collisions for files with same name
        file_id = str(uuid.uuid4())
        # Path structure: folder/uuid/original_name
        unique_path = f"{file_id}/{safe_filename}"

        # 4. Attempt GCS Upload (Production Standard)
        client = get_gcs_client(settings)
        if client and settings.gcs_bucket_name:
            try:
                bucket = client.bucket(settings.gcs_bucket_name)
                # Determine folder based on file type
                folder = "keyword-replies" if file.content_type.startswith("image/") else "ai-references"
                blob = bucket.blob(f"{folder}/{unique_path}")
                
                # Upload with specific content type for correct rendering
                blob.upload_from_file(file.file, content_type=file.content_type)
                
                # Make the blob publicly readable only for images; keep private for AI refs
                if file.content_type.startswith("image/"):
                    blob.make_public()
                
                return {
                    "url": blob.public_url if file.content_type.startswith("image/") else blob.self_link,
                    "filename": safe_filename,
                    "provider": "gcs",
                    "type": "image" if file.content_type.startswith("image/") else "ai_ref"
                }
            except Exception as gcs_error:
                print(f"❌ GCS Upload Error: {str(gcs_error)}")
                # Fallback to local storage on GCS failure
                pass

        # 5. Fallback: Local Storage (Development or GCS Error)
        sub_dir = "keyword-replies" if file.content_type.startswith("image/") else "ai-references"
        # For local storage, we use uuid folder too to match GCS structure and ensure uniqueness
        file_path = UPLOAD_DIR / sub_dir / file_id / safe_filename
        file_path.parent.mkdir(parents=True, exist_ok=True)
        await file.seek(0)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        api_base = str(settings.api_base_url).rstrip("/")
        return {
            "url": f"{api_base}/uploads/{sub_dir}/{file_id}/{safe_filename}",
            "filename": safe_filename,
            "provider": "local"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"업로드 실패: {str(e)}")

class SignedURLRequest(BaseModel):
    filename: str
    content_type: str

@router.post("/upload/signed-url")
async def generate_signed_upload_url(
    request: SignedURLRequest,
    current_user: Customer = Depends(get_current_user)
):
    """
    브라우저에서 GCS로 직접 업로드하기 위한 Signed URL을 생성합니다.
    """
    settings = get_settings()
    
    # 1. 파일 형식 검증 (기존 리스트 활용)
    allowed_mime = [
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/gif",
        "application/pdf",
        "text/plain",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "text/csv",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ]
    if request.content_type not in allowed_mime:
        raise HTTPException(status_code=400, detail="허용된 파일 형식만 업로드할 수 있습니다.")

    # 2. 파일명 안전화 및 경로 생성
    safe_filename = "".join([c for c in request.filename if c.isalnum() or c in "._- "]).strip()
    if not safe_filename:
        safe_filename = f"file_{uuid.uuid4().hex[:8]}"
        
    file_id = str(uuid.uuid4())
    folder = "keyword-replies" if request.content_type.startswith("image/") else "ai-references"
    unique_path = f"{folder}/{file_id}/{safe_filename}"

    # 3. GCS 클라이언트 확인 및 URL 생성
    client = get_gcs_client(settings)
    if not client or not settings.gcs_bucket_name:
        raise HTTPException(status_code=500, detail="GCS 설정이 올바르지 않습니다.")

    try:
        bucket = client.bucket(settings.gcs_bucket_name)
        blob = bucket.blob(unique_path)
        
        # Signed URL 생성 (V4)
        url = blob.generate_signed_url(
            version="v4",
            expiration=timedelta(minutes=15),
            method="PUT",
            content_type=request.content_type,
        )
        
        return {
            "signed_url": url,
            "filename": safe_filename,
            "path": unique_path,
            "type": "image" if request.content_type.startswith("image/") else "ai_ref"
        }
    except Exception as e:
        print(f"❌ Signed URL Generation Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Signed URL 생성 실패: {str(e)}")
