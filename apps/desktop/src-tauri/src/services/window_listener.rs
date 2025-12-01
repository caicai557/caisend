use windows::Win32::Foundation::HWND;
use windows::Win32::UI::WindowsAndMessaging::{FindWindowW, GetWindowTextW};
use windows::core::PCWSTR;
use std::sync::Arc;
use tokio::sync::RwLock;
use regex::Regex;
use tracing::{info, warn, debug};

/// Telegram 窗口监听服务
/// 
/// 负责监听 Telegram Desktop 窗口标题,解析当前会话信息
pub struct TelegramWindowListener {
    /// 轮询间隔 (毫秒)
    poll_interval_ms: u64,
    
    /// 当前活跃的会话信息
    current_session: Arc<RwLock<Option<SessionInfo>>>,
    
    /// 窗口标题解析正则
    title_regex: Regex,
}

/// 会话信息
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SessionInfo {
    /// Telegram 账号 handle (可选)
    pub account_handle: Option<String>,
    
    /// 聊天名称/ID
    pub chat_name: String,
    
    /// 原始窗口标题
    pub raw_title: String,
}

impl TelegramWindowListener {
    pub fn new(poll_interval_ms: u64) -> Self {
        // 正则模式: 匹配 "聊天名称 - Telegram (@account)" 或 "聊天名称 - Telegram"
        let title_regex = Regex::new(r"^(.+?)\s*-\s*Telegram(?:\s*\(@([^)]+)\))?$")
            .expect("Invalid regex pattern");
        
        Self {
            poll_interval_ms,
            current_session: Arc::new(RwLock::new(None)),
            title_regex,
        }
    }
    
    /// 获取当前活跃的会话信息
    pub async fn get_current_session(&self) -> Option<SessionInfo> {
        self.current_session.read().await.clone()
    }
    
    /// 启动监听循环
    pub async fn start_polling(&self) -> Result<(), Box<dyn std::error::Error>> {
        info!("[TelegramWindowListener] Starting window polling (interval: {}ms)", self.poll_interval_ms);
        
        let current_session = self.current_session.clone();
        let poll_interval = self.poll_interval_ms;
        let title_regex = self.title_regex.clone();
        
        tokio::spawn(async move {
            let mut interval = tokio::time::interval(
                tokio::time::Duration::from_millis(poll_interval)
            );
            
            loop {
                interval.tick().await;
                
                // 获取 Telegram 窗口标题
                if let Some(title) = Self::get_telegram_window_title() {
                    debug!("[TelegramWindowListener] Window title: {}", title);
                    
                    // 解析会话信息
                    if let Some(session) = Self::parse_title(&title, &title_regex) {
                        let mut current = current_session.write().await;
                        
                        // 检测会话切换
                        if current.as_ref() != Some(&session) {
                            info!(
                                "[TelegramWindowListener] Session switched: {:?} -> {:?}",
                                current.as_ref().map(|s| &s.chat_name),
                                session.chat_name
                            );
                            
                            *current = Some(session);
                        }
                    }
                } else {
                    // 窗口未找到,清空当前会话
                    let mut current = current_session.write().await;
                    if current.is_some() {
                        warn!("[TelegramWindowListener] Telegram window not found, clearing session");
                        *current = None;
                    }
                }
            }
        });
        
        Ok(())
    }
    
    /// 获取 Telegram Desktop 窗口标题 (Windows API)
    fn get_telegram_window_title() -> Option<String> {
        unsafe {
            // Telegram Desktop 的窗口类名
            let class_name = windows::core::w!("Qt5152QWindowIcon");
            
            // 查找窗口
            let hwnd = FindWindowW(PCWSTR(class_name.as_ptr()), PCWSTR::null());
            
            if hwnd.0 == 0 {
                return None;
            }
            
            // 获取窗口标题
            let mut buffer = [0u16; 512];
            let len = GetWindowTextW(hwnd, &mut buffer);
            
            if len == 0 {
                return None;
            }
            
            // 转换为 Rust String
            String::from_utf16(&buffer[..len as usize]).ok()
        }
    }
    
    /// 解析窗口标题
    /// 
    /// 示例:
    /// - "Alice - Telegram" -> SessionInfo { account_handle: None, chat_name: "Alice" }
    /// - "Bob - Telegram (@account1)" -> SessionInfo { account_handle: Some("account1"), chat_name: "Bob" }
    fn parse_title(title: &str, regex: &Regex) -> Option<SessionInfo> {
        regex.captures(title).map(|caps| {
            let chat_name = caps.get(1).unwrap().as_str().trim().to_string();
            let account_handle = caps.get(2).map(|m| m.as_str().to_string());
            
            SessionInfo {
                account_handle,
                chat_name,
                raw_title: title.to_string(),
            }
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_parse_title_basic() {
        let regex = Regex::new(r"^(.+?)\s*-\s*Telegram(?:\s*\(@([^)]+)\))?$").unwrap();
        
        let session = TelegramWindowListener::parse_title("Alice - Telegram", &regex).unwrap();
        assert_eq!(session.chat_name, "Alice");
        assert_eq!(session.account_handle, None);
    }
    
    #[test]
    fn test_parse_title_with_account() {
        let regex = Regex::new(r"^(.+?)\s*-\s*Telegram(?:\s*\(@([^)]+)\))?$").unwrap();
        
        let session = TelegramWindowListener::parse_title(
            "Bob - Telegram (@account1)", 
            &regex
        ).unwrap();
        assert_eq!(session.chat_name, "Bob");
        assert_eq!(session.account_handle, Some("account1".to_string()));
    }
    
    #[test]
    fn test_parse_title_invalid() {
        let regex = Regex::new(r"^(.+?)\s*-\s*Telegram(?:\s*\(@([^)]+)\))?$").unwrap();
        
        let session = TelegramWindowListener::parse_title("Invalid Title", &regex);
        assert!(session.is_none());
    }
}
