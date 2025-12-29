//! Stealth Middleware - Anti-detection measures
//!
//! Implements CDP overrides to mask automation signals.

use serde_json::json;

/// Stealth configuration
#[derive(Debug, Clone)]
pub struct StealthConfig {
    /// User agent string
    pub user_agent: String,
    /// Viewport width
    pub viewport_width: u32,
    /// Viewport height
    pub viewport_height: u32,
    /// Language
    pub language: String,
    /// Platform
    pub platform: String,
}

impl Default for StealthConfig {
    fn default() -> Self {
        Self {
            user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36".to_string(),
            viewport_width: 1920,
            viewport_height: 1080,
            language: "en-US".to_string(),
            platform: "Win32".to_string(),
        }
    }
}

/// Generate the stealth injection script
/// 
/// This script is injected via `Page.addScriptToEvaluateOnNewDocument`
/// to override navigator properties before any page scripts run.
pub fn generate_stealth_script(config: &StealthConfig) -> String {
    format!(r#"
// Teleflow Stealth Injection v1.0

// Override webdriver property
Object.defineProperty(navigator, 'webdriver', {{
    get: () => undefined,
    configurable: true
}});

// Override languages
Object.defineProperty(navigator, 'languages', {{
    get: () => ['{lang}', 'en'],
    configurable: true
}});

// Override plugins (CDP leaves this empty)
Object.defineProperty(navigator, 'plugins', {{
    get: () => {{
        const plugins = [
            {{ name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer' }},
            {{ name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai' }},
            {{ name: 'Native Client', filename: 'internal-nacl-plugin' }}
        ];
        plugins.length = 3;
        return plugins;
    }},
    configurable: true
}});

// Override platform
Object.defineProperty(navigator, 'platform', {{
    get: () => '{platform}',
    configurable: true
}});

// Override permissions query
const originalQuery = window.navigator.permissions.query;
window.navigator.permissions.query = (parameters) => (
    parameters.name === 'notifications' ?
        Promise.resolve({{ state: Notification.permission }}) :
        originalQuery(parameters)
);

// Override chrome runtime (headless detection)
window.chrome = {{
    runtime: {{}},
    loadTimes: function() {{}},
    csi: function() {{}}
}};

// Fix iframe detection
Object.defineProperty(HTMLIFrameElement.prototype, 'contentWindow', {{
    get: function() {{
        return window;
    }}
}});

console.log('[TF Stealth] Anti-detection measures applied');
"#, 
        lang = config.language,
        platform = config.platform
    )
}

/// CDP commands to set up stealth mode
pub struct StealthCommands;

impl StealthCommands {
    /// Generate the User-Agent override command
    pub fn user_agent_override(config: &StealthConfig) -> serde_json::Value {
        json!({
            "userAgent": config.user_agent,
            "platform": config.platform,
            "acceptLanguage": format!("{},en;q=0.9", config.language)
        })
    }

    /// Generate viewport emulation command
    pub fn viewport_emulation(config: &StealthConfig) -> serde_json::Value {
        json!({
            "width": config.viewport_width,
            "height": config.viewport_height,
            "deviceScaleFactor": 1,
            "mobile": false
        })
    }

    /// Chrome flags for stealth launch
    pub fn stealth_browser_args() -> Vec<String> {
        vec![
            "--disable-blink-features=AutomationControlled".to_string(),
            "--disable-infobars".to_string(),
            "--no-first-run".to_string(),
            "--no-default-browser-check".to_string(),
            "--disable-background-timer-throttling".to_string(),
            "--disable-backgrounding-occluded-windows".to_string(),
            "--disable-renderer-backgrounding".to_string(),
            "--disable-features=TranslateUI".to_string(),
            "--disable-ipc-flooding-protection".to_string(),
        ]
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_stealth_script_generation() {
        let config = StealthConfig::default();
        let script = generate_stealth_script(&config);
        
        // Should contain key overrides
        assert!(script.contains("webdriver"));
        assert!(script.contains("navigator"));
        assert!(script.contains("plugins"));
        assert!(script.contains(config.platform.as_str()));
        
        println!("✅ Stealth script generation test passed");
    }

    #[test]
    fn test_browser_args() {
        let args = StealthCommands::stealth_browser_args();
        
        assert!(args.contains(&"--disable-blink-features=AutomationControlled".to_string()));
        assert!(args.len() >= 5);
        
        println!("✅ Browser args test passed ({} args)", args.len());
    }
}
