use notify::{Config, RecommendedWatcher, RecursiveMode, Watcher};
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::{Arc, RwLock};
use std::time::Duration;
use tauri::{AppHandle, Manager, Emitter};

#[derive(Clone)]
pub struct ScriptManager {
    scripts: Arc<RwLock<HashMap<String, String>>>,
    script_dir: PathBuf,
    app_handle: AppHandle,
}

impl ScriptManager {
    pub fn new(app_handle: AppHandle, script_dir: PathBuf) -> Self {
        let manager = Self {
            scripts: Arc::new(RwLock::new(HashMap::new())),
            script_dir: script_dir.clone(),
            app_handle,
        };

        // Load initial scripts
        manager.load_scripts();

        // Start watcher
        manager.start_watcher(script_dir);

        manager
    }

    fn load_scripts(&self) {
        tracing::info!("[ScriptManager] Loading scripts from {:?}", self.script_dir);
        if let Ok(entries) = std::fs::read_dir(&self.script_dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.extension().and_then(|s| s.to_str()) == Some("js") {
                    if let Some(name) = path.file_stem().and_then(|s| s.to_str()) {
                        if let Ok(content) = std::fs::read_to_string(&path) {
                            tracing::info!("[ScriptManager] Loaded script: {}", name);
                            self.scripts.write().unwrap().insert(name.to_string(), content);
                        }
                    }
                }
            }
        }
    }

    fn start_watcher(&self, path: PathBuf) {
        let manager = self.clone();
        
        std::thread::spawn(move || {
            let (tx, rx) = std::sync::mpsc::channel();
            
            let mut watcher = match RecommendedWatcher::new(tx, Config::default()) {
                Ok(w) => w,
                Err(e) => {
                    tracing::error!("[ScriptManager] Failed to create watcher: {}", e);
                    return;
                }
            };

            if let Err(e) = watcher.watch(&path, RecursiveMode::Recursive) {
                tracing::error!("[ScriptManager] Failed to watch directory: {}", e);
                return;
            }

            tracing::info!("[ScriptManager] Watcher started for {:?}", path);

            for res in rx {
                match res {
                    Ok(event) => {
                        // Debounce or just reload
                        // For simplicity, we reload on any modification
                        if event.kind.is_modify() {
                            tracing::info!("[ScriptManager] Detected change, reloading scripts...");
                            // Give it a moment for the write to complete
                            std::thread::sleep(Duration::from_millis(100));
                            manager.load_scripts();
                            
                            // Notify frontend/system about update
                            let _ = manager.app_handle.emit("teleflow://scripts-updated", ());
                        }
                    }
                    Err(e) => tracing::error!("[ScriptManager] Watch error: {}", e),
                }
            }
        });
    }

    pub fn get_script(&self, name: &str) -> Option<String> {
        self.scripts.read().unwrap().get(name).cloned()
    }
}
