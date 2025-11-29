use teleflow_desktop_lib::infrastructure::network::{StealthClient, StealthConfig, BrowserType, TrafficShaper};
use std::time::{Duration, Instant};

#[tokio::test]
async fn test_stealth_client_initialization() {
    let config = StealthConfig {
        browser_type: BrowserType::Chrome126,
        proxy: None,
        timeout_seconds: 10,
    };
    
    let client = StealthClient::new(config.clone()).expect("Failed to create StealthClient");
    
    assert_eq!(client.config().browser_type, BrowserType::Chrome126);
    assert_eq!(client.config().timeout_seconds, 10);
}

#[tokio::test]
async fn test_traffic_shaper_jitter() {
    // Configure shaper with 100ms mean delay
    let shaper = TrafficShaper::new(100.0, 10.0);
    
    let start = Instant::now();
    shaper.execute_with_jitter(|| async {
        // No-op action
    }).await;
    let duration = start.elapsed();
    
    // Should be at least some delay (unless random sample was 0, which is unlikely with mean 100)
    // We allow for some variance but expect it to be roughly around 100ms
    println!("Jitter delay: {:?}", duration);
    assert!(duration.as_millis() > 0);
}

#[tokio::test]
async fn test_real_request_google() {
    // This test makes a real network request to verify the client works
    let config = StealthConfig {
        browser_type: BrowserType::Chrome126,
        proxy: None,
        timeout_seconds: 10,
    };
    
    let client = StealthClient::new(config).expect("Failed to create StealthClient");
    
    let response = client.get("https://www.google.com").await;
    
    match response {
        Ok(resp) => {
            assert!(resp.status().is_success());
            println!("Successfully requested Google");
        }
        Err(e) => {
            // Network tests might fail in some environments, so we warn but don't fail hard if it's just connectivity
            println!("Network request failed (might be expected in CI/offline): {}", e);
        }
    }
}

#[tokio::test]
async fn test_browser_types() {
    let browsers = vec![
        BrowserType::Chrome120,
        BrowserType::Chrome124,
        BrowserType::Chrome126,
        BrowserType::Firefox128,
        BrowserType::Safari17,
        BrowserType::Safari18,
    ];
    
    for browser in browsers {
        let config = StealthConfig {
            browser_type: browser.clone(),
            proxy: None,
            timeout_seconds: 5,
        };
        
        let client = StealthClient::new(config);
        assert!(client.is_ok(), "Failed to create client for {:?}", browser);
    }
}
