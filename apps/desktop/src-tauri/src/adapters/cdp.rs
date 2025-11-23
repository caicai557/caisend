use chromiumoxide::{Browser, BrowserConfig};
use futures::StreamExt;
use std::path::PathBuf;
use tauri::AppHandle;
use tauri::Manager;
use tauri::Emitter;
use anyhow::Result;

pub struct CdpClient {
    pub browser: Browser,
    pub app_handle: AppHandle,
}

impl CdpClient {
    pub async fn launch_browser(app_handle: &AppHandle, account_id: &str) -> Result<Self> {
        let app_dir = app_handle.path().app_data_dir().expect("failed to get app data dir");
        let session_dir = app_dir.join("sessions").join(account_id);

        if !session_dir.exists() {
            std::fs::create_dir_all(&session_dir)?;
        }

        let config = BrowserConfig::builder()
            .user_data_dir(session_dir)
            .with_head()
            .build()
            .map_err(|e| anyhow::anyhow!("Failed to build browser config: {}", e))?;

        let (browser, mut handler) = Browser::launch(config).await?;

        let handle = app_handle.clone();
        tauri::async_runtime::spawn(async move {
            while let Some(h) = handler.next().await {
                if h.is_err() {
                    log::error!("Browser handler error: {:?}", h);
                    break;
                }
            }
        });

        // Inject JS and setup bindings
        let pages = browser.pages().await.map_err(|e| anyhow::anyhow!("Failed to get pages: {}", e))?;
        if let Some(page) = pages.first() {
            let script = include_str!("../assets/telegram_observer.js");
            // We use evaluate to inject the script. 
            // In a real scenario, we might want to use Page.addScriptToEvaluateOnNewDocument
            // to ensure it runs on every navigation.
            if let Err(e) = page.evaluate(script).await {
                log::error!("Failed to inject script: {}", e);
            }
        }

        Ok(Self { 
            browser,
            app_handle: app_handle.clone(),
        })
    }

    pub async fn start_qr_monitoring(&self) -> Result<()> {
        let pages = self.browser.pages().await.map_err(|e| anyhow::anyhow!("Failed to get pages: {}", e))?;
        if let Some(page) = pages.first() {
            let page = page.clone();
            let handle = self.app_handle.clone();
            
            tauri::async_runtime::spawn(async move {
                loop {
                    // Simple polling for QR code (canvas)
                    match page.find_element("canvas").await {
                        Ok(_) => {
                            if let Err(e) = handle.emit("qr-update", "QR code detected") {
                                log::error!("Failed to emit qr-update: {}", e);
                            }
                        },
                        Err(_) => {
                            // No canvas found
                        }
                    }
                    tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;
                }
            });
        }
        Ok(())
    }
}
