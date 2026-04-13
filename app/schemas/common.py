from pydantic import BaseModel, Field


class SimpleStatusResponse(BaseModel):
    status: str = Field(..., description="현재 상태 (예: APPROVED, PENDING, REJECTED)")
    allowed: bool = Field(..., description="기능 사용 가능 여부")
    detail: str = Field(..., description="추가 설명 또는 안내 메시지")


