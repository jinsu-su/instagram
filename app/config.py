from __future__ import annotations

from functools import lru_cache
from typing import List, Optional, Union

from pydantic import AnyUrl, Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application configuration loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="allow",
    )

    environment: str = Field(default="development", alias="ENVIRONMENT")
    frontend_base_url: AnyUrl = Field(..., alias="FRONTEND_BASE_URL")
    api_base_url: AnyUrl = Field(..., alias="API_BASE_URL")

    database_url: AnyUrl = Field(..., alias="DATABASE_URL")

    state_secret_key: SecretStr = Field(..., alias="STATE_SECRET_KEY")
    token_encryption_key: SecretStr = Field(..., alias="TOKEN_ENCRYPTION_KEY")

    # JWT Authentication
    jwt_secret_key: SecretStr = Field(default=SecretStr("super-secret-dev-key-change-this-in-prod"), alias="JWT_SECRET_KEY")
    jwt_algorithm: str = Field(default="HS256", alias="JWT_ALGORITHM")
    access_token_expire_minutes: int = Field(default=60 * 24 * 30, alias="ACCESS_TOKEN_EXPIRE_MINUTES") # Default 30 days

    google_client_id: str = Field(..., alias="GOOGLE_CLIENT_ID")
    google_client_secret: SecretStr = Field(..., alias="GOOGLE_CLIENT_SECRET")
    google_redirect_uri: AnyUrl = Field(..., alias="GOOGLE_REDIRECT_URI")

    meta_app_id: str = Field(..., alias="META_APP_ID")
    meta_app_secret: SecretStr = Field(..., alias="META_APP_SECRET")
    meta_redirect_uri: AnyUrl = Field(..., alias="META_REDIRECT_URI")
    meta_webhook_verify_token: SecretStr = Field(default=SecretStr("my_default_verify_token"), alias="META_WEBHOOK_VERIFY_TOKEN")
    meta_revoke_uri: Optional[AnyUrl] = Field(default=None, alias="META_REVOKE_URI")
    meta_required_scopes_raw: str = Field(
        default=(
            "pages_show_list,"
            "instagram_basic,"
            "instagram_business_manage_messages,"
            "pages_manage_metadata,"
            "instagram_business_manage_comments,"
            # "instagram_manage_insights,"            # Not in approved list
            "instagram_business_basic,"
            "instagram_business_manage_insights,"
            "pages_messaging,"
            "pages_read_engagement,"
            # "pages_read_user_content,"              # Not in approved list
            # "business_management,"                  # Not in approved list
            # "catalog_management,"                   # Not in approved list
            # "instagram_business_content_publish,"   # Not in approved list
            # "instagram_shopping_tag_products"       # Not in approved list
        ),
        alias="META_REQUIRED_SCOPES",
    )

    log_level: str = Field(default="INFO", alias="LOG_LEVEL")

    instagram_basic_app_id: Optional[str] = Field(default=None, alias="INSTAGRAM_BASIC_APP_ID")
    instagram_basic_app_secret: Optional[SecretStr] = Field(default=None, alias="INSTAGRAM_BASIC_APP_SECRET")
    instagram_basic_redirect_uri: Optional[AnyUrl] = Field(default=None, alias="INSTAGRAM_BASIC_REDIRECT_URI")

    google_api_key: Optional[SecretStr] = Field(default=None, alias="GOOGLE_API_KEY")

    # PortOne
    portone_api_secret: Optional[SecretStr] = Field(default=None, alias="PORTONE_API_SECRET")

    smtp_server: str = Field(default="smtp.gmail.com", alias="SMTP_SERVER")
    smtp_port: int = Field(default=587, alias="SMTP_PORT")
    smtp_user: Optional[str] = Field(default=None, alias="SMTP_USER")
    smtp_password: Optional[SecretStr] = Field(default=None, alias="SMTP_PASSWORD")
    smtp_sender: Optional[str] = Field(default="aidm@aidm.kr", alias="SMTP_SENDER")

    @property
    def meta_required_scopes(self) -> List[str]:
        return [scope.strip() for scope in self.meta_required_scopes_raw.split(",") if scope.strip()]


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return a cached settings instance."""
    # Settings will automatically load from .env file as configured in Config class
    return Settings()






