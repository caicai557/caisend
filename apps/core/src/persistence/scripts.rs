//! Script Management - 话术管理模块
//!
//! Replicates PoSend's script category and content management functionality.
//! Implements the word_class and word_list database schema.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use tracing::{debug, info};
use uuid::Uuid;

/// Script category (话术分类) - equivalent to word_class
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScriptCategory {
    pub id: i64,
    pub parent_sign: Option<String>,
    pub sign: String,
    pub label: String,
    pub position: i32,
    pub is_group: bool,
    pub created_at: DateTime<Utc>,
}

impl ScriptCategory {
    /// Create a new category with generated sign
    pub fn new(label: &str, parent_sign: Option<&str>, position: i32) -> Self {
        Self {
            id: 0, // Will be set by database
            parent_sign: parent_sign.map(String::from),
            sign: format!("TSM-{}", Uuid::new_v4().as_simple().to_string()[..12].to_uppercase()),
            label: label.to_string(),
            position,
            is_group: false,
            created_at: Utc::now(),
        }
    }
}

/// Script content type
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum ScriptContentType {
    Text = 1,
    Image = 2,
    Mixed = 3,
}

impl Default for ScriptContentType {
    fn default() -> Self {
        Self::Text
    }
}

/// Individual content item in a script
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScriptContentItem {
    #[serde(rename = "type")]
    pub content_type: i32,
    pub value: String,
    #[serde(default)]
    pub name: String,
}

impl ScriptContentItem {
    pub fn text(value: &str) -> Self {
        Self {
            content_type: 1,
            value: value.to_string(),
            name: String::new(),
        }
    }

    pub fn image(path: &str, name: &str) -> Self {
        Self {
            content_type: 2,
            value: path.to_string(),
            name: name.to_string(),
        }
    }
}

/// Script item (话术内容) - equivalent to word_list
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScriptItem {
    pub id: i64,
    pub parent_sign: String,
    pub sign: String,
    pub label: String,
    pub content: Vec<ScriptContentItem>,
    pub position: i32,
    pub script_type: i32,
    pub created_at: DateTime<Utc>,
}

impl ScriptItem {
    /// Create a new script item with text content
    pub fn new_text(category_sign: &str, label: &str, text: &str, position: i32) -> Self {
        Self {
            id: 0,
            parent_sign: category_sign.to_string(),
            sign: format!("TSM-{}", Uuid::new_v4().as_simple().to_string()[..12].to_uppercase()),
            label: label.to_string(),
            content: vec![ScriptContentItem::text(text)],
            position,
            script_type: 0,
            created_at: Utc::now(),
        }
    }
}

/// Script Repository - manages script persistence
pub struct ScriptRepository {
    pool: SqlitePool,
}

