use anyhow::{Context, Result};
use chromiumoxide::Browser;
use futures::StreamExt;
use serde::Deserialize;
use std::collections::HashMap;
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::RwLock;
use tokio::time::sleep;

pub const DEFAULT_WEBVIEW2_CDP_PORT: u16 = 9222;

/// Manages CDP Browser connections for each account
#[derive(Clone)]
pub struct CdpManager {
    browsers: Arc<RwLock<HashMap<String, Arc<Browser>>>>,
}

impl CdpManager {
    pub fn new() -> Self {
        Self {
            browsers: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    /// Resolve the WebView2 DevTools websocket endpoint from the exposed HTTP version endpoint.
    async fn resolve_websocket_url(port: u16) -> Result<String> {
        #[derive(Deserialize)]
        struct VersionResponse {
            #[serde(rename = "webSocketDebuggerUrl")]
            web_socket_debugger_url: Option<String>,
        }

        let client = reqwest::Client::builder()
            .timeout(Duration::from_secs(3))
            .build()
            .context("Failed to build HTTP client for DevTools discovery")?;

        let version_url = format!("http://127.0.0.1:{port}/json/version");
        let resp = client
            .get(&version_url)
            .send()
            .await
            .with_context(|| format!("Failed to query DevTools version endpoint at {}", version_url))?
            .error_for_status()
            .with_context(|| format!("DevTools version endpoint {} returned non-success", version_url))?;

        let status = resp.status();
        let payload: VersionResponse = resp
            .json()
            .await
            .with_context(|| format!("Failed to parse DevTools response (status {})", status))?;

        payload
            .web_socket_debugger_url
            .with_context(|| format!("DevTools endpoint at {} missing webSocketDebuggerUrl", version_url))
    }

    /// Connect to a WebView2 instance via CDP, resolving the websocket endpoint and spawning the handler loop.
    pub async fn connect(&self, account_id: String, port: u16) -> Result<()> {
        {
            let browsers = self.browsers.read().await;
            if browsers.contains_key(&account_id) {
                tracing::info!("CDP connection already exists for {}", account_id);
                return Ok(());
            }
        }

        const MAX_ATTEMPTS: u8 = 3;
        let mut last_err: Option<anyhow::Error> = None;
        let ws_url = {
            let mut resolved = None;
            for attempt in 1..=MAX_ATTEMPTS {
                match Self::resolve_websocket_url(port).await {
                    Ok(url) => {
                        resolved = Some(url);
                        break;
                    }
                    Err(err) => {
                        last_err = Some(err);
                        let backoff = Duration::from_millis(200 * attempt as u64);
                        tracing::warn!(
                            "Attempt {}/{} to resolve DevTools websocket failed: {:?}. Retrying in {:?}",
                            attempt,
                            MAX_ATTEMPTS,
                            last_err.as_ref().unwrap(),
                            backoff
                        );
                        sleep(backoff).await;
                    }
                }
            }
            resolved.ok_or_else(|| last_err.unwrap_or_else(|| anyhow::anyhow!("Unable to resolve DevTools websocket URL")) )?
        };

        tracing::info!(
            "Attempting CDP connection to {} for account {}",
            ws_url,
            account_id
        );

        // Connect to WebSocket
        let (browser, mut handler) = Browser::connect(ws_url.clone())
            .await
            .with_context(|| format!("Failed to connect to DevTools websocket {}", ws_url))?;
        let browser = Arc::new(browser);

        // Spawn handler event loop (required to keep connection alive)
        let account_clone = account_id.clone();
        let browser_map = self.browsers.clone();
        tokio::spawn(async move {
            while let Some(h) = handler.next().await {
                if let Err(e) = h {
                    tracing::error!("CDP Handler error for {}: {:?}", account_clone, e);
                    break;
                }
            }
            tracing::info!("CDP Handler finished for {}", account_clone);
            browser_map.write().await.remove(&account_clone);
        });

        // Store browser instance
        self.browsers
            .write()
            .await
            .insert(account_id.clone(), browser);
        tracing::info!("CDP connection established for {}", account_id);
        Ok(())
    }

    /// Get browser instance for an account
    pub async fn get_browser(&self, account_id: &str) -> Option<Arc<Browser>> {
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
