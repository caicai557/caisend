use crate::domain::models::Account;
use crate::error::CoreError;
use crate::adapters::browser::cdp_adapter::CdpManager;
use crate::managers::port_watcher::PortWatcher;
use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindowBuilder};

pub struct SessionManager {
    app_handle: AppHandle,
}

impl SessionManager {
    pub fn new(app_handle: AppHandle) -> Self {
        Self { app_handle }
    }

    pub async fn spawn_account_window(&self, account: &Account) -> Result<(), CoreError> {
        let window_label = format!("account-{}", account.id);

        if let Some(window) = self.app_handle.get_webview_window(&window_label) {
            window
                .set_focus()
                .map_err(|e| CoreError::SystemError(e.to_string()))?;
            return Ok(());
        }

        let app_data_dir = self
            .app_handle
            .path()
            .app_data_dir()
            .map_err(|e| CoreError::SystemError(e.to_string()))?;
        let session_dir = app_data_dir.join("sessions").join(&account.id);

        // Ensure session directory exists
        if !session_dir.exists() {
            std::fs::create_dir_all(&session_dir)
                .map_err(|e| CoreError::SystemError(e.to_string()))?;
        }

        let url = WebviewUrl::External(
            tauri::Url::parse("https://web.telegram.org/z/")
                .map_err(|e| CoreError::SystemError(e.to_string()))?,
        );

        let mut builder = WebviewWindowBuilder::new(&self.app_handle, &window_label, url)
            .title(format!("Teleflow - {}", account.name))
            .inner_size(1024.0, 768.0)
            .data_directory(session_dir.clone()); // CRITICAL: Data Partitioning

        // Inject MVP Observer Script (MVP-T3)
        let injection = format!(
            "window.__TELEFLOW_ACCOUNT_ID = '{}';\n{}",
            account.id,
            include_str!("../../js/mvp_observer.js")
        );
use ractor;
use crate::actors::supervisor;
use crate::actors::account;
use tokio::sync::oneshot;

pub struct SessionManager {
    app_handle: AppHandle,
}

impl SessionManager {
    pub fn new(app_handle: AppHandle) -> Self {
        Self { app_handle }
    }

    pub async fn spawn_account_window(&self, account: &Account) -> Result<(), CoreError> {
        let window_label = format!("account-{}", account.id);

        if let Some(window) = self.app_handle.get_webview_window(&window_label) {
            window
                .set_focus()
                .map_err(|e| CoreError::SystemError(e.to_string()))?;
            return Ok(());
        }

        let app_data_dir = self
            .app_handle
            .path()
            .app_data_dir()
            .map_err(|e| CoreError::SystemError(e.to_string()))?;
        let session_dir = app_data_dir.join("sessions").join(&account.id);

        // Ensure session directory exists
        if !session_dir.exists() {
            std::fs::create_dir_all(&session_dir)
                .map_err(|e| CoreError::SystemError(e.to_string()))?;
        }

        let url = WebviewUrl::External(
            tauri::Url::parse("https://web.telegram.org/z/")
                .map_err(|e| CoreError::SystemError(e.to_string()))?,
        );

        let mut builder = WebviewWindowBuilder::new(&self.app_handle, &window_label, url)
            .title(format!("Teleflow - {}", account.name))
            .inner_size(1024.0, 768.0)
            .data_directory(session_dir.clone()); // CRITICAL: Data Partitioning

        // Inject MVP Observer Script (MVP-T3)
        let injection = format!(
            "window.__TELEFLOW_ACCOUNT_ID = '{}';\n{}",
            account.id,
            include_str!("../../js/mvp_observer.js")
        );
        builder = builder.initialization_script(injection);

        builder
            .build()
            .map_err(|e| CoreError::SystemError(e.to_string()))?;

        // 🚀 Phase 1.3: Dynamic CDP Port Discovery and Connection (Actor-based)
        let account_id_clone = account.id.clone();
        let session_dir_clone = session_dir.clone();
        let app_handle_clone = self.app_handle.clone();
        
        // Spawn async task to discover port and connect CDP via Actor
        tauri::async_runtime::spawn(async move {
            tracing::info!("[CDP] Starting port discovery for account: {}", account_id_clone);
            
            // 1. Get Supervisor
            let supervisor = match app_handle_clone.try_state::<ractor::ActorRef<crate::actors::supervisor::SupervisorMessage>>() {
                Some(s) => s.inner().clone(),
                None => {
                    tracing::error!("[System] Supervisor not found in app state");
                    return;
                }
            };

            // 2. Spawn Account Actor (The Vassal)
            let config = crate::actors::account::AccountConfig {
                account_id: account_id_clone.clone(),
                proxy: None, // TODO: Load from DB
                user_agent: None,
            };
            
            if let Err(e) = supervisor.cast(crate::actors::supervisor::SupervisorMessage::SpawnAccount { config }) {
                tracing::error!("[System] Failed to spawn account actor: {}", e);
                return;
            }

            // 3. Discover Port
            let port = match PortWatcher::new(session_dir_clone).watch().await {
                Ok(p) => {
                    tracing::info!("[CDP] Discovered port {} for account {}", p, account_id_clone);
                    p
                }
                Err(e) => {
                    tracing::error!("[CDP] Port discovery failed for account {}: {}", account_id_clone, e);
                    return;
                }
            };

            // 4. Tell Actor to Connect
            // We need to get the actor ref first. 
            // In a pure actor system, we might send this to Supervisor to forward, but direct is faster.
            // Let's ask Supervisor for the actor ref.
            
            let (tx, rx) = tokio::sync::oneshot::channel();
            if let Err(e) = supervisor.cast(crate::actors::supervisor::SupervisorMessage::GetAccount(account_id_clone.clone(), tx)) {
                 tracing::error!("[System] Failed to query account actor: {}", e);
                 return;
            }

            match rx.await {
                Ok(Some(actor)) => {
                    if let Err(e) = actor.cast(crate::actors::account::AccountMessage::Connect { port }) {
                        tracing::error!("[System] Failed to send Connect to actor: {}", e);
                    } else {
                        tracing::info!("[System] Connect instruction sent to actor {}", account_id_clone);
                    }
                }
                Ok(None) => {
                    tracing::error!("[System] Account actor not found after spawn: {}", account_id_clone);
                }
                Err(e) => {
                    tracing::error!("[System] Failed to receive account actor ref: {}", e);
                }
            }
        });

        Ok(())
    }
}
