use crate::adapters::browser::cdp_adapter::CdpManager;
use crate::error::CoreError;
use tauri::Manager;
use tokio::time::{sleep, Duration};

/// 打开 Telegram Web 并检查登录状态
#[tauri::command]
pub async fn telegram_open_login(
    account_id: String,
    app_handle: tauri::AppHandle,
) -> Result<String, CoreError> {
    tracing::info!("[TelegramLogin] Opening Telegram Web for account: {}", account_id);
    
    // 1. 尝试获取 CdpManager 状态
    let cdp_manager_opt = app_handle.try_state::<CdpManager>();
    
    if let Some(cdp_manager) = cdp_manager_opt {
        const CDP_PORT: u16 = 9222;
        match cdp_manager.connect(account_id.clone(), CDP_PORT).await {
            Ok(_) => {
                // CDP 连接成功，继续自动化流程
                let browser = cdp_manager.get_browser(&account_id).await
                    .ok_or_else(|| CoreError::SystemError("No browser instance found".into()))?;
                
                let pages = browser.pages().await
                    .map_err(|e| CoreError::SystemError(format!("Failed to get pages: {}", e)))?;
                
                let page = if let Some(p) = pages.into_iter().next() {
                    p
                } else {
                    browser.new_page("about:blank").await
                        .map_err(|e| CoreError::SystemError(format!("Failed to create page: {}", e)))?
                };
                
                tracing::info!("[TelegramLogin] Navigating to Telegram Web via CDP");
                page.goto("https://web.telegram.org/k/").await
                    .map_err(|e| CoreError::SystemError(format!("Failed to navigate: {}", e)))?;
                
                sleep(Duration::from_secs(3)).await;
                
                let chat_list_selectors = vec![
                    "#column-center",      // 主聊天区域
                    ".chatlist",           // 聊天列表
                    ".chat-list",          // 备选聊天列表
                ];
                
                for selector in chat_list_selectors {
                    match page.find_element(selector).await {
                        Ok(_) => {
                            tracing::info!("[TelegramLogin] User is already logged in (found: {})", selector);
                            return Ok("logged_in".to_string());
                        }
                        Err(_) => continue,
                    }
                }
                
                // 检查是否在登录页面（需要输入手机号）
                let login_selectors = vec![
                    "input[type='tel']",           // 手机号输入
                    "input.input-field-phone",     // Telegram 特定的手机输入框
                ];
                
                for selector in login_selectors {
                    match page.find_element(selector).await {
                        Ok(_) => {
                            tracing::info!("[TelegramLogin] On login page (found: {})", selector);
                            return Ok("need_phone".to_string());
                        }
                        Err(_) => continue,
                    }
                }
                
                // 检查是否需要验证码
                if page.find_element("input[type='text']").await.is_ok() {
                    return Ok("need_code".to_string());
                }
                
                // 未知状态
                Ok("unknown".to_string())
            }
            Err(e) => {
                tracing::error!("[TelegramLogin] Failed to connect CDP: {}", e);
                Err(CoreError::SystemError(format!("CDP connection failed: {}", e)))
            }
        }
    } else {
        Err(CoreError::SystemError("CdpManager not initialized".into()))
    }
}

/// 自动输入手机号并提交
#[tauri::command]
pub async fn telegram_input_phone(
    account_id: String,
    phone: String,
    app_handle: tauri::AppHandle,
) -> Result<(), CoreError> {
    tracing::info!("[TelegramLogin] Inputting phone number for account: {}", account_id);
    
    let cdp_manager = app_handle.try_state::<CdpManager>()
        .ok_or_else(|| CoreError::SystemError("CdpManager state not found".into()))?;
    
    let browser = cdp_manager
        .get_browser(&account_id)
        .await
        .ok_or_else(|| CoreError::SystemError("No browser instance".into()))?;
    
    let pages = browser
        .pages()
        .await
        .map_err(|e| CoreError::SystemError(format!("Failed to get pages: {}", e)))?;
    
    let page = pages
        .into_iter()
        .next()
        .ok_or_else(|| CoreError::SystemError("No page found".into()))?;
    
    // 1. 找到手机号输入框
    let phone_input = page
        .find_element("input[type='tel']")
        .await
        .map_err(|e| CoreError::SystemError(format!("Phone input not found: {}", e)))?;
    
    // 2. 清空并输入手机号
    phone_input
        .click()
        .await
        .map_err(|e| CoreError::SystemError(format!("Failed to click input: {}", e)))?;
    
    sleep(Duration::from_millis(300)).await;
    
    phone_input
        .type_str(&phone)
        .await
        .map_err(|e| CoreError::SystemError(format!("Failed to type phone: {}", e)))?;
    
    tracing::info!("[TelegramLogin] Phone number entered: {}", phone);
    
    // 3. 查找并点击"Next"按钮
    sleep(Duration::from_millis(500)).await;
    
    let next_button_selectors = vec![
        "button.btn-primary",
        "button[type='submit']",
        "button.rp",
    ];
    
    for selector in next_button_selectors {
        if let Ok(btn) = page.find_element(selector).await {
            btn.click()
                .await
                .map_err(|e| CoreError::SystemError(format!("Failed to click next: {}", e)))?;
            
            tracing::info!("[TelegramLogin] Clicked next button: {}", selector);
            return Ok(());
        }
    }
    
    Err(CoreError::SystemError("Next button not found".into()))
}

/// 检查验证码输入状态
#[tauri::command]
pub async fn telegram_check_code_status(
    account_id: String,
    app_handle: tauri::AppHandle,
) -> Result<String, CoreError> {
    let cdp_manager = app_handle.try_state::<CdpManager>()
        .ok_or_else(|| CoreError::SystemError("CdpManager state not found".into()))?;

    let browser = cdp_manager
        .get_browser(&account_id)
        .await
        .ok_or_else(|| CoreError::SystemError("No browser instance".into()))?;
    
    let pages = browser
        .pages()
        .await
        .map_err(|e| CoreError::SystemError(format!("Failed to get pages: {}", e)))?;
    
    let page = pages
        .into_iter()
        .next()
        .ok_or_else(|| CoreError::SystemError("No page found".into()))?;
    
    // 检查是否已经登录成功
    let status = check_login_status(&page).await?;
    Ok(status)
}

async fn check_login_status(page: &chromiumoxide::Page) -> Result<String, CoreError> {
    // Simple check logic
    if page.find_element("#column-center").await.is_ok() {
        return Ok("logged_in".to_string());
    }
    if page.find_element("input[type='tel']").await.is_ok() {
        return Ok("need_phone".to_string());
    }
    if page.find_element("input[type='text']").await.is_ok() {
        return Ok("need_code".to_string());
    }
    Ok("unknown".to_string())
}
