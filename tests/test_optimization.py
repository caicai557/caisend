"""
Tests for new optimization features (Phase 1-5).
"""

import pytest
import time
from unittest.mock import MagicMock
from src.telegram_multi.settings import AppSettings
from src.telegram_multi.config import TranslationConfig
from src.telegram_multi.translators.google import GoogleTranslator
from src.telegram_multi.translators.deepl import DeepLTranslator
from src.telegram_multi.translator import TranslatorFactory, register_builtin_providers
from src.telegram_multi.pages.telegram_web import TelegramWebPage

# Register providers for tests
register_builtin_providers()


class TestOptimization:
    """Verification tests for optimization features."""

    def test_settings_loading(self, monkeypatch):
        """Verify AppSettings loads from environment variables."""
        monkeypatch.setenv("TELEGRAM_GOOGLE_API_KEY", "test-key")
        monkeypatch.setenv("TELEGRAM_TRANSLATE_CACHE_TTL", "7200")
        
        settings = AppSettings()
        assert settings.google_api_key.get_secret_value() == "test-key"
        assert settings.translate_cache_ttl == 7200

    def test_translation_config_defaults_from_settings(self):
        """Verify TranslationConfig uses defaults from global settings."""
        config = TranslationConfig()
        # Default from settings.py is 3600
        assert config.cache_ttl == 3600
        assert config.js_debounce_ms == 100

    def test_google_translator_ttl(self):
        """Verify GoogleTranslator respects cache TTL."""
        config = TranslationConfig(enabled=True, cache_ttl=1)  # 1 second TTL
        translator = GoogleTranslator(config)
        
        # Mock the library
        translator._lib = MagicMock()
        translator._lib.translate.return_value.text = "Hola"
        
        # First call - should call library
        res1 = translator.translate("Hello", "en", "es")
        assert res1 == "Hola"
        assert translator._lib.translate.call_count == 1
        
        # Second call - should use cache
        res2 = translator.translate("Hello", "en", "es")
        assert res2 == "Hola"
        assert translator._lib.translate.call_count == 1
        
        # Wait for TTL to expire
        time.sleep(1.1)
        
        # Third call - should call library again
        res3 = translator.translate("Hello", "en", "es")
        assert res3 == "Hola"
        assert translator._lib.translate.call_count == 2

    def test_deepl_translator_registration(self):
        """Verify DeepLTranslator is registered in the factory."""
        config = TranslationConfig(provider="deepl")
        translator = TranslatorFactory.create(config)
        assert isinstance(translator, DeepLTranslator)

    def test_pom_basic_structure(self):
        """Verify TelegramWebPage POM structure."""
        from unittest.mock import AsyncMock
        page_mock = MagicMock()
        page_mock.goto = AsyncMock()
        page_mock.add_init_script = AsyncMock()
        
        tg_page = TelegramWebPage(page_mock)
        assert tg_page.page == page_mock
        
        # Test navigate
        import asyncio
        asyncio.run(tg_page.navigate())
        page_mock.goto.assert_called_with(
            "https://web.telegram.org/a/", wait_until="domcontentloaded"
        )
