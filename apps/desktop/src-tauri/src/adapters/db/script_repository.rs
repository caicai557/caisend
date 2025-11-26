use async_trait::async_trait;
use sqlx::{SqlitePool, Row};
use crate::domain::ports::ScriptRepositoryPort;
use crate::domain::workflow::{ScriptFlow, ScriptStep, ScriptInstance, AccountConfig, AdvanceMode};
use crate::error::CoreError;

/// SQLite实现的脚本仓库
pub struct SqliteScriptRepository {
    pool: SqlitePool,
}

impl SqliteScriptRepository {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }
}

#[async_trait]
impl ScriptRepositoryPort for SqliteScriptRepository {
    async fn get_flows_by_account(
        &self, 
        account_id: &str
    ) -> Result<Vec<ScriptFlow>, CoreError> {
        let flows = sqlx::query(
            "SELECT id, account_id, category_name, created_at, updated_at 
             FROM script_flows WHERE account_id = ?"
        )
        .bind(account_id)
        .fetch_all(&self.pool)
        .await
        .map_err(|e| CoreError::Db(e.to_string()))?;
        
        let mut result = Vec::new();
        for flow_row in flows {
            let flow_id: String = flow_row.get("id");
            
            // 查询该流程的所有步骤
            let steps = sqlx::query(
                "SELECT id, order_index, content, advance_mode_json 
                 FROM script_steps WHERE flow_id = ? ORDER BY order_index"
            )
            .bind(&flow_id)
            .fetch_all(&self.pool)
            .await
            .map_err(|e| CoreError::Db(e.to_string()))?;
            
            let parsed_steps: Vec<ScriptStep> = steps.iter()
                .filter_map(|row| {
                    let advance_mode_json: String = row.get("advance_mode_json");
                    let advance_mode: AdvanceMode = serde_json::from_str(&advance_mode_json).ok()?;
                    
                    Some(ScriptStep {
                        id: row.get("id"),
                        order: row.get("order_index"),
                        content: row.get("content"),
                        advance_mode,
                    })
                })
                .collect();
            
            result.push(ScriptFlow {
                id: flow_id,
                account_id: flow_row.get("account_id"),
                category_name: flow_row.get("category_name"),
                steps: parsed_steps,
                created_at: flow_row.get("created_at"),
                updated_at: flow_row.get("updated_at"),
            });
        }
        
        Ok(result)
    }
    
    async fn get_flow(
        &self,
        flow_id: &str,
    ) -> Result<Option<ScriptFlow>, CoreError> {
        let flow_row = sqlx::query(
            "SELECT id, account_id, category_name, created_at, updated_at 
             FROM script_flows WHERE id = ?"
        )
        .bind(flow_id)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| CoreError::Db(e.to_string()))?;
        
        let Some(row) = flow_row else {
            return Ok(None);
        };
        
        // 查询步骤
        let steps = sqlx::query(
            "SELECT id, order_index, content, advance_mode_json 
             FROM script_steps WHERE flow_id = ? ORDER BY order_index"
        )
        .bind(flow_id)
        .fetch_all(&self.pool)
        .await
        .map_err(|e| CoreError::Db(e.to_string()))?;
        
        let parsed_steps: Vec<ScriptStep> = steps.iter()
            .filter_map(|step_row| {
                let advance_mode_json: String = step_row.get("advance_mode_json");
                let advance_mode: AdvanceMode = serde_json::from_str(&advance_mode_json).ok()?;
                
                Some(ScriptStep {
                    id: step_row.get("id"),
                    order: step_row.get("order_index"),
                    content: step_row.get("content"),
                    advance_mode,
                })
            })
            .collect();
        
