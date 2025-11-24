use crate::domain::models::{Account, Rule};
use sqlx::{SqlitePool, Result};

pub struct MvpRepository {
    pool: SqlitePool,
}

impl MvpRepository {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }

    // Account Operations
    pub async fn create_account(&self, account: &Account) -> Result<()> {
        sqlx::query(
            "INSERT INTO accounts (id, name, status) VALUES (?, ?, ?)"
        )
        .bind(&account.id)
        .bind(&account.name)
        .bind(&account.status)
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    pub async fn get_account(&self, id: &str) -> Result<Option<Account>> {
        sqlx::query_as::<_, Account>(
            "SELECT * FROM accounts WHERE id = ?"
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await
    }

    pub async fn list_accounts(&self) -> Result<Vec<Account>> {
        sqlx::query_as::<_, Account>(
            "SELECT * FROM accounts"
        )
        .fetch_all(&self.pool)
        .await
    }

    pub async fn update_account_status(&self, id: &str, status: &str) -> Result<()> {
        sqlx::query(
            "UPDATE accounts SET status = ? WHERE id = ?"
        )
        .bind(status)
        .bind(id)
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    pub async fn delete_account(&self, id: &str) -> Result<()> {
        sqlx::query(
            "DELETE FROM accounts WHERE id = ?"
        )
        .bind(id)
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    // Rule Operations
    pub async fn create_rule(&self, rule: &Rule) -> Result<()> {
        sqlx::query(
            "INSERT INTO rules (id, account_id, trigger_type, trigger_pattern, reply_text, delay_min_ms, delay_max_ms, is_enabled) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(&rule.id)
        .bind(&rule.account_id)
        .bind(&rule.trigger_type)
        .bind(&rule.trigger_pattern)
        .bind(&rule.reply_text)
        .bind(rule.delay_min_ms)
        .bind(rule.delay_max_ms)
        .bind(rule.is_enabled)
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    pub async fn get_rules_for_account(&self, account_id: &str) -> Result<Vec<Rule>> {
        sqlx::query_as::<_, Rule>(
            "SELECT * FROM rules WHERE account_id = ? OR account_id IS NULL"
        )
        .bind(account_id)
        .fetch_all(&self.pool)
        .await
    }
    
    pub async fn get_global_rules(&self) -> Result<Vec<Rule>> {
        sqlx::query_as::<_, Rule>(
            "SELECT * FROM rules WHERE account_id IS NULL"
        )
        .fetch_all(&self.pool)
        .await
    }

    pub async fn delete_rule(&self, id: &str) -> Result<()> {
        sqlx::query(
            "DELETE FROM rules WHERE id = ?"
        )
        .bind(id)
        .execute(&self.pool)
        .await?;
        Ok(())
    }
}
