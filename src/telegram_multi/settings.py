"""
Global settings management using pydantic-settings.
"""

from typing import Optional
from pydantic import SecretStr, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class AppSettings(BaseSettings):
    """Application-wide settings managed via environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        env_prefix="TELEGRAM_",
        extra="ignore",
    )

    # API Keys (Sensitive)
    google_api_key: Optional[SecretStr] = Field(
        default=None, description="Google Translate API Key"
    )
    deepl_api_key: Optional[SecretStr] = Field(
        default=None, description="DeepL API Key"
    )

    # Cache Settings
    translate_cache_ttl: int = Field(
        default=3600, description="Translation cache TTL in seconds"
    )
    redis_url: Optional[str] = Field(
        default=None, description="Redis URL for distributed caching"
    )

    # Performance Settings
    js_debounce_ms: int = Field(
        default=100, description="Debounce delay for JS injection in milliseconds"
    )


# Global settings instance
settings = AppSettings()
