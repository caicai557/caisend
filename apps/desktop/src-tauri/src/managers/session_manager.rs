use crate::domain::models::Account;
use crate::error::CoreError;
use crate::managers::cdp_manager::CdpManager;
use crate::managers::port_discoverer;
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
            .data_directory(session_dir); // CRITICAL: Data Partitioning

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

        // 🚀 Phase 1.3: Dynamic CDP Port Discovery and Connection
        let account_id_clone = account.id.clone();
        let session_dir_clone = session_dir.clone();
        let app_handle_clone = self.app_handle.clone();
        
        // Spawn async task to discover port and connect CDP
        tauri::async_runtime::spawn(async move {
            tracing::info!("[CDP] Starting port discovery for account: {}", account_id_clone);
            
            // Discover dynamic CDP port (with 15s timeout)
            let port = match port_discoverer::discover_cdp_port(session_dir_clone).await {
                Ok(p) => {
                    tracing::info!("[CDP] Discovered port {} for account {}", p, account_id_clone);
                    p
                }
                Err(e) => {
                    tracing::error!("[CDP] Port discovery failed for account {}: {}", account_id_clone, e);
                    return;
                }
            };

            // Connect to CDP
            let cdp_manager = match app_handle_clone.try_state::<CdpManager>() {
                Some(mgr) => mgr.inner().clone(),
                None => {
                    tracing::error!("[CDP] CdpManager not found in app state");
                    return;
                }
            };

            if let Err(e) = cdp_manager.connect(account_id_clone.clone(), port).await {
                tracing::error!("[CDP] Connection failed for account {}: {}", account_id_clone, e);
            } else {
                tracing::info!("[CDP] Successfully connected for account {}", account_id_clone);
            }
        });

        Ok(())
    }
}