impl ScriptRepository {
    /// Create a new repository
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }

    /// Initialize script tables
    pub async fn init_tables(&self) -> Result<(), sqlx::Error> {
        // Create script_categories table
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS script_categories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                parent_sign TEXT,
                sign TEXT NOT NULL UNIQUE,
                label TEXT NOT NULL,
                position INTEGER DEFAULT 0,
                is_group INTEGER DEFAULT 0,
                created_at TEXT NOT NULL
            )
            "#,
        )
        .execute(&self.pool)
        .await?;

        // Create script_items table
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS script_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                parent_sign TEXT NOT NULL,
                sign TEXT NOT NULL UNIQUE,
                label TEXT NOT NULL,
                json_value TEXT NOT NULL,
                position INTEGER DEFAULT 0,
                script_type INTEGER DEFAULT 0,
                created_at TEXT NOT NULL,
                FOREIGN KEY (parent_sign) REFERENCES script_categories(sign)
            )
            "#,
        )
        .execute(&self.pool)
        .await?;

        // Create indexes
        sqlx::query("CREATE INDEX IF NOT EXISTS idx_categories_parent ON script_categories(parent_sign)")
            .execute(&self.pool)
            .await?;
        sqlx::query("CREATE INDEX IF NOT EXISTS idx_items_parent ON script_items(parent_sign)")
            .execute(&self.pool)
            .await?;

        info!("📋 Script tables initialized");
        Ok(())
    }

    // ========== Category Operations ==========

    /// Create a new category
    pub async fn create_category(&self, category: &ScriptCategory) -> Result<i64, sqlx::Error> {
        let result = sqlx::query(
            r#"
            INSERT INTO script_categories (parent_sign, sign, label, position, is_group, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            "#,
        )
        .bind(&category.parent_sign)
        .bind(&category.sign)
        .bind(&category.label)
        .bind(category.position)
        .bind(category.is_group as i32)
        .bind(category.created_at.to_rfc3339())
        .execute(&self.pool)
        .await?;

        let id = result.last_insert_rowid();
        info!("📁 Created category: {} (ID: {})", category.label, id);
        Ok(id)
    }

    /// List all categories
    pub async fn list_categories(&self) -> Result<Vec<ScriptCategory>, sqlx::Error> {
        let rows = sqlx::query_as::<_, (i64, Option<String>, String, String, i32, i32, String)>(
            "SELECT id, parent_sign, sign, label, position, is_group, created_at 
             FROM script_categories ORDER BY position"
        )
        .fetch_all(&self.pool)
        .await?;

        let categories = rows
            .into_iter()
            .map(|(id, parent_sign, sign, label, position, is_group, created_at)| {
                ScriptCategory {
                    id,
                    parent_sign,
                    sign,
                    label,
                    position,
                    is_group: is_group != 0,
                    created_at: chrono::DateTime::parse_from_rfc3339(&created_at)
                        .map(|dt| dt.with_timezone(&Utc))
                        .unwrap_or_else(|_| Utc::now()),
                }
            })
            .collect();

        Ok(categories)
    }

    /// Get category by sign
    pub async fn get_category(&self, sign: &str) -> Result<Option<ScriptCategory>, sqlx::Error> {
        let row = sqlx::query_as::<_, (i64, Option<String>, String, String, i32, i32, String)>(
            "SELECT id, parent_sign, sign, label, position, is_group, created_at 
             FROM script_categories WHERE sign = ?"
        )
        .bind(sign)
        .fetch_optional(&self.pool)
        .await?;

        Ok(row.map(|(id, parent_sign, sign, label, position, is_group, created_at)| {
            ScriptCategory {
                id,
                parent_sign,
                sign,
                label,
                position,
                is_group: is_group != 0,
                created_at: chrono::DateTime::parse_from_rfc3339(&created_at)
                    .map(|dt| dt.with_timezone(&Utc))
                    .unwrap_or_else(|_| Utc::now()),
            }
        }))
    }

    /// Update category label
    pub async fn update_category(&self, sign: &str, label: &str) -> Result<(), sqlx::Error> {
        sqlx::query("UPDATE script_categories SET label = ? WHERE sign = ?")
            .bind(label)
            .bind(sign)
            .execute(&self.pool)
            .await?;
        debug!("📁 Updated category: {}", sign);
        Ok(())
    }

    /// Delete category
    pub async fn delete_category(&self, sign: &str) -> Result<(), sqlx::Error> {
        // Delete all scripts in this category first
        sqlx::query("DELETE FROM script_items WHERE parent_sign = ?")
            .bind(sign)
            .execute(&self.pool)
            .await?;
        // Then delete the category
        sqlx::query("DELETE FROM script_categories WHERE sign = ?")
            .bind(sign)
            .execute(&self.pool)
            .await?;
        info!("🗑️ Deleted category: {}", sign);
        Ok(())
    }

    // ========== Script Item Operations ==========

    /// Create a new script item
    pub async fn create_script(&self, script: &ScriptItem) -> Result<i64, sqlx::Error> {
        let json_value = serde_json::to_string(&script.content)
            .map_err(|e| sqlx::Error::Encode(Box::new(e)))?;

        let result = sqlx::query(
            r#"
            INSERT INTO script_items (parent_sign, sign, label, json_value, position, script_type, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            "#,
        )
        .bind(&script.parent_sign)
        .bind(&script.sign)
        .bind(&script.label)
        .bind(&json_value)
        .bind(script.position)
        .bind(script.script_type)
        .bind(script.created_at.to_rfc3339())
        .execute(&self.pool)
        .await?;

        let id = result.last_insert_rowid();
        info!("📝 Created script: {} (ID: {})", script.label, id);
        Ok(id)
    }

    /// Get scripts by category sign
    pub async fn get_scripts_by_category(&self, category_sign: &str) -> Result<Vec<ScriptItem>, sqlx::Error> {
        let rows = sqlx::query_as::<_, (i64, String, String, String, String, i32, i32, String)>(
            "SELECT id, parent_sign, sign, label, json_value, position, script_type, created_at 
             FROM script_items WHERE parent_sign = ? ORDER BY position"
        )
        .bind(category_sign)
        .fetch_all(&self.pool)
        .await?;

        let scripts = rows
            .into_iter()
            .map(|(id, parent_sign, sign, label, json_value, position, script_type, created_at)| {
                let content: Vec<ScriptContentItem> = serde_json::from_str(&json_value)
                    .unwrap_or_default();
                ScriptItem {
                    id,
                    parent_sign,
                    sign,
                    label,
                    content,
                    position,
                    script_type,
                    created_at: chrono::DateTime::parse_from_rfc3339(&created_at)
                        .map(|dt| dt.with_timezone(&Utc))
                        .unwrap_or_else(|_| Utc::now()),
                }
            })
            .collect();

        Ok(scripts)
    }

    /// Get all scripts
    pub async fn list_all_scripts(&self) -> Result<Vec<ScriptItem>, sqlx::Error> {
        let rows = sqlx::query_as::<_, (i64, String, String, String, String, i32, i32, String)>(
            "SELECT id, parent_sign, sign, label, json_value, position, script_type, created_at 
             FROM script_items ORDER BY parent_sign, position"
        )
        .fetch_all(&self.pool)
        .await?;

        let scripts = rows
            .into_iter()
            .map(|(id, parent_sign, sign, label, json_value, position, script_type, created_at)| {
                let content: Vec<ScriptContentItem> = serde_json::from_str(&json_value)
                    .unwrap_or_default();
                ScriptItem {
                    id,
                    parent_sign,
                    sign,
                    label,
                    content,
                    position,
                    script_type,
                    created_at: chrono::DateTime::parse_from_rfc3339(&created_at)
                        .map(|dt| dt.with_timezone(&Utc))
                        .unwrap_or_else(|_| Utc::now()),
                }
            })
            .collect();

        Ok(scripts)
    }

    /// Update script content
    pub async fn update_script(&self, sign: &str, label: &str, content: &[ScriptContentItem]) -> Result<(), sqlx::Error> {
        let json_value = serde_json::to_string(content)
            .map_err(|e| sqlx::Error::Encode(Box::new(e)))?;

        sqlx::query("UPDATE script_items SET label = ?, json_value = ? WHERE sign = ?")
            .bind(label)
            .bind(&json_value)
            .bind(sign)
            .execute(&self.pool)
            .await?;
        debug!("📝 Updated script: {}", sign);
        Ok(())
    }

    /// Delete script
    pub async fn delete_script(&self, sign: &str) -> Result<(), sqlx::Error> {
        sqlx::query("DELETE FROM script_items WHERE sign = ?")
            .bind(sign)
            .execute(&self.pool)
            .await?;
        info!("🗑️ Deleted script: {}", sign);
        Ok(())
    }

    /// Update positions for reordering
    pub async fn update_positions(&self, updates: &[(String, i32)]) -> Result<(), sqlx::Error> {
        for (sign, position) in updates {
            sqlx::query("UPDATE script_items SET position = ? WHERE sign = ?")
                .bind(position)
                .bind(sign)
                .execute(&self.pool)
                .await?;
        }
        debug!("📋 Updated {} positions", updates.len());
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::persistence::database::init_db;

    #[tokio::test]
    async fn test_script_category_crud() {
        let pool = init_db(":memory:").await.unwrap();
        let repo = ScriptRepository::new(pool);
        repo.init_tables().await.unwrap();

        // Create category
        let category = ScriptCategory::new("客户开发", None, 1);
        let id = repo.create_category(&category).await.unwrap();
        assert!(id > 0);

        // List categories
        let categories = repo.list_categories().await.unwrap();
        assert_eq!(categories.len(), 1);
        assert_eq!(categories[0].label, "客户开发");

        // Get by sign
        let found = repo.get_category(&category.sign).await.unwrap();
        assert!(found.is_some());

        // Update
        repo.update_category(&category.sign, "客户开发V2").await.unwrap();
        let updated = repo.get_category(&category.sign).await.unwrap().unwrap();
        assert_eq!(updated.label, "客户开发V2");

        // Delete
        repo.delete_category(&category.sign).await.unwrap();
        let deleted = repo.get_category(&category.sign).await.unwrap();
        assert!(deleted.is_none());

        println!("✅ Script category CRUD test passed");
    }

    #[tokio::test]
    async fn test_script_item_crud() {
        let pool = init_db(":memory:").await.unwrap();
        let repo = ScriptRepository::new(pool);
        repo.init_tables().await.unwrap();

        // Create category first
        let category = ScriptCategory::new("话术分类", None, 1);
        repo.create_category(&category).await.unwrap();

        // Create script
        let script = ScriptItem::new_text(&category.sign, "打招呼", "您好，欢迎咨询！", 1);
        let script_id = repo.create_script(&script).await.unwrap();
        assert!(script_id > 0);

        // Get scripts by category
        let scripts = repo.get_scripts_by_category(&category.sign).await.unwrap();
        assert_eq!(scripts.len(), 1);
        assert_eq!(scripts[0].label, "打招呼");
        assert_eq!(scripts[0].content[0].value, "您好，欢迎咨询！");

        // Update script
        repo.update_script(&script.sign, "打招呼V2", &[ScriptContentItem::text("您好！有什么可以帮您？")])
            .await.unwrap();
        
        let updated = repo.get_scripts_by_category(&category.sign).await.unwrap();
        assert_eq!(updated[0].label, "打招呼V2");
        assert_eq!(updated[0].content[0].value, "您好！有什么可以帮您？");

        // Delete script
        repo.delete_script(&script.sign).await.unwrap();
        let deleted = repo.get_scripts_by_category(&category.sign).await.unwrap();
        assert!(deleted.is_empty());

        println!("✅ Script item CRUD test passed");
    }
}
