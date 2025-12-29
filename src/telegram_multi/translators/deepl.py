"""
DeepL Translate provider implementation.
"""

import hashlib
import time
import requests
from typing import List, Optional
from src.telegram_multi.translator import Translator
from src.telegram_multi.config import TranslationConfig
from src.telegram_multi.settings import settings


class DeepLTranslator(Translator):
    """DeepL Translate provider using official API."""

    def __init__(self, config: TranslationConfig):
        """Initialize DeepL Translator.

        Args:
            config: TranslationConfig with source/target languages
        """
        super().__init__(config)
        self.api_key = settings.deepl_api_key.get_secret_value() if settings.deepl_api_key else None
        self.base_url = "https://api-free.deepl.com/v2/translate"
        self.max_retries = 3
        self.backoff_factor = 0.5

    def translate(self, text: str, src_lang: str = None, dest_lang: str = None) -> str:
        """Translate text using DeepL.

        Args:
            text: Text to translate
            src_lang: Source language
            dest_lang: Destination language

        Returns:
            Translated text, or original text on failure
        """
        if not self.config.enabled or not self.api_key:
            return text

        src_lang = src_lang or self.config.source_lang
        dest_lang = dest_lang or self.config.target_lang
        
        # DeepL specific language code adjustments (e.g., EN -> EN-US)
        if dest_lang.upper() == "EN":
            dest_lang = "EN-US"
        if dest_lang.upper() == "ZH":
            dest_lang = "ZH"

        text_hash = hashlib.md5(text.encode("utf-8")).hexdigest()
        cache_key = f"deepl:{src_lang}:{dest_lang}:{text_hash}"

        now = time.time()
        if cache_key in self.cache:
            entry = self.cache[cache_key]
            if isinstance(entry, tuple) and len(entry) == 2:
                trans_text, timestamp = entry
                if now - timestamp < self.config.cache_ttl:
                    return trans_text

        # Try translation with retries
        for attempt in range(self.max_retries):
            try:
                params = {
                    "auth_key": self.api_key,
                    "text": text,
                    "target_lang": dest_lang.upper(),
                }
                if src_lang and src_lang.lower() != "auto":
                    params["source_lang"] = src_lang.upper()

                response = requests.post(self.base_url, data=params, timeout=10)
                response.raise_for_status()
                
                result = response.json()
                if "translations" in result and len(result["translations"]) > 0:
                    trans_text = result["translations"][0]["text"]
                    self.cache[cache_key] = (trans_text, now)
                    return trans_text

            except Exception as e:
                if attempt < self.max_retries - 1:
                    wait_time = self.backoff_factor * (2**attempt)
                    time.sleep(wait_time)
                else:
                    return text

        return text

    def batch_translate(
        self, texts: List[str], src_lang: str = None, dest_lang: str = None
    ) -> List[str]:
        """Translate multiple texts."""
        return [self.translate(t, src_lang, dest_lang) for t in texts]
