from __future__ import annotations

from pydantic import AnyHttpUrl, BaseModel, Field


class AuthRedirect(BaseModel):
    authorization_url: AnyHttpUrl
    state: str


class MetaUserInfo(BaseModel):
    facebook_user_id: str
    name: str | None = None
    email: str | None = None
    picture: str | None = None


class MetaPageInfo(BaseModel):
    page_id: str
    page_name: str
    access_token: str
    instagram_user_id: str | None = Field(None, description="The IGBID used for Graph API calls and webhooks")
    instagram_username: str | None = Field(None, description="IG Username")
    instagram_asid: str | None = Field(None, description="The App-Scoped User ID if known")


class MetaCallbackResult(BaseModel):
    customer_id: str
    redirect_url: AnyHttpUrl
    page_id_missing: bool = False
    transfer_required: bool = False
    page_id: str | None = None


class MetaTokenCallbackRequest(BaseModel):
    """Facebook Login for Business 방식: 프론트엔드에서 fragment로 받은 토큰"""
    access_token: str
    long_lived_token: str | None = None
    state: str

