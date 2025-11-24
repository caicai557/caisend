use crate::state::AppState;
use crate::domain::events::AppEvent;
use crate::domain::workflow::instance::InstanceStatus;
use std::sync::Arc;
use tokio::time::{sleep, Duration};
use chrono::Utc;

pub struct WorkflowScheduler {
    app_state: Arc<AppState>,
}

impl WorkflowScheduler {
    pub fn new(app_state: Arc<AppState>) -> Self {
        Self { app_state }
    }

    pub async fn start(&self) {
        let app_state = self.app_state.clone();
        
        tokio::spawn(async move {
            loop {
                // Poll every 1 second
                sleep(Duration::from_secs(1)).await;

                // Find due instances
                // We need a method in Repo to find due instances. 
                // Since we don't have direct access to Repo here (it's in AppState but we need to construct it or access it via a service),
                // We'll assume we can run a query via db_pool directly for simplicity in this vertical slice.
                
                let now = Utc::now().to_rfc3339();
                
                use sqlx::Row;
                let due_instances = sqlx::query(
                    r#"
                    SELECT contact_id FROM workflow_instances 
                    WHERE (status = ? OR status = ?) 
                    AND next_execution_time <= ?
                    "#
                )
                .bind(InstanceStatus::Scheduled.to_string())
                .bind(InstanceStatus::WaitingForResponse.to_string())
                .bind(now)
                .fetch_all(&app_state.db_pool)
                .await;

                match due_instances {
                    Ok(rows) => {
                        for row in rows {
                            // Emit Event
                            let contact_id: String = row.get("contact_id");
                            let _ = app_state.event_bus.send(AppEvent::WorkflowTimerTriggered { 
                                contact_id 
                            });
                        }
                    },
                    Err(e) => {
                        eprintln!("Scheduler Error: {}", e);
                    }
                }
            }
        });
    }
}
