use anyhow::{Context, Result};
use notify::{Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use std::path::PathBuf;
use std::sync::Arc;
use tokio::sync::mpsc;
use tracing::{debug, error, info, warn};

/// 事件驱动的端口监视器
/// 
/// 使用文件系统监视器监听 DevToolsActivePort 文件的创建，
/// 相比轮询延迟从 ~500ms 降低到 ~10ms
pub struct PortWatcher {
    data_dir: PathBuf,
    port_tx: mpsc::UnboundedSender<u16>,
    port_rx: mpsc::UnboundedReceiver<u16>,
}

impl PortWatcher {
    pub fn new(data_dir: PathBuf) -> Self {
        let (port_tx, port_rx) = mpsc::unbounded_channel();
        Self {
            data_dir,
            port_tx,
            port_rx,
        }
    }

    /// 启动文件系统监视器
    /// 
    /// 监听 DevToolsActivePort 文件的创建事件，立即读取端口并发送
    pub async fn watch(mut self) -> Result<u16> {
        let (event_tx, mut event_rx) = mpsc::unbounded_channel();

        // 要监听的路径列表
        let watch_paths = vec![
            self.data_dir.clone(),
            self.data_dir.join("EBWebView"),
        ];

        // 创建文件系统监视器
        let mut watcher = create_watcher(event_tx.clone())?;

        // 添加监视路径
        for path in &watch_paths {
            if path.exists() {
                watcher
                    .watch(path, RecursiveMode::NonRecursive)
                    .with_context(|| format!("Failed to watch path: {:?}", path))?;
                info!("Watching for DevToolsActivePort at: {:?}", path);
            } else {
                debug!("Path does not exist yet, skipping: {:?}", path);
            }
        }

        let data_dir = self.data_dir.clone();
        let port_tx = self.port_tx.clone();

        // 在后台任务中处理文件系统事件
        tokio::spawn(async move {
            while let Some(event) = event_rx.recv().await {
                if let Err(e) = handle_fs_event(event, &data_dir, &port_tx).await {
                    warn!("Error handling file system event: {:?}", e);
                }
            }
        });

        // 在主任务中等待端口号
        // 设置超时：如果 10 秒内没有检测到，回退到轮询
        match tokio::time::timeout(
            std::time::Duration::from_secs(10),
            self.port_rx.recv(),
        )
        .await
        {
            Ok(Some(port)) => {
                info!("Port discovered via file watcher: {}", port);
                Ok(port)
            }
            Ok(None) => Err(anyhow::anyhow!("Port channel closed unexpectedly")),
            Err(_) => {
                // 超时，回退到轮询
                warn!("File watcher timeout, falling back to polling");
                drop(watcher); // 停止监视器
                super::port_discoverer::discover_cdp_port(self.data_dir).await
            }
        }
    }
}

/// 创建文件系统监视器
fn create_watcher(
    event_tx: mpsc::UnboundedSender<notify::Result<Event>>,
) -> Result<RecommendedWatcher> {
    let watcher = RecommendedWatcher::new(
        move |res| {
            if let Err(e) = event_tx.send(res) {
                error!("Failed to send file system event: {:?}", e);
            }
        },
        notify::Config::default(),
    )
    .context("Failed to create file system watcher")?;

    Ok(watcher)
}

/// 处理文件系统事件
async fn handle_fs_event(
    event_res: notify::Result<Event>,
    data_dir: &PathBuf,
    port_tx: &mpsc::UnboundedSender<u16>,
) -> Result<()> {
    let event = event_res?;

    // 只关注文件创建和修改事件
    match event.kind {
        EventKind::Create(_) | EventKind::Modify(_) => {
            debug!("File system event: {:?}", event);

            for path in event.paths {
                // 检查是否是 DevToolsActivePort 文件
                if path.file_name() == Some(std::ffi::OsStr::new("DevToolsActivePort")) {
                    info!("DevToolsActivePort detected at: {:?}", path);

                    // 读取端口号
                    match read_port_from_file(&path).await {
                        Ok(port) => {
                            info!("Port discovered: {}", port);
                            let _ = port_tx.send(port);
                            return Ok(());
                        }
                        Err(e) => {
                            warn!("Failed to read port from {:?}: {:?}", path, e);
                        }
                    }
                }
            }
        }
        _ => {
            // 忽略其他事件类型
        }
    }

    Ok(())
}

/// 从文件中读取端口号
async fn read_port_from_file(path: &PathBuf) -> Result<u16> {
    use tokio::fs;

    let content = fs::read_to_string(path).await?;
    let line = content
        .lines()
        .next()
        .ok_or_else(|| anyhow::anyhow!("Port file is empty"))?;

    let port = line
        .trim()
        .parse::<u16>()
        .with_context(|| format!("Failed to parse port from '{}'", line))?;

    Ok(port)
}

#[cfg(test)]
mod tests {
    use super::*;
    use tokio::fs::{create_dir_all, File};
    use tokio::io::AsyncWriteExt;

    #[tokio::test]
    async fn test_port_watcher() {
        let temp_dir = std::env::temp_dir().join("teleflow_test_watcher");
        create_dir_all(&temp_dir).await.unwrap();

        let watcher = PortWatcher::new(temp_dir.clone());

        // 在后台创建文件
        let temp_dir_clone = temp_dir.clone();
        tokio::spawn(async move {
            tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
            let port_file = temp_dir_clone.join("DevToolsActivePort");
            let mut file = File::create(&port_file).await.unwrap();
            file.write_all(b"9876\n/devtools/browser/test")
                .await
                .unwrap();
        });

        // 等待监视器检测到端口
        let result = watcher.watch().await;
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), 9876);

        // 清理
        tokio::fs::remove_dir_all(&temp_dir).await.ok();
    }
}
