use crate::domain::events::AppEvent;
use crate::domain::workflow::instance::InstanceStatus;
use crate::state::AppState;
use chrono::Utc;
use tauri::{AppHandle, Manager};
use tokio::time::{sleep, Duration};

pub struct WorkflowScheduler {
    app_handle: AppHandle,
}

impl WorkflowScheduler {
    pub fn new(app_handle: AppHandle) -> Self {
        Self { app_handle }
    }

    pub async fn start(&self) {
        let app_handle = self.app_handle.clone();
        
        tokio::spawn(async move {
            loop {
                // Poll every 1 second
                sleep(Duration::from_secs(1)).await;

                let now = Utc::now().to_rfc3339();
                let state: tauri::State<AppState> = app_handle.state();
                
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
                .fetch_all(state.pool())
                .await;

                match due_instances {
                    Ok(rows) => {
                        for row in rows {
                            // Emit Event
                            let contact_id: String = row.get("contact_id");
                            let _ = state.event_sender().send(AppEvent::WorkflowTimerTriggered { 
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
