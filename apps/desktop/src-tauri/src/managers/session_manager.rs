use tauri::{AppHandle, Manager, WebviewWindowBuilder, WebviewUrl};
use std::path::PathBuf;
use crate::domain::models::Account;
use crate::error::CoreError;

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
            window.set_focus().map_err(|e| CoreError::SystemError(e.to_string()))?;
            return Ok(());
        }

        let app_data_dir = self.app_handle.path().app_data_dir().map_err(|e| CoreError::SystemError(e.to_string()))?;
        let session_dir = app_data_dir.join("sessions").join(&account.id);

        // Ensure session directory exists
        if !session_dir.exists() {
            std::fs::create_dir_all(&session_dir).map_err(|e| CoreError::SystemError(e.to_string()))?;
        }

        let url = WebviewUrl::External(
            tauri::Url::parse("https://web.telegram.org/z/").map_err(|e| CoreError::SystemError(e.to_string()))?
        );

        let mut builder = WebviewWindowBuilder::new(
            &self.app_handle,
            &window_label,
            url
        )
        .title(format!("Teleflow - {}", account.name))
        .inner_size(1024.0, 768.0)
        .data_directory(session_dir); // CRITICAL: Data Partitioning

        // Inject MVP Observer Script (MVP-T3)
        builder = builder.initialization_script(include_str!("../../js/mvp_observer.js"));

        builder.build().map_err(|e| CoreError::SystemError(e.to_string()))?;

        Ok(())
    }
}
