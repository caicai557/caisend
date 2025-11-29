use anyhow::Result;
use reqwest::{Client, header};
use std::time::Duration;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum BrowserType {
    Chrome120,
    Chrome124,
    Chrome126,
    Firefox128,
    Safari17,
    Safari18,
}

impl Default for BrowserType {
    fn default() -> Self {
        BrowserType::Chrome126
    }
}

impl BrowserType {
    pub fn user_agent(&self) -> &'static str {
        match self {
            BrowserType::Chrome120 => "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            BrowserType::Chrome124 => "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            BrowserType::Chrome126 => "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
            BrowserType::Firefox128 => "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0",
            BrowserType::Safari17 => "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2.1 Safari/605.1.15",
            BrowserType::Safari18 => "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StealthConfig {
    pub browser_type: BrowserType,
    pub proxy: Option<String>,
    pub timeout_seconds: u64,
}

impl Default for StealthConfig {
    fn default() -> Self {
        Self {
            browser_type: BrowserType::default(),
            proxy: None,
            timeout_seconds: 30,
        }
    }
}

pub struct StealthClient {
    inner: Client,
    config: StealthConfig,
}

impl StealthClient {
    pub fn new(config: StealthConfig) -> Result<Self> {
        let mut headers = header::HeaderMap::new();
        headers.insert(header::USER_AGENT, header::HeaderValue::from_static(config.browser_type.user_agent()));
        headers.insert(header::ACCEPT_LANGUAGE, header::HeaderValue::from_static("en-US,en;q=0.9"));
        headers.insert(header::ACCEPT, header::HeaderValue::from_static("text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7"));
        
        let mut builder = Client::builder()
            .default_headers(headers)
            .timeout(Duration::from_secs(config.timeout_seconds));

        // Set proxy if configured
        if let Some(proxy_url) = &config.proxy {
            builder = builder.proxy(reqwest::Proxy::all(proxy_url)?);
        }

        let client = builder.build()?;

        Ok(Self {
            inner: client,
            config,
        })
    }

    pub async fn get(&self, url: &str) -> Result<reqwest::Response> {
        Ok(self.inner.get(url).send().await?)
    }

    pub async fn post(&self, url: &str, body: Option<String>) -> Result<reqwest::Response> {
        let mut req = self.inner.post(url);
        if let Some(b) = body {
            req = req.body(b);
        }
        Ok(req.send().await?)
    }
    
    pub fn config(&self) -> &StealthConfig {
        &self.config
    }
}
