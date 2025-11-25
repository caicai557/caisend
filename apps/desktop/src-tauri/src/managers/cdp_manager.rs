use chromiumoxide::{Browser, BrowserConfig};
use futures::StreamExt;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use anyhow::Result;

/// Manages CDP Browser connections for each account
pub struct CdpManager {
    browsers: Arc<RwLock<HashMap<String, Browser>>>,
}

impl CdpManager {
    pub fn new() -> Self {
        Self {
            browsers: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    /// Connect to a WebView2 instance via CDP
    pub async fn connect(&self, account_id: String, port: u16) -> Result<()> {
        let ws_url = format!("ws://127.0.0.1:{}", port);
        tracing::info!("Attempting CDP connection to {} for account {}", ws_url, account_id);

        // Configure connection (minimal config for connecting to existing instance)
        let config = BrowserConfig::builder()
            .build()
            .map_err(|e| anyhow::anyhow!("Failed to build browser config: {:?}", e))?;

        // Connect to WebSocket
        let (browser, mut handler) = Browser::connect_with_config(&ws_url, config).await?;

        // Spawn handler event loop (required to keep connection alive)
        let account_clone = account_id.clone();
        tokio::spawn(async move {
            while let Some(h) = handler.next().await {
                if let Err(e) = h {
                    tracing::error!("CDP Handler error for {}: {:?}", account_clone, e);
                    break;
                }
            }
            tracing::info!("CDP Handler finished for {}", account_clone);
        });

        // Store browser instance
        self.browsers.write().await.insert(account_id.clone(), browser);
        tracing::info!("CDP connection established for {}", account_id);
        Ok(())
    }

    /// Get browser instance for an account
    pub async fn get_browser(&self, account_id: &str) -> Option<Browser> {
        self.browsers.read().await.get(account_id).cloned()
    }

    /// Disconnect and remove browser instance
    pub async fn disconnect(&self, account_id: &str) {
        if let Some(_browser) = self.browsers.write().await.remove(account_id) {
            tracing::info!("CDP connection removed for {}", account_id);
        }
    }
}

impl Default for CdpManager {
    fn default() -> Self {
        Self::new()
    }
}