        Ok(Some(ScriptFlow {
            id: row.get("id"),
            account_id: row.get("account_id"),
            category_name: row.get("category_name"),
            steps: parsed_steps,
            created_at: row.get("created_at"),
            updated_at: row.get("updated_at"),
        }))
    }
    
    async fn save_flow(
        &self,
        flow: &ScriptFlow,
    ) -> Result<(), CoreError> {
        let mut tx = self.pool.begin()
            .await
            .map_err(|e| CoreError::Db(e.to_string()))?;
        
        // 插入或更新流程
        sqlx::query(
            "INSERT INTO script_flows (id, account_id, category_name, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?)
             ON CONFLICT(id) DO UPDATE SET
                category_name = excluded.category_name,
                updated_at = excluded.updated_at"
        )
        .bind(&flow.id)
        .bind(&flow.account_id)
        .bind(&flow.category_name)
        .bind(flow.created_at)
        .bind(flow.updated_at)
        .execute(&mut *tx)
        .await
        .map_err(|e| CoreError::Db(e.to_string()))?;
        
        // 删除旧步骤
        sqlx::query("DELETE FROM script_steps WHERE flow_id = ?")
            .bind(&flow.id)
            .execute(&mut *tx)
            .await
            .map_err(|e| CoreError::Db(e.to_string()))?;
        
        // 插入新步骤
        for step in &flow.steps {
            let advance_mode_json = serde_json::to_string(&step.advance_mode)
                .map_err(|e| CoreError::InternalError(e.to_string()))?;
            
            sqlx::query(
                "INSERT INTO script_steps (id, flow_id, order_index, content, advance_mode_json)
                 VALUES (?, ?, ?, ?, ?)"
            )
            .bind(&step.id)
            .bind(&flow.id)
            .bind(step.order)
            .bind(&step.content)
            .bind(advance_mode_json)
            .execute(&mut *tx)
            .await
            .map_err(|e| CoreError::Db(e.to_string()))?;
        }
        
        tx.commit()
            .await
            .map_err(|e| CoreError::Db(e.to_string()))?;
        
        Ok(())
    }
    
    async fn get_instance(
        &self,
        account_id: &str,
        peer_id: &str,
    ) -> Result<Option<ScriptInstance>, CoreError> {
        let row = sqlx::query(
            "SELECT id, flow_id, account_id, peer_id, current_step_index, status, created_at, updated_at
             FROM script_instances WHERE account_id = ? AND peer_id = ?"
        )
        .bind(account_id)
        .bind(peer_id)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| CoreError::Db(e.to_string()))?;
        
        Ok(row.map(|r| {
            let status_str: String = r.get("status");
            let status = serde_json::from_str(&format!("\"{}\"", status_str))
                .unwrap_or(crate::domain::workflow::script::InstanceStatus::Running);
            
            ScriptInstance {
                id: r.get("id"),
                flow_id: r.get("flow_id"),
                account_id: r.get("account_id"),
                peer_id: r.get("peer_id"),
                current_step_index: r.get::<i32, _>("current_step_index") as usize,
                status,
                created_at: r.get("created_at"),
                updated_at: r.get("updated_at"),
            }
        }))
    }
    
    async fn save_instance(
        &self,
        instance: &ScriptInstance,
    ) -> Result<(), CoreError> {
        let status_str = serde_json::to_string(&instance.status)
            .map_err(|e| CoreError::InternalError(e.to_string()))?
            .trim_matches('"')
            .to_string();
        
        sqlx::query(
            "INSERT INTO script_instances 
             (id, flow_id, account_id, peer_id, current_step_index, status, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(account_id, peer_id) DO UPDATE SET
                flow_id = excluded.flow_id,
                current_step_index = excluded.current_step_index,
                status = excluded.status,
                updated_at = excluded.updated_at"
        )
        .bind(&instance.id)
        .bind(&instance.flow_id)
        .bind(&instance.account_id)
        .bind(&instance.peer_id)
        .bind(instance.current_step_index as i32)
        .bind(status_str)
        .bind(instance.created_at)
        .bind(instance.updated_at)
        .execute(&self.pool)
        .await
        .map_err(|e| CoreError::Db(e.to_string()))?;
        
        Ok(())
    }
    
    async fn get_account_config(
        &self,
        account_id: &str,
    ) -> Result<Option<AccountConfig>, CoreError> {
        let row = sqlx::query(
            "SELECT account_id, autoreply_enabled, updated_at
             FROM account_configs WHERE account_id = ?"
        )
        .bind(account_id)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| CoreError::Db(e.to_string()))?;
        
        Ok(row.map(|r| AccountConfig {
            account_id: r.get("account_id"),
            autoreply_enabled: r.get::<i32, _>("autoreply_enabled") != 0,
            updated_at: r.get("updated_at"),
        }))
    }
    
    async fn toggle_autoreply(
        &self,
        account_id: &str,
    ) -> Result<bool, CoreError> {
        // 先获取当前状态
        let config = self.get_account_config(account_id).await?;
        let current = config.map(|c| c.autoreply_enabled).unwrap_or(false);
        let new_state = !current;
        
        // 更新状态
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;
        
        sqlx::query(
            "INSERT INTO account_configs (account_id, autoreply_enabled, updated_at)
             VALUES (?, ?, ?)
             ON CONFLICT(account_id) DO UPDATE SET
                autoreply_enabled = excluded.autoreply_enabled,
                updated_at = excluded.updated_at"
        )
        .bind(account_id)
        .bind(new_state as i32)
        .bind(now)
        .execute(&self.pool)
        .await
        .map_err(|e| CoreError::Db(e.to_string()))?;
        
        Ok(new_state)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::workflow::script::InstanceStatus;
    
    async fn setup_test_db() -> SqlitePool {
        let pool = SqlitePool::connect(":memory:").await.unwrap();
        
        // 创建表
        sqlx::query(include_str!("../../../migrations/20251127000000_create_script_tables.sql"))
            .execute(&pool)
            .await
            .ok(); // 可能失败（因为CREATE TABLE IF NOT EXISTS）
        
        // 创建测试账号
        sqlx::query("INSERT INTO accounts (id, name, status) VALUES ('acc1', 'Test', 'active')")
            .execute(&pool)
            .await
            .ok();
        
        pool
    }
    
    #[tokio::test]
    async fn test_save_and_get_flow() {
        let pool = setup_test_db().await;
        let repo = SqliteScriptRepository::new(pool);
        
        let flow = ScriptFlow {
            id: "flow1".into(),
            account_id: "acc1".into(),
            category_name: "测试分类".into(),
            steps: vec![
                ScriptStep {
                    id: "step1".into(),
                    order: 0,
                    content: "第一句话术".into(),
                    advance_mode: AdvanceMode::Manual,
                },
            ],
            created_at: 1000,
            updated_at: 1000,
        };
        
        repo.save_flow(&flow).await.unwrap();
        let retrieved = repo.get_flow("flow1").await.unwrap().unwrap();
        
        assert_eq!(retrieved.id, "flow1");
        assert_eq!(retrieved.steps.len(), 1);
    }
}
