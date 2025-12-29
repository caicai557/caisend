//! Hot-swappable Definitions Loader
//!
//! Loads selector and Fiber path definitions from a JSON file.
//! Can be updated without recompiling the binary.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::Path;
use tracing::{info, warn};

/// Selector definitions for DOM elements
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SelectorDef {
    /// Primary CSS selector
    pub primary: String,
    /// Fallback selectors
    #[serde(default)]
    pub fallbacks: Vec<String>,
    /// Description for debugging
    #[serde(default)]
    pub description: String,
}

/// Fiber path definitions for React component traversal
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FiberPathDef {
    /// Component name to look for
    pub component_name: String,
    /// Property paths to extract
    pub prop_paths: Vec<String>,
    /// Description
    #[serde(default)]
    pub description: String,
}

/// Complete definition set
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DefinitionSet {
    /// Version of the definition set
    pub version: String,
    /// Last updated timestamp
    pub updated_at: String,
    /// DOM selectors
    pub selectors: HashMap<String, SelectorDef>,
    /// Fiber paths
    pub fiber_paths: HashMap<String, FiberPathDef>,
}

impl Default for DefinitionSet {
    fn default() -> Self {
        let mut selectors = HashMap::new();
        let mut fiber_paths = HashMap::new();

        // Default selectors for Telegram Web A/K
        selectors.insert(
            "chat_list".to_string(),
            SelectorDef {
                primary: "#chat-folders + div".to_string(),
                fallbacks: vec![".chat-list".to_string()],
                description: "Chat list container".to_string(),
            },
        );
        selectors.insert(
            "message_input".to_string(),
            SelectorDef {
                primary: ".composer-wrapper .input-message".to_string(),
                fallbacks: vec!["[contenteditable='true']".to_string()],
                description: "Message input field".to_string(),
            },
        );
        selectors.insert(
            "message_bubble".to_string(),
            SelectorDef {
                primary: ".message".to_string(),
                fallbacks: vec![".Message".to_string()],
                description: "Individual message bubble".to_string(),
            },
        );

        // Default Fiber paths
        fiber_paths.insert(
            "message_content".to_string(),
            FiberPathDef {
                component_name: "Message".to_string(),
                prop_paths: vec![
                    "memoizedProps.message.content".to_string(),
                    "memoizedProps.message.id".to_string(),
                ],
                description: "Message content from React state".to_string(),
            },
        );
        fiber_paths.insert(
            "chat_info".to_string(),
            FiberPathDef {
                component_name: "Chat".to_string(),
                prop_paths: vec![
                    "memoizedProps.chat.id".to_string(),
                    "memoizedProps.chat.title".to_string(),
                ],
                description: "Chat info from React state".to_string(),
            },
        );

        Self {
            version: "1.0.0".to_string(),
            updated_at: chrono::Utc::now().to_rfc3339(),
            selectors,
            fiber_paths,
        }
    }
}

/// Definition loader with hot-reload capability
pub struct DefinitionLoader {
    definitions: DefinitionSet,
    file_path: Option<String>,
}

impl DefinitionLoader {
    /// Create a new loader with default definitions
    pub fn new() -> Self {
        Self {
            definitions: DefinitionSet::default(),
            file_path: None,
        }
    }

    /// Load definitions from a file
    pub fn load_from_file(path: &str) -> Result<Self, std::io::Error> {
        let content = fs::read_to_string(path)?;
        let definitions: DefinitionSet = serde_json::from_str(&content)
            .map_err(|e| std::io::Error::new(std::io::ErrorKind::InvalidData, e))?;
        
        info!("📖 Loaded definitions v{} from {}", definitions.version, path);
        
        Ok(Self {
            definitions,
            file_path: Some(path.to_string()),
        })
    }

    /// Reload definitions from the original file
    pub fn reload(&mut self) -> Result<(), std::io::Error> {
        if let Some(ref path) = self.file_path {
            let content = fs::read_to_string(path)?;
            self.definitions = serde_json::from_str(&content)
                .map_err(|e| std::io::Error::new(std::io::ErrorKind::InvalidData, e))?;
            
            info!("🔄 Reloaded definitions v{}", self.definitions.version);
        } else {
            warn!("⚠️ No file path set, cannot reload");
        }
        Ok(())
    }

    /// Save current definitions to a file (for initial setup)
    pub fn save_to_file(&self, path: &str) -> Result<(), std::io::Error> {
        let content = serde_json::to_string_pretty(&self.definitions)
            .map_err(|e| std::io::Error::new(std::io::ErrorKind::InvalidData, e))?;
        
        if let Some(parent) = Path::new(path).parent() {
            fs::create_dir_all(parent)?;
        }
        
        fs::write(path, content)?;
        info!("💾 Saved definitions to {}", path);
        Ok(())
    }

    /// Get a selector by name
    pub fn get_selector(&self, name: &str) -> Option<&SelectorDef> {
        self.definitions.selectors.get(name)
    }

    /// Get a Fiber path by name
    pub fn get_fiber_path(&self, name: &str) -> Option<&FiberPathDef> {
        self.definitions.fiber_paths.get(name)
    }

    /// Get the current definitions
    pub fn definitions(&self) -> &DefinitionSet {
        &self.definitions
    }
}

impl Default for DefinitionLoader {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_definitions() {
        let loader = DefinitionLoader::new();
        
        // Should have chat_list selector
        let chat_list = loader.get_selector("chat_list");
        assert!(chat_list.is_some());
        
        // Should have message_content fiber path
        let msg_content = loader.get_fiber_path("message_content");
        assert!(msg_content.is_some());
    }

    #[test]
    fn test_save_and_load() {
        let loader = DefinitionLoader::new();
        let temp_path = "/tmp/teleflow_test_definitions.json";
        
        // Save
        loader.save_to_file(temp_path).unwrap();
        
        // Load
        let loaded = DefinitionLoader::load_from_file(temp_path).unwrap();
        
        assert_eq!(
            loaded.definitions().version,
            loader.definitions().version
        );
        
        // Cleanup
        std::fs::remove_file(temp_path).ok();
    }
}
