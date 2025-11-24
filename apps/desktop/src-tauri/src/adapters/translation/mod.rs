use async_trait::async_trait;
use std::sync::Arc;
use tokio::sync::RwLock;
use moka::future::Cache;
use sqlx::SqlitePool;
use crate::error::CoreError;

#[async_trait]
pub trait TranslationPort: Send + Sync {
    async fn translate(&self, text: &str, target_lang: &str) -> Result<String, CoreError>;
}

pub struct GoogleTranslateAdapter;

#[async_trait]
impl TranslationPort for GoogleTranslateAdapter {
    async fn translate(&self, text: &str, target_lang: &str) -> Result<String, CoreError> {
        // Placeholder for actual Google Translate API call
        // In a real app, use reqwest to call the API
        Ok(format!("[{}] {}", target_lang, text))
    }
}

pub struct CachedTranslator {
    adapter: Box<dyn TranslationPort>,
    l1_cache: Cache<String, String>, // Key: "text:lang", Value: translated_text
    db_pool: SqlitePool,
}

impl CachedTranslator {
    pub fn new(adapter: Box<dyn TranslationPort>, db_pool: SqlitePool) -> Self {
        Self {
            adapter,
            l1_cache: Cache::new(1000), // Hold 1000 translations in memory
            db_pool,
        }
    }

    pub async fn translate(&self, text: &str, target_lang: &str) -> Result<String, CoreError> {
        let key = format!("{}:{}", text, target_lang);

        // 1. Check L1 Cache (Memory)
        if let Some(cached) = self.l1_cache.get(&key).await {
            return Ok(cached);
        }

        // 2. Check L2 Cache (Database)
        // Assuming we have a translations table (omitted for brevity in E2-T2 but implied)
        // let cached_db = sqlx::query!("SELECT translated_text FROM translations WHERE original_text = ? AND target_lang = ?", text, target_lang)
        //    .fetch_optional(&self.db_pool).await?;
        // if let Some(row) = cached_db {
        //     self.l1_cache.insert(key.clone(), row.translated_text.clone()).await;
        //     return Ok(row.translated_text);
        // }

        // 3. Call API
        let translated = self.adapter.translate(text, target_lang).await?;

        // 4. Update L1 & L2
        self.l1_cache.insert(key.clone(), translated.clone()).await;
        // sqlx::query!("INSERT INTO translations ...").execute(&self.db_pool).await?;

        Ok(translated)
    }
}
