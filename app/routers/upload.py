from app.routers.admin_auth import get_current_user
from app.models.customer import Customer
from fastapi import APIRouter, File, UploadFile, HTTPException, Depends
from fastapi.responses import JSONResponse
import shutil
import os
import uuid
from pathlib import Path
from app.config import get_settings
# Define upload directory (Relative to app root)
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

MAX_UPLOAD_SIZE = 5 * 1024 * 1024 # 5MB

router = APIRouter()

@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    current_user: Customer = Depends(get_current_user)
):
    try:
        # Validate file type
        if not file.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="Only image files are allowed.")
            
        # Validate file size
        if file.size and file.size > MAX_UPLOAD_SIZE:
            raise HTTPException(status_code=413, detail="파일 크기는 5MB를 초과할 수 없습니다.")
        
        # Read contents if size attribute is missing (fallback)
        contents = await file.read()
        if len(contents) > MAX_UPLOAD_SIZE:
            raise HTTPException(status_code=413, detail="파일 크기는 5MB를 초과할 수 없습니다.")
        await file.seek(0)

        # Generate unique filename
        file_ext = os.path.splitext(file.filename)[1]
        unique_filename = f"{uuid.uuid4()}{file_ext}"
        file_path = UPLOAD_DIR / unique_filename
        
        # Save file
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # Return accessible URL
        # For local dev, we assume the backend serves static files from /uploads
        # In production, this would be an S3 URL
        
        # Construct full URL based on the request would be ideal, but for now relative/absolute path
        # We need to know the base URL of the backend. 
        # Assuming the frontend can access backend at same host/port or via proxy.
        # Let's return a relative path that the frontend can prepend API_BASE_URL to, 
        # or a full path if we knew the domain.
        
        return {"url": f"/uploads/{unique_filename}", "filename": unique_filename}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
