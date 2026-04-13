from datetime import datetime
from uuid import UUID
from typing import Optional, List, Union
from pydantic import BaseModel, Field

class KeywordReply(BaseModel):
    keyword: str = Field(..., description="매칭할 키워드")
    message: str = Field(..., description="전송할 메시지")
    link: Optional[str] = Field(None, description="첨부할 URL")
    image_url: Optional[str] = Field(None, description="첨부할 이미지 URL")
    image_urls: Optional[List[str]] = Field(default_factory=list, description="첨부할 이미지 URL 리스트 (다중 이미지 지원)")
    media_id: Optional[str] = Field(None, description="특정 미디어 ID (선택사항)")
    is_active: bool = Field(True, description="활성화 여부")
    reply_variations: Optional[List[str]] = Field(default_factory=list, description="공개 답글용 랜덤 답장 리스트")
    # 스마트 버튼 인터랙션 (Rich Card) 필드 추가
    button_text: Optional[str] = Field(None, description="버튼 문구")
    card_title: Optional[str] = Field(None, description="카드 제목")
    card_subtitle: Optional[str] = Field(None, description="카드 부제목")
    card_image_url: Optional[str] = Field(None, description="카드 이미지 URL")
    interaction_type: Optional[str] = Field("immediate", description="인터랙션 타입 (immediate, follow_check)")


class InstagramAccountResponse(BaseModel):
    id: UUID
    customer_id: UUID
    page_id: Optional[str] = None
    instagram_user_id: Optional[str] = None
    instagram_username: Optional[str] = None
    ig_id: Optional[str] = None
    # access_token 제거 (보안을 위해 브라우저 노출 금지)
    token_expires_at: Optional[datetime] = None
    connection_status: Optional[str] = "CONNECTED"
    system_prompt: Optional[str] = None
    is_ai_active: bool = True
    ai_operate_start: Optional[str] = "00:00"
    ai_operate_end: Optional[str] = "23:59"
    timezone: Optional[str] = "Asia/Seoul"
    ai_knowledge_base_url: Optional[str] = None
    ai_knowledge_base_filename: Optional[str] = None
    keyword_replies: Optional[List[KeywordReply]] = None
    is_moderation_alert_active: bool = True
    profile_picture_url: Optional[str] = None
    followers_count: Optional[int] = None
    follows_count: Optional[int] = None
    media_count: Optional[int] = None
    moderation_disabled_posts: Optional[List[str]] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class InstagramAccountOption(BaseModel):
    page_id: str
    page_name: str
    instagram_user_id: Optional[str] = None
    instagram_username: Optional[str] = None
    is_current: bool = False


class InstagramAccountOptionsResponse(BaseModel):
    customer_id: UUID
    options: list[InstagramAccountOption] = Field(default_factory=list)
    current_instagram_account: Optional[InstagramAccountResponse] = None


class InstagramLinkRequest(BaseModel):
    customer_id: str  # UUID 문자열로 받아서 코드에서 변환
    page_id: str = Field(..., description="연결할 Instagram 계정의 page_id")
    force_transfer: bool = Field(False, description="이미 연결된 계정일 경우 강제 이전 여부")


class InstagramUserInfo(BaseModel):
    id: str
    username: Optional[str] = None
    profile_picture_url: Optional[str] = None
    biography: Optional[str] = None
    followers_count: Optional[int] = None
    follows_count: Optional[int] = None
    media_count: Optional[int] = None
    website: Optional[str] = None


class AIResponseSettingsUpdate(BaseModel):
    system_prompt: str = Field(..., description="고객별 맞춤 AI 프롬프트")
    is_ai_active: bool = Field(True, description="AI 응답 활성화 여부")
    ai_operate_start: Optional[str] = Field("00:00", description="AI 응답 시작 시간 (HH:MM)")
    ai_operate_end: Optional[str] = Field("23:59", description="AI 응답 종료 시간 (HH:MM)")
    timezone: Optional[str] = Field("Asia/Seoul", description="AI 응답 기준 타임존 (예: Asia/Seoul)")
    ai_knowledge_base_url: Optional[str] = Field(None, description="AI 답변 참조용 파일 URL")
    ai_knowledge_base_filename: Optional[str] = Field(None, description="AI 답변 참조용 파일명")
    is_moderation_alert_active: Optional[bool] = Field(True, description="실시간 악플 탐지 알림 활성화 여부")

class ModerationSettingsUpdate(BaseModel):
    is_moderation_alert_active: bool = Field(True, description="실시간 악플 탐지 알림 활성화 여부")

class PostModerationUpdate(BaseModel):
    post_id: str = Field(..., description="연결할 게시물 ID")
    is_disabled: bool = Field(..., description="해당 게시물의 알림 비활성화 여부")

class KeywordSettingsUpdate(BaseModel):
    keyword_replies: List[KeywordReply] = Field(..., description="키워드별 자동 답장 설정")
    customer_id: Optional[UUID] = Field(None, description="저장할 고객 ID (관리자용)")

class InstagramLinkResponse(BaseModel):
    success: bool
    message: str
    customer_id: Union[UUID, str]
    page_id: Optional[str] = None
    instagram_user_id: Optional[str] = None

class TokenStatusResponse(BaseModel):
    customer_id: str
    instagram_username: Optional[str] = None
    # access_token_prefix 제거 (보안 상 아예 없애는 것이 안전)
    has_token: Optional[bool] = None
    is_valid: Optional[bool] = None
    token_valid: Optional[bool] = None
    error: Optional[str] = None
    message: Optional[str] = None
    checks: Optional[dict] = None

class BulkDeleteRequest(BaseModel):
    comment_ids: List[str] = Field(..., description="삭제할 댓글 ID 목록")

class BulkDeleteResponse(BaseModel):
    success: bool
    deleted_count: int
    failed_ids: List[str] = Field(default_factory=list)
    message: str


class SetPageTokenRequest(BaseModel):
    page_access_token: str = Field(..., description="저장할 Page Access Token")
