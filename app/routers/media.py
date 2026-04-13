from fastapi import APIRouter, UploadFile, File, HTTPException
import os
import uuid
import shutil
from typing import Dict

router = APIRouter()

UPLOAD_DIR = "static/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/upload")
async def upload_media(file: UploadFile = File(...)) -> Dict[str, str]:
    """
    이미지 파일을 서버에 업로드하고 접근 가능한 URL을 반환합니다.
    """
    # 1. 파일 확장자 확인
    allowed_extensions = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".pdf", ".txt", ".docx"]
    file_ext = os.path.splitext(file.filename)[1].lower()
    
    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"허용되지 않는 파일 형식입니다. (허용: {', '.join(allowed_extensions)})"
        )
    
    # 2. 고유한 파일명 생성
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)
    
    # 3. 파일 저장
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"파일 저장 중 오류가 발생했습니다: {str(e)}")
    
    # 4. 접근 가능한 URL 반환
    # 실제 운영 환경에서는 도메인이 포함된 절대 URL이 필요할 수 있음
    # 여기서는 /static/uploads/... 형식의 상대 경로 반환 (프론트에서 처리 가능하게)
    return {
        "url": f"/static/uploads/{unique_filename}",
        "filename": file.filename,
        "content_type": file.content_type
    }
