use crate::domain::workflow::instance::WorkflowInstance;
use crate::domain::workflow::schema::WorkflowDefinition;
use crate::error::CoreError;
use sqlx::{SqlitePool, Row};

pub struct WorkflowRepository {
    pool: SqlitePool,
}

impl WorkflowRepository {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }

    pub async fn save_definition(&self, def: &WorkflowDefinition) -> Result<(), CoreError> {
        let nodes_json = serde_json::to_string(&def.nodes).unwrap_or_default();
        let edges_json = serde_json::to_string(&def.edges).unwrap_or_default();

        sqlx::query(
            r#"
            INSERT INTO workflow_definitions (id, name, version, nodes, edges, updated_at)
            VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(id) DO UPDATE SET
                name = excluded.name,
                version = excluded.version,
                nodes = excluded.nodes,
                edges = excluded.edges,
                updated_at = CURRENT_TIMESTAMP
            "#
        )
        .bind(&def.id)
        .bind(&def.name)
        .bind("v1")
        .bind(nodes_json)
        .bind(edges_json)
        .execute(&self.pool)
        .await
        .map_err(|e| CoreError::Db(e.to_string()))?;

        Ok(())
    }

    pub async fn get_definition(&self, id: &str) -> Result<Option<WorkflowDefinition>, CoreError> {
        let row = sqlx::query("SELECT * FROM workflow_definitions WHERE id = ?")
            .bind(id)
            .fetch_optional(&self.pool)
            .await
            .map_err(|e| CoreError::Db(e.to_string()))?;

        if let Some(r) = row {
            let nodes_json: String = r.try_get("nodes")?;
            let edges_json: String = r.try_get("edges")?;
            let nodes = serde_json::from_str(&nodes_json).unwrap_or_default();
            let edges = serde_json::from_str(&edges_json).unwrap_or_default();

            Ok(Some(WorkflowDefinition {
                id: r.try_get("id")?,
                name: r.try_get("name")?,
                description: "".to_string(),
                nodes,
                edges,
            }))
        } else {
            Ok(None)
        }
    }

    pub async fn save_instance(&self, instance: &WorkflowInstance) -> Result<(), CoreError> {
        sqlx::query(
            r#"
            INSERT INTO workflow_instances (id, definition_id, contact_id, current_node_id, state_data, status, next_execution_time, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(id) DO UPDATE SET
                current_node_id = excluded.current_node_id,
                state_data = excluded.state_data,
                status = excluded.status,
                next_execution_time = excluded.next_execution_time,
                updated_at = CURRENT_TIMESTAMP
            "#
        )
        .bind(&instance.id)
        .bind(&instance.definition_id)
        .bind(&instance.contact_id)
        .bind(&instance.current_node_id)
        .bind(&instance.state_data)
        .bind(&instance.status)
        .bind(&instance.next_execution_time)
        .execute(&self.pool)
        .await
        .map_err(|e| CoreError::Db(e.to_string()))?;

        Ok(())
    }

    pub async fn get_active_instance(&self, contact_id: &str) -> Result<Option<WorkflowInstance>, CoreError> {
        sqlx::query_as::<_, WorkflowInstance>(
            r#"
            SELECT * FROM workflow_instances 
            WHERE contact_id = ? AND status IN ('Running', 'WaitingForResponse')
            ORDER BY updated_at DESC
            LIMIT 1
            "#
        )
        .bind(contact_id)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| CoreError::Db(e.to_string()))
    }
}
