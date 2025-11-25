use chromiumoxide::Browser;
use chromiumoxide::page::Page;
use anyhow::Result;
use std::time::Duration;

/// Get the active page from the browser instance
async fn get_active_page(browser: &Browser) -> Result<Page> {
    let pages = browser.pages().await?;
    pages
        .first()
        .cloned()
        .ok_or_else(|| anyhow::anyhow!("No active page found"))
}

/// Wait for a selector with retry logic (simulates wait_for_selector)
async fn wait_for_element(page: &Page, selector: &str, timeout_secs: u64) -> Result<chromiumoxide::element::Element> {
    let max_attempts = (timeout_secs * 10) as usize; // Check every 100ms
    let mut attempts = 0;

    loop {
        match page.find_element(selector).await {
            Ok(element) => return Ok(element),
            Err(_) if attempts < max_attempts => {
                attempts += 1;
                tokio::time::sleep(Duration::from_millis(100)).await;
            }
            Err(e) => {
                return Err(anyhow::anyhow!(
                    "Element '{}' not found after {}s: {:?}",
                    selector,
                    timeout_secs,
                    e
                ))
            }
        }
    }
}

/// Execute CDP click on a selector
pub async fn execute_click(browser: &Browser, selector: &str) -> Result<()> {
    tracing::info!("CDP: Clicking on '{}'", selector);
    let page = get_active_page(browser).await?;
    
    // Wait for element to appear (5 second timeout)
    let element = wait_for_element(&page, selector, 5).await?;
    
    // Scroll into view to ensure clickability
    element.scroll_into_view().await?;
    tokio::time::sleep(Duration::from_millis(100)).await;
    
    // Execute click
    element.click().await?;
    tracing::info!("CDP: Click successful on '{}'", selector);
    Ok(())
}

/// Execute CDP typing on a selector
pub async fn execute_typing(browser: &Browser, selector: &str, text: &str) -> Result<()> {
    tracing::info!("CDP: Typing into '{}': {}", selector, text);
    let page = get_active_page(browser).await?;
    
    // Wait for element
    let element = wait_for_element(&page, selector, 5).await?;
    
    // Focus the element
    element.focus().await?;
    tokio::time::sleep(Duration::from_millis(100)).await;
    
    // Type text using element helper (generates trusted input events)
    element.type_str(text).await?;
    tracing::info!("CDP: Typing successful");
    Ok(())
}

/// Execute CDP key press (for special keys like Enter)
pub async fn execute_keypress(browser: &Browser, key: &str) -> Result<()> {
    tracing::info!("CDP: Pressing key '{}'", key);
    let page = get_active_page(browser).await?;
    let body = page
        .find_element("body")
        .await
        .map_err(|e| anyhow::anyhow!("Failed to focus body for keypress: {:?}", e))?;
    body.press_key(key).await?;
    Ok(())
}
