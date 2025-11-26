use tokio::fs;
use tokio::time::{sleep, Duration};
use anyhow::{Result, anyhow};
use std::path::PathBuf;
use tracing::info;

/// 严谨的端口发现机制 (基于轮询)
/// 
/// WebView2 在启动时会在数据目录创建 DevToolsActivePort 文件,
/// 文件第一行包含 CDP 端口号。此函数轮询该文件直到找到端口或超时。
pub async fn discover_cdp_port(data_dir: PathBuf) -> Result<u16> {
    // WebView2 (特别是在 Windows 上) 通常在 EBWebView 子目录下创建端口文件
    let potential_paths = vec![
        data_dir.join("DevToolsActivePort"),
        data_dir.join("EBWebView").join("DevToolsActivePort"),
    ];

    info!("Discovering CDP port from data directory: {:?}", data_dir);

    // 带超时的轮询 (最多等待 15 秒, 每次间隔 500ms)
    for attempt in 0..30 {
        for port_file_path in &potential_paths {
            // 检查文件是否存在
            if fs::try_exists(port_file_path).await.unwrap_or(false) {
                // 如果存在,尝试读取端口号
                match read_port_from_file(port_file_path).await {
                    Ok(port) => {
                        info!("CDP Port discovered: {} at {:?} (attempt {})", port, port_file_path, attempt + 1);
                        return Ok(port);
                    }
                    Err(e) => {
                        tracing::warn!("Failed to parse port from {:?}: {}", port_file_path, e);
                    }
                }
            }
        }
        
        // 等待 500ms 后重试
        if attempt < 29 {
            sleep(Duration::from_millis(500)).await;
        }
    }
    
    Err(anyhow!(
        "Timeout (15s) waiting for DevToolsActivePort file in {:?}. Checked paths: {:?}",
        data_dir,
        potential_paths
    ))
}

/// 从文件中异步读取端口号
/// 
/// DevToolsActivePort 文件格式:
/// ```
/// 12345
/// /devtools/browser/xxxxx
/// ```
/// 第一行是端口号,第二行是 WebSocket 路径
async fn read_port_from_file(path: &PathBuf) -> Result<u16> {
    let content = fs::read_to_string(path).await?;
    
    // 文件内容通常是 "PORT\nws_path\n",我们只需要第一行
    let line = content
        .lines()
        .next()
        .ok_or_else(|| anyhow!("Port file is empty: {:?}", path))?;
    
    let port = line.trim().parse::<u16>()
        .map_err(|e| anyhow!("Failed to parse port '{}' from {:?}: {}", line, path, e))?;
    
    Ok(port)
}

#[cfg(test)]
mod tests {
    use super::*;
    use tokio::fs::create_dir_all;
    use tokio::io::AsyncWriteExt;

    #[tokio::test]
    async fn test_discover_port_success() {
        let temp_dir = std::env::temp_dir().join("teleflow_test_port_discovery");
        create_dir_all(&temp_dir).await.unwrap();
        
        let port_file = temp_dir.join("DevToolsActivePort");
        let mut file = tokio::fs::File::create(&port_file).await.unwrap();
        file.write_all(b"9223\n/devtools/browser/test").await.unwrap();
        drop(file);

        let result = discover_cdp_port(temp_dir.clone()).await;
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), 9223);

        // Cleanup
        tokio::fs::remove_dir_all(&temp_dir).await.ok();
    }
}
