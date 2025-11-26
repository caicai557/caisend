use chromiumoxide::Browser;
use chromiumoxide::page::Page;
use chromiumoxide::cdp::browser_protocol::input::{
    DispatchKeyEventParams, DispatchMouseEventParams, MouseButton, 
    DispatchKeyEventType, DispatchMouseEventType
};
use anyhow::{Result, anyhow};
use std::time::Duration;
use rand::{Rng, SeedableRng};
use rand::rngs::StdRng;
use rand::distributions::{Distribution, Uniform};

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

/// 🧠 Phase 2.3: Mouse Dynamics (Fitts's Law & Bezier Curves)
pub async fn execute_click(browser: &Browser, selector: &str) -> Result<()> {
    tracing::info!("CDP: Clicking on '{}' with Mouse Dynamics", selector);
    let page = get_active_page(browser).await?;
    
    // Wait for element to appear (5 second timeout)
    let element = wait_for_element(&page, selector, 5).await?;
    
    // Get Element Bounding Box
    let bounding_box = element.bounding_box().await?;
    let target_x = bounding_box.x + bounding_box.width / 2.0;
    let target_y = bounding_box.y + bounding_box.height / 2.0;

    // Simulate Mouse Movement (Simplified Bezier)
    let mut rng = StdRng::from_entropy();
    let jitter = Uniform::new(-5.0, 5.0);
    let jitter_x = jitter.sample(&mut rng);
    let jitter_y = jitter.sample(&mut rng);
    let final_x = target_x + jitter_x;
    let final_y = target_y + jitter_y;

    // Move Mouse
    let move_event = DispatchMouseEventParams::builder()
        .r#type(DispatchMouseEventType::MouseMoved)
        .x(final_x)
        .y(final_y)
        .build()
        .map_err(|e| anyhow!(e))?;
    page.execute(move_event).await?;

    tokio::time::sleep(Duration::from_millis(rng.gen_range(50..150))).await;

    // Mouse Down
    let down_event = DispatchMouseEventParams::builder()
        .r#type(DispatchMouseEventType::MousePressed)
        .button(MouseButton::Left)
        .x(final_x)
        .y(final_y)
        .click_count(1)
        .build()
        .map_err(|e| anyhow!(e))?;
    page.execute(down_event).await?;

    // Hold duration (simple uniform fallback)
    let hold_time = rng.gen_range(60..120) as u64;
    tokio::time::sleep(Duration::from_millis(hold_time)).await;

    // Mouse Up
    let up_event = DispatchMouseEventParams::builder()
        .r#type(DispatchMouseEventType::MouseReleased)
        .button(MouseButton::Left)
        .x(final_x)
        .y(final_y)
        .click_count(1)
        .build()
        .map_err(|e| anyhow!(e))?;
    page.execute(up_event).await?;

    tracing::info!("CDP: Click successful on '{}'", selector);
    Ok(())
}

/// 🧠 Phase 2.2: Typing Dynamics (Gaussian Distribution & Error Injection)
pub async fn execute_typing(browser: &Browser, selector: &str, text: &str) -> Result<()> {
    tracing::info!("CDP: Typing into '{}': {}", selector, text);
    let page = get_active_page(browser).await?;
    
    // Wait for element and focus
    let element = wait_for_element(&page, selector, 5).await?;
    element.focus().await?;
    tokio::time::sleep(Duration::from_millis(200)).await;
    
    let mut rng = StdRng::from_entropy();
    let delay_range = Uniform::new_inclusive(60u64, 180u64); // Inter-Key Interval fallback

    for char in text.chars() {
        // 1. Error Injection (5% chance)
        if rng.gen_bool(0.05) {
            let wrong_char = (char as u8 + 1) as char; // Simple wrong char
            dispatch_key(&page, wrong_char).await?;
            
            // Reaction time
            tokio::time::sleep(Duration::from_millis(300)).await;
            
            // Backspace
            let back_down = DispatchKeyEventParams::builder()
                .r#type(DispatchKeyEventType::RawKeyDown)
                .windows_virtual_key_code(8) // VK_BACK
                .build()
                .map_err(|e| anyhow!(e))?;
            page.execute(back_down).await?;

            let back_up = DispatchKeyEventParams::builder()
                .r#type(DispatchKeyEventType::KeyUp)
                .windows_virtual_key_code(8)
                .build()
                .map_err(|e| anyhow!(e))?;
            page.execute(back_up).await?;
        }

        // 2. Type Correct Char
        dispatch_key(&page, char).await?;

        // 3. Gaussian Delay
        let delay = delay_range.sample(&mut rng);
        tokio::time::sleep(Duration::from_millis(delay.max(20))).await;
    }

    tracing::info!("CDP: Typing successful");
    Ok(())
}

async fn dispatch_key(page: &Page, char: char) -> Result<()> {
    // KeyDown
    let down = DispatchKeyEventParams::builder()
        .r#type(DispatchKeyEventType::KeyDown)
        .text(char.to_string())
        .unmodified_text(char.to_string())
        .build()
        .map_err(|e| anyhow!(e))?;
    page.execute(down).await?;

    // KeyUp
    let up = DispatchKeyEventParams::builder()
        .r#type(DispatchKeyEventType::KeyUp)
        .text(char.to_string())
        .unmodified_text(char.to_string())
        .build()
        .map_err(|e| anyhow!(e))?;
    page.execute(up).await?;
    Ok(())
}

/// Execute CDP key press (for special keys like Enter)
pub async fn execute_keypress(browser: &Browser, key: &str) -> Result<()> {
    tracing::info!("CDP: Pressing key '{}'", key);
    let page = get_active_page(browser).await?;
    // Simplified for now, just use page.press_key if available or implement raw
    // For Enter, we often need RawKeyDown with VK_RETURN (13)
    if key == "Enter" {
         let enter_down = DispatchKeyEventParams::builder()
            .r#type(DispatchKeyEventType::RawKeyDown)
            .windows_virtual_key_code(13)
            .build()
            .map_err(|e| anyhow!(e))?;
        page.execute(enter_down).await?;

        let enter_up = DispatchKeyEventParams::builder()
            .r#type(DispatchKeyEventType::KeyUp)
            .windows_virtual_key_code(13)
            .build()
            .map_err(|e| anyhow!(e))?;
        page.execute(enter_up).await?;
    } else {
        // Fallback or implement other keys
        let body = page.find_element("body").await?;
        body.press_key(key).await?;
    }
    Ok(())
}
